"""Quote-only HTTP entrypoint for the agent-bnb Vercel project."""

import os

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from darkswap_agent.interpreter import MAXIMUM_INTENT_LENGTH
from darkswap_agent.service import handle_intent

# The deployed source tree is read-only. These logs are ephemeral, not durable.
if os.environ.get("VERCEL"):
    os.environ.setdefault("CMC_LOG_PATH", "/tmp/cmc-requests.jsonl")
    os.environ.setdefault("ATLAS_LOG_PATH", "/tmp/atlas-requests.jsonl")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024


@app.after_request
def no_cache(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@app.errorhandler(HTTPException)
def http_error(error):
    response = error.get_response()
    response.data = app.json.dumps({"error": error.description})
    response.content_type = "application/json"
    return response


@app.get("/")
@app.get("/health")
def health():
    return jsonify(status="ok", service="darkswap-agent", quote_endpoint="/quote")


@app.post("/quote")
def quote():
    payload = request.get_json()
    if not isinstance(payload, dict) or set(payload) != {"intent"}:
        return jsonify(error="Send a JSON object containing only an intent string."), 400
    intent = payload["intent"]
    if not isinstance(intent, str) or not intent.strip() or len(intent) > MAXIMUM_INTENT_LENGTH:
        return jsonify(error=f"intent must be a non-empty string of at most {MAXIMUM_INTENT_LENGTH} characters."), 400
    # HTTP clients can quote, never broadcast or register an identity.
    return jsonify(handle_intent(intent, execute=False))
