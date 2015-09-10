import bson.json_util


def run(node=None, graph=None):
    """Computes the centrality of ``node`` (given by key) within the subgraph
    represented by ``graph`` (which is in Clique-Mongo format."""

    graph = bson.json_util.loads(graph)

    # TODO: compute centrality here.

    return 3.14159
