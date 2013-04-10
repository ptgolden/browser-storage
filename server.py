from contextlib import closing
import gzip
import json
import os
import re
import sqlite3
import time
from flask import Flask, Response, g, request, send_file


#########
# Setup #
#########

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


###################
# Database config #
###################

DATABASE = os.path.join(ROOT_DIR, 'database.db')

def connect_db():
    return sqlite3.connect(DATABASE)

@app.before_request
def before_request():
    g.db = connect_db()

@app.teardown_request
def teardown_request(exception):
    if hasattr(g, 'db'):
        g.db.close()

def init_db():
    with closing(connect_db()) as db:
        c = db.cursor()
        c.execute(
            'create table data (' +
            'id integer primary key, ' +
            't timestamp default current_timestamp, ' +
            'browser text, ' +
            'data text)'
        )
        db.commit()

def add_item(request, item_id=None):
    req = json.loads(request.data)
    data = req.get('data')
    browser = req.get('browser', 'undefined')
    datas = json.dumps(data)

    cur = g.db.cursor()
    if item_id is None:
        cur.execute('insert into data (data, browser) values (?, ?)',
                    (datas, browser))
        item_id = cur.lastrowid
    else:
        cur.execute('update data set data=?, browser=? where id=?',
                    (datas, browser, item_id))
    g.db.commit()
    return item_id

def format_row(row):
    item_id, time, browser, data = row
    return {
        'id': item_id,
        'url': 'data/{}'.format(item_id),
        'browser': browser,
        'data': json.loads(data)
    }

def get_row(item_id):
    item = g.db.cursor()\
            .execute('select * from data where id=?', (item_id,))\
            .fetchone()
    return item


###########
# Routing #
###########

@app.route('/')
def root():
    return send_file('index.html', mimetype="text/html")

@app.route('/data', methods=['GET', 'POST'])
def data():
    if request.method == 'POST':
        added_item_id = add_item(request)
        return Response(
            json.dumps(format_row(get_row(added_item_id))),
            content_type='application/json')
    items = [format_row(row) for row
             in g.db.cursor().execute('select * from data').fetchall()]
    return Response(
        json.dumps({'items': items}, indent=2),
        content_type='application/json')

@app.route('/data/<item_id>', methods=['GET', 'PUT', 'DELETE'])
def datum(item_id):
    item = get_row(item_id)
    if item is None:
        return Response(status='404 NOT FOUND')

    if request.method == 'PUT':
        add_item(request, item_id=item_id)
        item = get_row(item_id)
        return Response(
            json.dumps(format_row(item)), content_type="application/json")
    elif request.method == 'DELETE':
        g.db.cursor().execute('delete from data where id=?', (item_id,))
        g.db.commit()
        return Response()
    else:
        return Response(
            json.dumps(format_row(item)), content_type='application/json')

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
