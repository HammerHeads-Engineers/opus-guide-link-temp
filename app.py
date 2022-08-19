from flask import Flask, render_template

app = Flask(__name__)


#@app.route('/')
#def hello():
#    return render_template('index.html')

@app.errorhandler(404)
def page_not_found(e):
    return render_template('instruction.html'), 404

@app.route('/<link_uid>/')
def show_instruction(link_uid):
    return render_template('instruction.html', link_uid=link_uid)

@app.route('/preview/<link_uid>/')
def preview_instruction(link_uid):
	return render_template('instruction.html', link_uid=link_uid)

@app.route("/r/<link_uid>/")
def role(link_uid):
	return render_template("role.html", link_uid=link_uid)

@app.route("/r/<rolelink>/<instruction_link>")
def role(role_link, instruction_uid):
	return render_template("instruction.html", role_link=role_link, instruction_uid=instruction_uid)
