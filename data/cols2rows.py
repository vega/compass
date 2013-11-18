import json

data_file = open("cols/movies.json")
data = json.load(data_file)
data_file.close()

D = len(data)
N = len(data[0]["values"])


print data[0].keys()
# print D, N

out = []

for i in range(0,N):
    row = {}
    for j in range(0,D):
        row[data[j]['name']] = data[j]['values'][i]
    out.append(row)

out_meta = []
for i in range(0,D):
    out_meta.append({'name': data[i]['name'], 'type': data[i]['type']})

with open('rows/movies.json', 'w') as outfile:
  json.dump(out, outfile)

with open('rows/movies_meta.json', 'w') as outfile:
  json.dump(out_meta, outfile)