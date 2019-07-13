import pandas as pd
import json
from src.transform import countries_to_json

df = pd.read_csv('data\\cordis-h2020projects.csv', sep=';')



df = df[df["objective"].str.contains("artificial intelligence")]

# print(df.columns)
# print(df.iloc[3])



countries_counted = df['participantCountries'].value_counts();
# print(countries_counted)

json = json.dumps(countries_to_json(countries_counted), indent=4, sort_keys=True)
print(json)

# pd.options.display.max_colwidth = 400
# with pd.option_context('display.max_rows', None, 'display.max_columns', None):
#     df_ai= df[df['objective'].str.contains('artificial intelligence')][
#               ['title','coordinator','coordinatorCountry','participants','participantCountries']]
#
#
# with open('test.json', 'w') as file:
#     file.write(df_ai.to_json())
