import json
import socket
import time
from html import unescape
from html.parser import HTMLParser
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from flask import Flask, render_template, request, url_for
from flask_talisman import Talisman

app = Flask(__name__)
Talisman(app, content_security_policy=None, frame_options=None)  # keep https redirect, allow embedding

OPUS_GUIDE_API_BASE = "https://app.opus.guide/_/api"
OPUS_GUIDE_LINK_ORIGIN = "https://link.opus.guide"
DEFAULT_META_TITLE = "Opus.Guide"
DEFAULT_META_DESCRIPTION = "View this guide on Opus.Guide"
DEFAULT_META_IMAGE = "og_default.png"
META_CACHE_TTL_SECONDS = 300
_api_payload_cache = {}


class TextExtractor(HTMLParser):
	def __init__(self):
		super().__init__()
		self.parts = []

	def handle_data(self, data):
		if data:
			self.parts.append(data)

	def get_text(self):
		return " ".join(" ".join(self.parts).split())


def normalize_text(value):
	if value is None:
		return ""
	return " ".join(str(value).split())


def html_to_text(value):
	if not value:
		return ""
	extractor = TextExtractor()
	extractor.feed(str(value))
	return normalize_text(unescape(extractor.get_text()))


def truncate_text(value, max_length=180):
	value = normalize_text(value)
	if len(value) <= max_length:
		return value
	return value[:max_length - 3].rstrip() + "..."


def public_url_root():
	root_url = request.url_root
	if request.headers.get("X-Forwarded-Proto") == "https":
		root_url = root_url.replace("http://", "https://", 1)
	return root_url


def current_public_url():
	current_url = request.url
	if request.headers.get("X-Forwarded-Proto") == "https":
		current_url = current_url.replace("http://", "https://", 1)
	return current_url


def ensure_absolute_url(value):
	if not value:
		return ""

	value = str(value)
	parsed_url = urllib_parse.urlparse(value)
	if parsed_url.scheme in ("http", "https") and parsed_url.netloc:
		return value
	if value.startswith("/"):
		return urllib_parse.urljoin(public_url_root(), value.lstrip("/"))
	return ""


def default_meta():
	return {
		"title": DEFAULT_META_TITLE,
		"description": DEFAULT_META_DESCRIPTION,
		"image": urllib_parse.urljoin(public_url_root(), url_for("static", filename=DEFAULT_META_IMAGE).lstrip("/")),
		"url": current_public_url(),
		"type": "article",
		"site_name": "Opus.Guide",
	}


def fetch_api_payload(path):
	cache_entry = _api_payload_cache.get(path)
	if cache_entry and cache_entry["expires_at"] > time.time():
		return cache_entry["data"]

	api_request = urllib_request.Request(
		OPUS_GUIDE_API_BASE + path,
		headers={
			"Accept": "application/json",
			"Origin": OPUS_GUIDE_LINK_ORIGIN,
			"User-Agent": "opus-guide-link/og-meta",
		},
		method="GET",
	)

	try:
		with urllib_request.urlopen(api_request, timeout=1.5) as response:
			if response.status != 200:
				return None
			payload = response.read(1024 * 1024).decode("utf-8")
	except (urllib_error.URLError, socket.timeout, TimeoutError, ValueError):
		return None

	try:
		data = json.loads(payload)
	except json.JSONDecodeError:
		return None

	if isinstance(data, dict):
		_api_payload_cache[path] = {
			"data": data,
			"expires_at": time.time() + META_CACHE_TTL_SECONDS,
		}
		return data
	return None


def first_step_description(instruction):
	for step in instruction.get("steps") or []:
		step_text = html_to_text(step.get("text"))
		if step_text:
			return truncate_text(step_text)
	return DEFAULT_META_DESCRIPTION


def first_step_image_url(instruction, url_dict):
	for step in instruction.get("steps") or []:
		for image_uid in step.get("images") or []:
			image_data = url_dict.get(image_uid) or url_dict.get(str(image_uid)) or {}
			image_url = ensure_absolute_url(image_data.get("url"))
			if image_url:
				return image_url
	return ""


def instruction_meta_from_payload(data):
	meta = default_meta()
	if not data:
		return meta

	instruction = data.get("instruction") or {}
	url_dict = data.get("url_dict") or {}
	title = normalize_text(instruction.get("name"))
	description = html_to_text(instruction.get("description")) or first_step_description(instruction)
	image_url = first_step_image_url(instruction, url_dict)

	if not image_url:
		image_url = ensure_absolute_url(instruction.get("organization_logo_url"))

	meta.update({
		"title": title or meta["title"],
		"description": truncate_text(description or meta["description"]),
		"image": image_url or meta["image"],
	})
	return meta


def api_path(*parts):
	return "/" + "/".join(urllib_parse.quote(str(part), safe="") for part in parts)


def get_instruction_meta(*parts):
	return instruction_meta_from_payload(fetch_api_payload(api_path(*parts)))




@app.errorhandler(404)
def page_not_found(e):
    return render_template('instruction.html', meta=default_meta()), 404


#links

@app.route('/checklist/<token>/')
def checklist(token):
    return render_template('instruction.html', checklist_token=token, meta=default_meta())

@app.route('/<link_uid>/')
def show_instruction(link_uid):
    return render_template(
		'instruction.html',
		link_uid=link_uid,
		meta=get_instruction_meta("get_instruction", link_uid),
	)

@app.route('/preview/<link_uid>/')
def preview_instruction(link_uid):
	return render_template(
		'instruction.html',
		link_uid=link_uid,
		meta=get_instruction_meta("get_instruction", link_uid),
	)

#group links
@app.route("/r/<link_uid>/")
def role(link_uid):
	return render_template("role.html", link_uid=link_uid)

@app.route("/r/<role_link>/<instruction_uid>/")
def role_instruction(role_link, instruction_uid):
	return render_template(
		"instruction.html",
		role_link=role_link,
		instruction_uid=instruction_uid,
		meta=get_instruction_meta("get_instruction_by_role", role_link, instruction_uid),
	)


@app.route("/p/<link_uid>/")
def process(link_uid):
	return render_template("process.html", link_uid=link_uid)

@app.route("/p/<process_link>/<instruction_uid>/")
def process_instruction(process_link, instruction_uid):
	return render_template(
		"instruction.html",
		instruction_uid=instruction_uid,
		process_link=process_link,
		meta=get_instruction_meta("get_instruction_by_process", process_link, instruction_uid),
	)
