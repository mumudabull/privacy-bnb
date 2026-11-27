"""Quote-only HTTP API for the DarkSwap agent.

Vercel loads the module-level ``app`` ASGI object. See ``pyproject.toml``.
Routes call ``handle_intent(..., execute=False)``, so the spend cap and the
CoinMarketCap and Atlas guard stay in ``service.py``. Broadcast stays on the CLI.
"""

from collections.abc import Awaitable, Callable

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from darkswap_agent.http_guard import (
    MAXIMUM_HTTP_BODY_BYTES,
    client_address,
    consume_rate_limit,
    read_bounded,
)
from darkswap_agent.service import handle_intent

app = FastAPI(title="DarkSwap agent", version="0.1.0")


class QuoteRequest(BaseModel):
    """A swap sentence. Fields other than intent are ignored."""

    intent: str


def _limited(status_code: int, detail: str, retry_after: int | None = None) -> JSONResponse:
    headers = {"Cache-Control": "no-store"}
    if retry_after is not None:
        headers["Retry-After"] = str(retry_after)
    return JSONResponse(status_code=status_code, content={"detail": detail}, headers=headers)


@app.middleware("http")
async def _guard(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    if request.url.path == "/quote" and request.method in {"GET", "POST"}:
        if request.method == "POST":
            body = await read_bounded(request, MAXIMUM_HTTP_BODY_BYTES)
            if body is None:
                return _limited(413, "Request body is too large")
        else:
            query = request.scope.get("query_string", b"")
            if isinstance(query, str):
                query = query.encode()
            if len(query) > MAXIMUM_HTTP_BODY_BYTES:
                return _limited(413, "Request body is too large")
        decision = consume_rate_limit(client_address(request.headers))
        if not decision.allowed:
            return _limited(
                429,
                f"Too many requests from this address. Retry after {decision.retry_after_seconds} seconds.",
                decision.retry_after_seconds,
            )
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response


def quote_intent(intent: str) -> dict[str, object]:
    if len(intent.encode("utf-8")) > MAXIMUM_HTTP_BODY_BYTES:
        raise HTTPException(status_code=413, detail="Request body is too large")
    return handle_intent(intent, execute=False)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "darkswap-agent",
        "mode": "quote-only",
        "health": "/health",
        "quote": "/quote",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "quote-only"}


@app.post("/quote")
def quote(body: QuoteRequest) -> dict[str, object]:
    return quote_intent(body.intent)


@app.get("/quote")
def quote_by_query(intent: str) -> dict[str, object]:
    return quote_intent(intent)
