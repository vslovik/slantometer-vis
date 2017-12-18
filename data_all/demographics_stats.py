control = []
infile = 'data_stats/demographics.txt'
import json
with open(infile) as f:
	control = f.read().splitlines()


demographics = dict()

for c in control: 
	features = c.split(',')[1:] 
	for f in features:
		if(f in demographics.keys()):
			count = demographics[f]
			demographics[f] = count + 1
		else: 
			demographics[f] = 1 

print(json.dumps(demographics, indent=4,sort_keys=True))