"""File: agent/tests/test_http_guard.py

Purpose: The quote window, the client address, and the raw body ceiling.
"""

import asyncio
import unittest

from starlette.requests import Request

from darkswap_agent.http_guard import (
    MAX_TRACKED_ADDRESSES,
    MAXIMUM_HTTP_BODY_BYTES,
    QUOTE_REQUESTS_PER_WINDOW,
    QUOTE_WINDOW_MS,
    client_address,
    consume_rate_limit,
    read_bounded,
    reset_rate_limits,
)

START = 1_700_000_000_000.0


def _request(body: bytes, content_length: str | None) -> Request:
    sent = False

    async def receive() -> dict[str, object]:
        nonlocal sent
        if sent:
            return {"type": "http.request", "body": b"", "more_body": False}
        sent = True
        return {"type": "http.request", "body": body, "more_body": False}

    headers: list[tuple[bytes, bytes]] = []
    if content_length is not None:
        headers.append((b"content-length", content_length.encode()))
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/quote",
        "raw_path": b"/quote",
        "query_string": b"",
        "headers": headers,
        "client": ("127.0.0.1", 123),
        "server": ("test", 80),
    }
    return Request(scope, receive)


class RateWindowTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_rate_limits()

    def tearDown(self) -> None:
        reset_rate_limits()

    def test_thirty_requests_fit_and_the_next_waits(self) -> None:
        for index in range(QUOTE_REQUESTS_PER_WINDOW):
            decision = consume_rate_limit("203.0.113.8", START)
            self.assertTrue(decision.allowed)
            self.assertEqual(decision.remaining, QUOTE_REQUESTS_PER_WINDOW - index - 1)
        blocked = consume_rate_limit("203.0.113.8", START)
        self.assertFalse(blocked.allowed)
        self.assertEqual(blocked.retry_after_seconds, QUOTE_WINDOW_MS // 1000)
        self.assertTrue(consume_rate_limit("203.0.113.9", START).allowed)

    def test_the_window_opens_when_the_oldest_hit_expires(self) -> None:
        for _ in range(QUOTE_REQUESTS_PER_WINDOW):
            consume_rate_limit("203.0.113.8", START)
        blocked = consume_rate_limit("203.0.113.8", START)
        self.assertFalse(blocked.allowed)
        reopened = consume_rate_limit("203.0.113.8", START + QUOTE_WINDOW_MS)
        self.assertTrue(reopened.allowed)

    def test_a_blocked_call_does_not_fill_the_next_window(self) -> None:
        for _ in range(QUOTE_REQUESTS_PER_WINDOW):
            consume_rate_limit("203.0.113.8", START)
        self.assertFalse(consume_rate_limit("203.0.113.8", START).allowed)
        self.assertTrue(consume_rate_limit("203.0.113.8", START + QUOTE_WINDOW_MS).allowed)

    def test_a_full_table_refuses_a_new_address(self) -> None:
        for index in range(MAX_TRACKED_ADDRESSES):
            self.assertTrue(consume_rate_limit(f"addr-{index}", START).allowed)
        overflow = consume_rate_limit("addr-overflow", START)
        self.assertFalse(overflow.allowed)
        self.assertFalse(consume_rate_limit("addr-overflow", START).allowed)
        self.assertTrue(consume_rate_limit("addr-0", START).allowed)

    def test_address_prefers_the_vercel_headers(self) -> None:
        self.assertEqual(
            client_address({"x-forwarded-for": "198.51.100.2", "x-real-ip": "203.0.113.8"}),
            "203.0.113.8",
        )
        self.assertEqual(
            client_address({"x-forwarded-for": "198.51.100.2, 203.0.113.1", "x-vercel-forwarded-for": "203.0.113.9"}),
            "203.0.113.9",
        )
        self.assertEqual(client_address({"x-forwarded-for": "198.51.100.2, 203.0.113.1"}), "198.51.100.2")
        self.assertEqual(client_address({}), "unknown")


class BodyCeilingTests(unittest.TestCase):
    def test_a_declared_oversize_body_is_refused_before_it_is_read(self) -> None:
        request = _request(b"x" * (MAXIMUM_HTTP_BODY_BYTES + 1), str(MAXIMUM_HTTP_BODY_BYTES + 1))
        self.assertIsNone(asyncio.run(read_bounded(request, MAXIMUM_HTTP_BODY_BYTES)))

    def test_a_short_content_length_does_not_hide_a_large_body(self) -> None:
        body = b'{"intent":"swap 0.04 bnb to rNOTE privately","padding":"' + b"x" * 9000 + b'"}'
        request = _request(body, "10")
        self.assertIsNone(asyncio.run(read_bounded(request, MAXIMUM_HTTP_BODY_BYTES)))

    def test_an_accepted_body_stays_readable(self) -> None:
        raw = b'{"intent":"swap 0.04 bnb to rNOTE privately"}'
        request = _request(raw, str(len(raw)))
        self.assertEqual(asyncio.run(read_bounded(request, MAXIMUM_HTTP_BODY_BYTES)), raw)
        self.assertEqual(asyncio.run(request.body()), raw)


if __name__ == "__main__":
    unittest.main()
