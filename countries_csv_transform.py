import pandas as pd

df = pd.read_csv('data\\countries.csv', sep=';')

print(df.to_json())