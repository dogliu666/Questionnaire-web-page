import pandas as pd
from colorama import Fore, Style

try:
    df = pd.read_excel("experiment_results.xlsx")
    print("Excel 文件中的列名:", df.columns)
    
    # 统计每个 userid 的出现次数
    # !!! 请将下面的 'userId' 替换为上面打印出的实际列名 !!!
    counts = df['userId'].value_counts()

    # 找出恰好出现 4 次的 userid
    # !!!改这里的数字!!!
    valid_userids = counts[counts == 16].index

    # 只保留这些 userid 的数据
    filtered_df = df[df['userId'].isin(valid_userids)]

    # 保存新文件
    # !!!要保存成什么文件名自己改!!!
    filtered_df.to_excel("Ratings.xlsx", index=False)
    
    print(Fore.GREEN + "文件处理成功，已保存为 Ratings.xlsx" + Style.RESET_ALL)
except Exception as e:
    print(Fore.RED + f"文件处理失败: {e}" + Style.RESET_ALL)