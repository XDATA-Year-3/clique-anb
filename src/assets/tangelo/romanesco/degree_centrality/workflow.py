import json

import romanesco
from romanesco.specs import Workflow


def run(sourceGraph=None, titan=None):
    inputs = {'rexsterInUrl': {'format': 'text',
                               'data': sourceGraph},
              'rexsterOutUrl': {'format': 'text',
                                'data': titan}}

    wf = Workflow()

    rexster_copy = {
        'inputs': [{'name': 'rexsterInUrl',
                    'type': 'string',
                    'format': 'text'},
                   {'name': 'rexsterOutUrl',
                    'type': 'string',
                    'format': 'text'}],
        'mode': 'python',
        'outputs': [{'name': 'nodeMapping',
                     'type': 'string',
                     'format': 'json'},
                    {'name': 'rexsterOutUrl',
                     'type': 'string',
                     'format': 'text'}],
        'script': open('rexster_copy.py').read()
    }

    gremlin_script = {
        'inputs': [{'name': 'gremlinScript',
                    'type': 'string',
                    'format': 'text',
                    'default': {'format': 'text',
                                'data': 'g.E.bothV.id.groupCount.cap'}},
                   {'name': 'rexsterUrl',
                    'type': 'string',
                    'format': 'text'},
                   {'name': 'nodeMapping',
                    'type': 'string',
                    'format': 'json'}],
        'mode': 'python',
        'outputs': [{'name': 'scriptOutput',
                     'type': 'string',
                     'format': 'json'}],
        'script': open('rexster_gremlin.py').read()
    }

    wf.add_task(rexster_copy, 'rexster_copy')
    wf.add_task(gremlin_script, 'gremlin_script')

    wf.connect_tasks('rexster_copy', 'gremlin_script',
                     {'nodeMapping': 'nodeMapping',
                      'rexsterOutUrl': 'rexsterUrl'})

    output = romanesco.run(wf, inputs=inputs)

    return json.loads(output["scriptOutput"]["data"])["results"]
