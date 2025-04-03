from flask import Flask, request, jsonify, send_from_directory
import json
import os
import threading
import time
import pandas as pd
from datetime import datetime
from excel import process_all_files

app = Flask(__name__, static_folder='.')

# 确保result目录存在
if not os.path.exists('result'):
    os.makedirs('result')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/result', methods=['POST'])
def save_result():
    try:
        data = request.json
        
        # 生成文件名
        timestamp = datetime.now().isoformat().replace(":", "-")
        filename = f"ai_art_experiment_{timestamp}.json"
        filepath = os.path.join('result', filename)
        
        # 保存为JSON文件
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        # 触发Excel处理
        threading.Thread(target=process_excel).start()
        
        return jsonify({"success": True, "message": "数据已保存", "filename": filename})
    except Exception as e:
        print(f"保存数据时出错: {str(e)}")
        return jsonify({"success": False, "message": f"保存数据时出错: {str(e)}"}), 500

@app.route('/save-feedback', methods=['POST'])
def save_feedback():
    try:
        # 获取POST请求中的JSON数据
        data = request.json
        
        # 确保数据目录存在
        feedback_dir = os.path.join('data', 'feedback')
        if not os.path.exists(feedback_dir):
            os.makedirs(feedback_dir)
        
        # 生成文件名（使用用户ID和时间戳）
        user_id = data.get('userId', 'unknown')
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        filename = f"feedback_{user_id}_{timestamp}.json"
        
        # 保存JSON文件
        with open(os.path.join(feedback_dir, filename), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        # 更新或创建Excel文件
        update_feedback_excel(data)
        
        return jsonify({"success": True, "message": "反馈数据已保存"})
    
    except Exception as e:
        print(f"保存反馈数据时出错: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

def update_feedback_excel(data):
    """将反馈数据添加到Excel文件中"""
    excel_path = os.path.join('result', 'feedback_data.xlsx')
    
    # 创建数据框
    feedback = data.get('feedback', {})
    user_data = {
        'userId': data.get('userId'),
        'experience': feedback.get('experience'),
        'difficulty': feedback.get('difficulty'),
        'comments': feedback.get('comments'),
        'submittedAt': feedback.get('submittedAt')
    }
    
    df_new = pd.DataFrame([user_data])
    
    # 如果Excel文件已存在，则追加数据
    if os.path.exists(excel_path):
        try:
            df_existing = pd.read_excel(excel_path)
            df_combined = pd.concat([df_existing, df_new], ignore_index=True)
        except Exception as e:
            print(f"读取现有Excel文件时出错: {str(e)}")
            df_combined = df_new
    else:
        df_combined = df_new
    
    # 保存到Excel
    df_combined.to_excel(excel_path, index=False)

def process_excel():
    """延迟一小段时间后处理Excel，确保JSON文件已完全写入"""
    time.sleep(1)  # 等待1秒确保文件写入完成
    try:
        process_all_files()
    except Exception as e:
        print(f"处理Excel时出错: {str(e)}")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)