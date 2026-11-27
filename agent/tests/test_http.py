"""File: agent/tests/test_http.py

Purpose: The ASGI app starts, health and quote routes answer, and the HTTP
surface stays on the quote path. External price calls are mocked.
"""

import os
import unittest
from unittest import mock

from fastapi.testclient import TestClient

from app import app
from darkswap_agent.quote import DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN, quote_exact_in

_SAVED = {key: os.environ.get(key) for key in ("DARKSWAP_POOL_SOURCE", "CMC_API_KEY", "ANTHROPIC_API_KEY")}


def setUpModule() -> None:
    os.environ["DARKSWAP_POOL_SOURCE"] = "seed"
    os.environ.pop("CMC_API_KEY", None)
    os.environ.pop("ANTHROPIC_API_KEY", None)


def tearDownModule() -> None:
    for key, value in _SAVED.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value


def _broadcast_env() -> dict[str, str]:
    return {
        "RPC_URL": "http://127.0.0.1:1",
        "REHEARSAL": "0x" + "11" * 20,
        "SENDER": "0x" + "22" * 20,
        "PRIVATE_KEY": "0x" + "ab" * 32,
        "DARKSWAP_POOL_SOURCE": "seed",
    }


class HttpAppTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self) -> None:
        self.client.__exit__(None, None, None)

    def test_health_and_index_do_not_call_the_market(self) -> None:
        with mock.patch("darkswap_agent.service.fetch_atlas") as fetch_atlas, mock.patch(
            "darkswap_agent.service.fetch_cmc"
        ) as fetch_cmc:
            health = self.client.get("/health")
            index = self.client.get("/")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json(), {"status": "ok", "mode": "quote-only"})
        self.assertEqual(health.headers["cache-control"], "no-store")
        self.assertEqual(index.status_code, 200)
        self.assertEqual(index.json()["mode"], "quote-only")
        fetch_atlas.assert_not_called()
        fetch_cmc.assert_not_called()

    def test_surface_is_quote_only(self) -> None:
        paths = {getattr(route, "path", None) for route in app.routes}
        self.assertIn("/health", paths)
        self.assertIn("/quote", paths)
        self.assertNotIn("/execute", paths)
        self.assertNotIn("/register", paths)
        missing = self.client.post("/execute", json={"intent": "swap 0.01 bnb to rNOTE privately"})
        self.assertEqual(missing.status_code, 404)

    @mock.patch("darkswap_agent.service.fetch_atlas", return_value={"status": "pass"})
    @mock.patch("darkswap_agent.service.fetch_cmc", return_value=None)
    def test_post_and_get_quote_under_the_cap(self, _fetch_cmc: mock.Mock, _fetch_atlas: mock.Mock) -> None:
        intent = "swap 0.04 bnb to rNOTE privately"
        expected = quote_exact_in(4 * 10**16, DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN)
        with mock.patch.dict(os.environ, _broadcast_env(), clear=False):
            posted = self.client.post("/quote", json={"intent": intent, "execute": True})
            queried = self.client.get("/quote", params={"intent": intent, "execute": "true"})
        for response in (posted, queried):
            self.assertEqual(response.status_code, 200, response.text)
            body = response.json()
            self.assertEqual(body["status"], "quoted")
            self.assertEqual(body["quote_rnote_wei"], expected)
            self.assertNotIn("settlement", body)
            self.assertNotIn(_broadcast_env()["PRIVATE_KEY"], response.text)
            self.assertEqual(response.headers["cache-control"], "no-store")

    @mock.patch("darkswap_agent.service.fetch_atlas", return_value={"status": "pass"})
    @mock.patch("darkswap_agent.service.fetch_cmc", return_value=None)
    def test_over_cap_is_refused_with_the_quote(self, _fetch_cmc: mock.Mock, _fetch_atlas: mock.Mock) -> None:
        with mock.patch.dict(os.environ, _broadcast_env(), clear=False):
            response = self.client.post("/quote", json={"intent": "swap 0.1 bnb to rNOTE privately"})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "refused")
        self.assertIn("0.05", str(body["reason"]))
        self.assertEqual(body["quote_rnote_wei"], quote_exact_in(10**17, DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN))
        self.assertNotIn("settlement", body)

    @mock.patch("darkswap_agent.service.fetch_atlas", return_value={"status": "refuse"})
    @mock.patch("darkswap_agent.service.fetch_cmc", return_value=None)
    def test_market_guard_refuses_inside_the_cap(self, _fetch_cmc: mock.Mock, _fetch_atlas: mock.Mock) -> None:
        response = self.client.post("/quote", json={"intent": "swap 0.04 bnb to rNOTE privately"})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "market_refused")
        self.assertEqual(body["market"]["status"], "refuse")
        self.assertNotIn("settlement", body)

    def test_bad_requests_stay_out_of_the_quoter(self) -> None:
        with mock.patch("darkswap_agent.service.handle_intent") as handle:
            missing = self.client.post("/quote", json={})
            numeric = self.client.post("/quote", json={"intent": 1})
            huge = self.client.post("/quote", json={"intent": "a" * (8 * 1024 + 1)})
        self.assertEqual(missing.status_code, 422)
        self.assertEqual(numeric.status_code, 422)
        self.assertEqual(huge.status_code, 413)
        handle.assert_not_called()

    @mock.patch("darkswap_agent.service.fetch_atlas", return_value={"status": "pass"})
    @mock.patch("darkswap_agent.service.fetch_cmc", return_value=None)
    def test_a_blank_sentence_is_rejected_by_the_agent(self, _fetch_cmc: mock.Mock, _fetch_atlas: mock.Mock) -> None:
        response = self.client.post("/quote", json={"intent": "   "})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "rejected")


if __name__ == "__main__":
    unittest.main()
