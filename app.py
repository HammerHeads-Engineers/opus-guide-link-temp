from flask import Flask, render_template

app = Flask(__name__)


@app.route('/')
def hello():
    return render_template('index.html')

@app.route('/<link_uid>/')
def capitalize(link_uid):
    return f'<h1>{link_uid}</h1>'
