## Convert Column-based JSON file to CSV

import json
import csv
import codecs,cStringIO



fin = "cols/movies.json"
fout = 'csvs/movies.csv'

data_file = open(fin)
data = json.load(data_file)
data_file.close()

D = len(data)
N = len(data[0]["values"])


print data[0].keys()
# print D, N

out = []


class UnicodeWriter:
    def __init__(self, f, dialect=csv.excel, encoding="utf-8-sig", **kwds):
        self.queue = cStringIO.StringIO()
        self.writer = csv.writer(self.queue, dialect=dialect, **kwds)
        self.stream = f
        self.encoder = codecs.getincrementalencoder(encoding)()
    def writerow(self, row):
        self.writer.writerow([s.encode("utf-8") for s in row])
        data = self.queue.getvalue()
        data = data.decode("utf-8")
        data = self.encoder.encode(data)
        self.stream.write(str(data))
        self.queue.truncate(0)

    def writerows(self, rows):
        for row in rows:
            self.writerow(row)


with open(fout, 'wb') as csvfile:
    writer =  UnicodeWriter(csvfile,quoting=csv.QUOTE_ALL, delimiter="\t")
    # writer.writerow([data[j]['name'] for j in range(0,D)])
    csvfile.write("\t".join([data[j]['name'] for j in range(0,D)])+"\r\n")

    for i in range(0,N):

        row = []
        for j in range(0,D):
            val = data[j]['values'][i]
            if isinstance(val, unicode):
                row.append(str(val.encode('ascii',errors="ignore")))
            else:
                row.append(repr(val))
        csvfile.write("\t".join(row)+"\r\n")
        # writer.writerow(row)
