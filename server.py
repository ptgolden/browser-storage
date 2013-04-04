import gzip
import json
import re
from flask import Flask, Response, request, send_file

app = Flask(__name__)
app.config['DEBUG'] = True

@app.route('/')
def root():
    return send_file('index.html', mimetype="text/html")

@app.route('/streamdata')
def stream_data():

    LIMIT = int(request.args.get('limit', '50000'))
    CHUNK_SIZE = int(request.args.get('chunksize', '5000'))

    def generate(items=[]):
        with gzip.open('static/data/viaf_items_1M.json.gz', 'r') as datafile:
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

