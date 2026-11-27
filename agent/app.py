"""Quote-only HTTP API for the DarkSwap agent.

Vercel loads the module-level ``app`` ASGI object. See ``pyproject.toml``.
Routes call ``handle_intent(..., execute=False)``, so the spend cap and the
CoinMarketCap and Atlas guard stay in ``service.py``. Broadcast stays on the CLI.
"""

from collections.abc import Awaitable, Callable

from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel

from darkswap_agent.service import handle_intent

# Same body ceiling as the Next.js /api/mcp route. The interpreter still
# rejects a sentence over 280 characters before it will call a model.
MAXIMUM_HTTP_INTENT_BYTES = 8 * 1024

app = FastAPI(title="DarkSwap agent", version="0.1.0")


class QuoteRequest(BaseModel):
    """A swap sentence. Fields other than intent are ignored."""

    intent: str


@app.middleware("http")
async def _no_store(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response


def quote_intent(intent: str) -> dict[str, object]:
    if len(intent.encode("utf-8")) > MAXIMUM_HTTP_INTENT_BYTES:
        raise HTTPException(status_code=413, detail="Intent is too large")
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
