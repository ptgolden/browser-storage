import os
from fabric.api import *

try:
    from fabfile_local import *
except ImportError:
    pass

@task
def setup():
    local('virtualenv venv')
    local('venv/bin/pip install -r requirements.txt')

@task
def runserver():
    local('venv/bin/python server.py')

@task
def deploy():
    require('hosts', 'project_path')
    local('git archive -o repo.zip HEAD')
    put('repo.zip', env.project_path)
    with cd(env.project_path):
        run('test -f app/database.db && cp app/database.db database.db.bak',
            warn_only=True)
        run('rm -rf app')
        run('unzip repo.zip -d app')
        run('test -f database.db.bak && mv database.db.bak app/database.db',
            warn_only=True)
        run('test ! -f app/database.db && cd app && ' + 
            'python2.7 -c "from server import init_db; init_db()"', warn_only=True)
    with cd(os.path.join(env.project_path, 'app', 'static', 'data')):
        run('mkdir -p ../../../data')
        run('ln -s ../../../data/*json* .')
    run('{project_path}/apache2/bin/restart'.format(**env))
    local('rm repo.zip')
    run('rm {project_path}/repo.zip'.format(**env))
