import gzip
import json
import os
import re
import time
from flask import Flask, Response, request, send_file

app = Flask(__name__)
app.config['DEBUG'] = True

class WebFactionMiddleware(object):
    def __init__(self, app):
        self.app = app
    def __call__(self, environ, start_response):
        environ['SCRIPT_NAME'] = '/browser-storage'
        return self.app(environ, start_response)
app.wsgi_app = WebFactionMiddleware(app.wsgi_app)


ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(ROOT_DIR, 'uploads')
if not os.path.exists(UPLOADS_DIR):
    os.mkdir(UPLOADS_DIR)

@app.route('/')
def root():
    return send_file('index.html', mimetype="text/html")

def add_item(request, filename=None):
    req = json.loads(request.data)
    data = req.get('data')

    if filename is None:
        now = time.time()
        browser = req.get('browser', 'undefined')
        browser = re.sub('[^\w]', '_', browser)
        filename = '{}-{}.json'.format(browser, now)

    with open(os.path.join(UPLOADS_DIR, filename), 'w') as outfile:
        outfile.write(json.dumps(data))

    return filename


@app.route('/data', methods=['GET', 'POST'])
def data():
    if request.method == 'POST':
        added_file = add_item(request)
        return Response(json.dumps({
            'item_id': added_file,
            'item_url': 'data/{}'.format(added_file)
        }), content_type='application/json')

    items = [{'item_id': f, 'item_url': 'data/{}'.format(f)}
             for f in os.listdir(UPLOADS_DIR) if f.endswith('.json')]
    return Response(
        json.dumps({'items': items}), content_type='application/json')

@app.route('/data/<filename>', methods=['GET', 'PUT', 'DELETE'])
def datum(filename):
    item_path = os.path.join(UPLOADS_DIR, filename)
    if not os.path.exists(item_path):
        return Response(status='404 NOT FOUND')
    if not os.path.abspath(item_path).startswith(UPLOADS_DIR):
        return Response(status='400 BAD REQUEST')
    if request.method == 'PUT':
        changed_file = add_item(request, filename=filename)
        return Response(json.dumps({
            'item_id': changed_file,
            'item_url': 'data/{}'.format(changed_file)
        }), content_type='application/json')
    if request.method == 'DELETE':
        os.remove(item_path)
        return Response()
    with open(item_path) as item:
        data = item.read()
        return Response(data, content_type='application/json')


@app.route('/streamdata')
def stream_data():

    LIMIT = int(request.args.get('limit', '50000'))
    CHUNK_SIZE = int(request.args.get('chunksize', '5000'))
    SRC = request.args.get('src', 'viaf')

    def generate(items=[]):
        data_file = os.path.join(
            ROOT_DIR, 'static', 'data', '{}_items_1M.json.gz'.format(SRC))
        with gzip.open(data_file, 'r') as datafile:
            datafile.next() # skip initial {"items": [
            for i, record in enumerate(datafile):
                if i == LIMIT or len(items) == CHUNK_SIZE:
                    out = {
                        'final': True if i == LIMIT else False,
                        'items': items
                    }
                    items = []
                    yield 'data: {}\n\n'.format(json.dumps(out))
                if i == LIMIT:
                    return
                else:
                    items.append(json.loads(re.sub(',\s*$', '', record)))

    return Response(generate(), content_type='text/event-stream')

if __name__ == '__main__':
    app.run(port=8080)
