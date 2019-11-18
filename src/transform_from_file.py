import json

with open(r'C:\users\itimo\Desktop\got.json', 'r') as f:
    data = json.load(f)

newdata = dict()

newchars = []

for character in data['characters']:
    if 'houseName' in character:
        newchar = dict()
        newchar["name"] = character['characterName']
        newchar["family"] = character['houseName']
        newchars.append(newchar)

newdata["characters"] = newchars

print(newdata)