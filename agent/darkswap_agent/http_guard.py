"""Per-address quote limit and request-size ceiling for the HTTP app.

The numbers match the public MCP route: 30 requests in 60 seconds, and an
8KB ceiling. The count lives in this process. The privacy-bnb firewall rule
is a different project and does not see these requests.
"""

import time
from collections.abc import Mapping
from contextlib import aclosing
from dataclasses import dataclass
from threading import Lock

from starlette.requests import Request

QUOTE_REQUESTS_PER_WINDOW = 30
QUOTE_WINDOW_MS = 60_000
MAX_TRACKED_ADDRESSES = 5000
MAXIMUM_HTTP_BODY_BYTES = 8 * 1024

_hits: dict[str, list[float]] = {}
_next_sweep_at = 0.0
_lock = Lock()


@dataclass(frozen=True)
class RateDecision:
    allowed: bool
    retry_after_seconds: int = 0
    remaining: int = 0


def reset_rate_limits() -> None:
    global _next_sweep_at
    with _lock:
        _hits.clear()
        _next_sweep_at = 0.0


def client_address(headers: Mapping[str, str]) -> str:
    """Address Vercel reports for the caller. Missing headers share one bucket."""
    real_ip = (headers.get("x-real-ip") or "").strip()
    if real_ip:
        return real_ip
    vercel_address = _first_address(headers.get("x-vercel-forwarded-for"))
    if vercel_address is not None:
        return vercel_address
    forwarded = _first_address(headers.get("x-forwarded-for"))
    if forwarded is not None:
        return forwarded
    return "unknown"


def consume_rate_limit(address: str, now_ms: float | None = None) -> RateDecision:
    """Record one quote. A blocked call does not add a hit."""
    now = time.monotonic() * 1000 if now_ms is None else now_ms
    with _lock:
        return _consume(address, now)


async def read_bounded(request: Request, limit: int) -> bytes | None:
    """Return the raw body, or None when it is larger than `limit`.

    A Content-Length above the ceiling is refused before the body is read.
    A missing or low Content-Length is still measured on the bytes received.
    The accepted body is cached on the request so the route can parse it.
    """
    declared = _declared_length(request.headers.get("content-length"))
    if declared is not None and declared > limit:
        return None
    chunks: list[bytes] = []
    size = 0
    async with aclosing(request.stream()) as stream:
        async for chunk in stream:
            if not chunk:
                continue
            size += len(chunk)
            if size > limit:
                return None
            chunks.append(chunk)
    body = b"".join(chunks)
    request._body = body
    return body


def _first_address(header: str | None) -> str | None:
    if header is None:
        return None
    first = header.split(",")[0].strip()
    return first or None


def _declared_length(header: str | None) -> int | None:
    if header is None:
        return None
    try:
        value = int(header)
    except ValueError:
        return None
    if value < 0:
        return None
    return value


def _consume(address: str, now: float) -> RateDecision:
    if address not in _hits and not _has_room(now):
        return RateDecision(allowed=False, retry_after_seconds=QUOTE_WINDOW_MS // 1000)
    window_start = now - QUOTE_WINDOW_MS
    recent = [hit for hit in _hits.get(address, []) if hit > window_start]
    if len(recent) >= QUOTE_REQUESTS_PER_WINDOW:
        _hits[address] = recent
        oldest = recent[0] if recent else now
        retry_after = max(1, int((oldest + QUOTE_WINDOW_MS - now + 999) // 1000))
        return RateDecision(allowed=False, retry_after_seconds=retry_after)
    recent.append(now)
    _hits[address] = recent
    return RateDecision(allowed=True, remaining=QUOTE_REQUESTS_PER_WINDOW - len(recent))


def _has_room(now: float) -> bool:
    global _next_sweep_at
    if len(_hits) < MAX_TRACKED_ADDRESSES:
        return True
    if now >= _next_sweep_at:
        _sweep(now)
    return len(_hits) < MAX_TRACKED_ADDRESSES


def _sweep(now: float) -> None:
    global _next_sweep_at
    window_start = now - QUOTE_WINDOW_MS
    oldest_remaining = None
    for address, hits in list(_hits.items()):
        oldest = hits[0] if hits else None
        if oldest is None or oldest <= window_start:
            recent = [hit for hit in hits if hit > window_start]
            if not recent:
                del _hits[address]
                continue
            _hits[address] = recent
            oldest = recent[0]
        if oldest_remaining is None or oldest < oldest_remaining:
            oldest_remaining = oldest
    _next_sweep_at = now if oldest_remaining is None else oldest_remaining + QUOTE_WINDOW_MS
