import json
import requests

nodeMapping = {str(k): str(v) for k, v in json.loads(nodeMapping).items()}
analysisToCliqueNodeIds = {v:k for k, v in nodeMapping.items()}

r = requests.get(rexsterUrl + '/tp/gremlin?script=' + gremlinScript)
assert r.ok
scriptOutput = r.json()

results = {}

for (k, v) in scriptOutput['results'][0].iteritems():
    results[analysisToCliqueNodeIds[str(k)]] = v

scriptOutput['results'][0] = results

scriptOutput = json.dumps(scriptOutput)

with open('analysis_%d.json' % len(scriptOutput), 'wb') as outfile:
    outfile.write(scriptOutput)
