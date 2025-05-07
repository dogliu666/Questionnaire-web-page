import pandas as pd
from colorama import Fore, Style

try:
    df = pd.read_excel("attention_raw.xlsx")
    print("Excel 文件中的列名:", df.columns)
    
    # 统计每个 isCorrect 的出现次数
    counts = df['isCorrect'].value_counts()
    print("isCorrect 的统计结果:", counts)

    # 找出 isCorrect 结果为"TRUE"大于等于2次的 userID
    valid_userids = df[df['isCorrect'] == True]['userId'].value_counts()
    valid_userids = valid_userids[valid_userids >= 2].index.tolist()

    # 只保留这些 userID 的数据
    filtered_df = df[df['userId'].isin(valid_userids)]

    # 保存新文件
    # !!!要保存成什么文件名自己改!!!
    filtered_df.to_excel("attention.xlsx", index=False)
    
    print(Fore.GREEN + "文件处理成功，已保存为 attention.xlsx" + Style.RESET_ALL)
except Exception as e:
    print(Fore.RED + f"文件处理失败: {e}" + Style.RESET_ALL)