from bulbs.titan import Graph
from bulbs.rexster import Config
import json
import requests


class RexsterRequest(object):
    def __init__(self, rexster_url):
        self.rexster_url = rexster_url

    def V(self):
        r = requests.get(self.rexster_url + '/vertices')
        assert r.ok and 'results' in r.json()
        return r.json()['results']

    def E(self):
        r = requests.get(self.rexster_url + '/edges')
        assert r.ok and 'results' in r.json()
        return r.json()['results']


class RexsterPagedRequest(RexsterRequest):
    def __init__(self, rexster_url, page_size=20000):
        self.rexster_url = rexster_url
        self.page_size = page_size

    def request(self, url, params={}):
        params['rexster.offset.start'] = 0
        params['rexster.offset.end'] = self.page_size

        r = requests.get(url, params=params)

        while True:
            if not r.ok:
                raise Exception('Rexster request failed at offset %d' % params['rexster.offset.start'])
            elif r.json()['totalSize'] == 0:
                break
            else:
                if params['rexster.offset.start'] % 100000 == 0:
                    print url, params['rexster.offset.start']

                for result in r.json()['results']:
                    yield result

                params['rexster.offset.start'] += self.page_size
                params['rexster.offset.end'] += self.page_size
                r = requests.get(url, params=params)

    def V(self):
        return self.request(self.rexster_url + '/vertices')

    def E(self):
        return self.request(self.rexster_url + '/edges')



inRexster = RexsterRequest(rexsterInUrl)
outRexster = RexsterRequest(rexsterOutUrl)

outRexsterGraph = Graph(Config(rexsterOutUrl))

# map from actual node ids - to what they are in the
# "analysis" db so we can map back
nodeMapping = {}

requests.get(rexsterOutUrl + '/tp/gremlin?script=' + "g.V.remove()")

for node in inRexster.V():
    node = {k: v for k, v in node.iteritems() if k == '_id'}
    result = outRexsterGraph.vertices.create(node)
    nodeMapping[str(node['_id'])] = str(result.eid)

for edge in inRexster.E():
    edge = {k: v for k, v in edge.iteritems() if k in ('_outV', '_inV', '_label', '_id')}
    outRexsterGraph.edges.create(nodeMapping[edge['_outV']],
                                 edge['_label'] if '_label' in edge else 'knows',
                                 nodeMapping[edge['_inV']],
                                 edge)

nodeMapping = json.dumps(nodeMapping)
