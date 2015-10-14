import tangelo

import json
import networkx as nx
import romanesco

betweenness_centrality = {
    'inputs': [
        {'name': 'G',
         'type': 'graph',
         'format': 'networkx'},
        {'name': 'node',
         'type': 'string',
         'format': 'text'}
    ],
    'outputs': [
        {'name': 'measure',
         'type': 'number',
         'format': 'number'}
    ],
    'script':
'''
from networkx import betweenness_centrality
measure = betweenness_centrality(G)[node]
'''
}

def run(node=None, graph=None):
    """Computes the centrality of ``node`` (given by key) within the subgraph
    represented by ``graph`` (which is in Clique-Mongo format."""

    tangelo.log_debug(type(node))
    tangelo.log_debug(type(graph))

    output = romanesco.run(betweenness_centrality, inputs={'G': {'format': 'clique.json',
                                                                 'data': graph},
                                                           'node': {'format': 'text',
                                                                    'data': node}})
    return output["measure"]["data"]
