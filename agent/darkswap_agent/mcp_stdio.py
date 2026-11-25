"""A small MCP stdio server with one tool: quote_swap.

Speaks Content-Length framing, initialize, tools/list, and tools/call.
The tool quotes. It does not broadcast.
"""

import json
import sys

from darkswap_agent.service import handle_intent

PROTOCOL = "2024-11-05"


def _read_message() -> dict[str, object] | None:
    headers: dict[str, str] = {}
    while True:
        line = sys.stdin.buffer.readline()
        if line == b"":
            return None
        if line in (b"\r\n", b"\n"):
            break
        decoded = line.decode("utf-8")
        key, _, value = decoded.partition(":")
        headers[key.strip().lower()] = value.strip()
    length = int(headers.get("content-length", "0"))
    if length <= 0:
        return None
    payload = json.loads(sys.stdin.buffer.read(length))
    if not isinstance(payload, dict):
        raise ValueError("MCP message was not an object")
    return payload


def _write_message(payload: dict[str, object]) -> None:
    raw = json.dumps(payload).encode("utf-8")
    sys.stdout.buffer.write(f"Content-Length: {len(raw)}\r\n\r\n".encode("utf-8"))
    sys.stdout.buffer.write(raw)
    sys.stdout.buffer.flush()


def _tools() -> list[dict[str, object]]:
    return [
        {
            "name": "quote_swap",
            "description": (
                "Quote a DarkSwap rehearsal from a sentence such as "
                "'swap 0.04 bnb to rNOTE privately'. Public math only. "
                "Refuses execution above 0.05 BNB. Does not claim privacy."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {"intent": {"type": "string"}},
                "required": ["intent"],
                "additionalProperties": False,
            },
        }
    ]


def _handle(message: dict[str, object]) -> dict[str, object] | None:
    method = message.get("method")
    has_id = "id" in message
    request_id = message.get("id")
    if method == "initialize" and has_id:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": PROTOCOL,
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "darkswap-bnb", "version": "0.1.0"},
            },
        }
    if method == "notifications/initialized":
        return None
    if method == "tools/list" and has_id:
        return {"jsonrpc": "2.0", "id": request_id, "result": {"tools": _tools()}}
    if method == "tools/call" and has_id:
        params = message.get("params")
        name = params.get("name") if isinstance(params, dict) else None
        arguments = params.get("arguments") if isinstance(params, dict) else None
        intent = arguments.get("intent") if isinstance(arguments, dict) else None
        if name != "quote_swap" or not isinstance(intent, str):
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {"code": -32602, "message": "quote_swap requires an intent string"},
            }
        quoted = handle_intent(intent, execute=False)
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {"content": [{"type": "text", "text": json.dumps(quoted)}], "isError": False},
        }
    if has_id:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": -32601, "message": f"method not found: {method}"},
        }
    return None


def serve() -> int:
    while True:
        message = _read_message()
        if message is None:
            return 0
        response = _handle(message)
        if response is not None:
            _write_message(response)
