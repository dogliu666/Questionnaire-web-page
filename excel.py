import os
import json
import pandas as pd
import glob
from datetime import datetime

# 输出Excel文件路径
EXCEL_OUTPUT = 'data/experiment_results.xlsx'

def flatten_json(json_data):
    """将嵌套的JSON数据扁平化为一行DataFrame"""
    flattened = {}
    # 从文件名提取时间戳
    if isinstance(json_data, dict) and 'timestamp' in json_data:
        flattened['timestamp'] = json_data['timestamp']
    # 处理个人信息
    if isinstance(json_data, dict) and 'personalInfo' in json_data:
        for key, value in json_data['personalInfo'].items():
            flattened[f'personalInfo_{key}'] = value
    # 处理实验结果
    if isinstance(json_data, dict) and 'experimentData' in json_data:
        # 处理评分数据
        if 'ratings' in json_data['experimentData']:
            for i, rating in enumerate(json_data['experimentData']['ratings']):
                for key, value in rating.items():
                    flattened[f'rating{i+1}_{key}'] = value
        
        # 处理注意力检查结果
        if 'attentionResults' in json_data['experimentData']:
            attention_results = json_data['experimentData']['attentionResults']
            flattened['attention_total'] = len(attention_results)
            flattened['attention_correct'] = sum(1 for r in attention_results if r.get('isCorrect', False))
            flattened['attention_accuracy'] = flattened['attention_correct'] / flattened['attention_total'] if flattened['attention_total'] > 0 else 0
            
            # 保存每个注意力检查的详细信息
            for i, check in enumerate(attention_results):
                flattened[f'attention{i+1}_imageId'] = check.get('imageId', '')
                flattened[f'attention{i+1}_userAnswer'] = check.get('userAnswer', '')
                flattened[f'attention{i+1}_correctAnswer'] = check.get('correctAnswer', '')
                flattened[f'attention{i+1}_isCorrect'] = check.get('isCorrect', False)
    
    # 处理反馈信息
    if isinstance(json_data, dict) and 'feedback' in json_data:
        for key, value in json_data['feedback'].items():
            flattened[f'feedback_{key}'] = value
    
    # 转换为DataFrame
    return pd.DataFrame([flattened])

def process_json_file(filepath):
    """处理单个JSON文件，返回处理后的数据帧"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 提取用户基本信息
        user_info = {}
        if 'basicInfo' in data:
            for key, value in data['basicInfo'].items():
                user_info[f'user_{key}'] = value
        
        # 提取实验组信息
        if 'experimentGroup' in data:
            user_info['group_type'] = data['experimentGroup'].get('groupType', '')
   
        # 处理评分数据
        ratings_df = pd.DataFrame()
        if 'experimentData' in data and 'ratings' in data['experimentData']:
            ratings = data['experimentData']['ratings']
            if ratings:
                # 为每个评分记录添加用户信息
                for rating in ratings:
                    for key, value in user_info.items():
                        rating[key] = value
                
                ratings_df = pd.DataFrame(ratings)
        
        # 处理注意力检测数据
        attention_df = pd.DataFrame()
        if 'experimentData' in data and 'attentionResults' in data['experimentData']:
            attention_results = data['experimentData']['attentionResults']
            if attention_results:
                # 为每个注意力检测记录添加用户信息
                for result in attention_results:
                    for key, value in user_info.items():
                        result[key] = value
                
                attention_df = pd.DataFrame(attention_results)
        
        return {
            'ratings': ratings_df,
            'attention': attention_df,
            'user_info': pd.DataFrame([user_info]) if user_info else pd.DataFrame()
        }
    
    except Exception as e:
        print(f"处理文件 {filepath} 时出错: {str(e)}")
        return {
            'ratings': pd.DataFrame(),
            'attention': pd.DataFrame(),
            'user_info': pd.DataFrame()
        }

def process_all_files():
    """处理result目录下的所有JSON文件"""
    # 确保数据目录存在
    os.makedirs('data', exist_ok=True)
    
    # 获取所有JSON文件
    json_files = glob.glob('result/*.json')
    
    if not json_files:
        print("没有找到JSON文件进行处理")
        return
    
    # 用于存储所有数据的DataFrames
    all_ratings = []
    all_attention = []
    all_user_info = []
    
    # 处理每个文件
    for filepath in json_files:
        print(f"处理文件: {filepath}")
        result = process_json_file(filepath)
        
        if not result['ratings'].empty:
            all_ratings.append(result['ratings'])
        if not result['attention'].empty:
            all_attention.append(result['attention'])
        if not result['user_info'].empty:
            all_user_info.append(result['user_info'])
    
    # 合并所有数据
    combined_data = {}
    
    if all_ratings:
        combined_data['Ratings'] = pd.concat(all_ratings, ignore_index=True)
    else:
        combined_data['Ratings'] = pd.DataFrame()
        
    if all_attention:
        combined_data['Attention'] = pd.concat(all_attention, ignore_index=True)
    else:
        combined_data['Attention'] = pd.DataFrame()
        
    if all_user_info:
        combined_data['Users'] = pd.concat(all_user_info, ignore_index=True)
    else:
        combined_data['Users'] = pd.DataFrame()
    
    # 导出到Excel文件，每种数据类型一个工作表
    with pd.ExcelWriter(EXCEL_OUTPUT) as writer:
        for sheet_name, df in combined_data.items():
            if not df.empty:
                df.to_excel(writer, sheet_name=sheet_name, index=False)
    
    print(f"Excel文件已保存至: {EXCEL_OUTPUT}")
    
    # 创建备份文件（带时间戳）
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f'data/experiment_results_{timestamp}.xlsx'
    with pd.ExcelWriter(backup_path) as writer:
        for sheet_name, df in combined_data.items():
            if not df.empty:
                df.to_excel(writer, sheet_name=sheet_name, index=False)
    
    print(f"Excel备份文件已保存至: {backup_path}")

if __name__ == "__main__":
    process_all_files()