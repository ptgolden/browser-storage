from fabric.api import *

@task
def setup():
    local('virtualenv venv')
    local('venv/bin/pip install -r requirements.txt')

@task
def runserver():
    local('venv/bin/python server.py')
