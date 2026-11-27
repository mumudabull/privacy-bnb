"""HTTP entrypoint checks; no live RPC, model, or market calls."""

import json
import os
import subprocess
import sys
import unittest
from unittest import mock

from app import app


class HttpTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = app.test_client()

    def test_health_does_not_call_the_agent(self) -> None:
        with mock.patch("app.handle_intent") as handle:
            for path in ("/", "/health"):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json["status"], "ok")
                self.assertEqual(response.headers["Cache-Control"], "no-store")
            handle.assert_not_called()

    def test_quote_never_enables_execution(self) -> None:
        with mock.patch("app.handle_intent", return_value={"status": "quoted"}) as handle:
            response = self.client.post("/quote", json={"intent": "swap 0.04 bnb to rNOTE privately"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["status"], "quoted")
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        handle.assert_called_once_with("swap 0.04 bnb to rNOTE privately", execute=False)

    def test_invalid_requests_stop_before_the_agent_runs(self) -> None:
        invalid = [None, [], "swap", {}, {"intent": None}, {"intent": 4},
                   {"intent": " "}, {"intent": "x" * 281},
                   {"intent": "swap 0.04 bnb to rNOTE", "execute": True}]
        with mock.patch("app.handle_intent") as handle:
            for payload in invalid:
                with self.subTest(payload=payload):
                    response = self.client.post("/quote", data=json.dumps(payload), content_type="application/json")
                    self.assertEqual(response.status_code, 400)
            self.assertEqual(self.client.post("/quote", data="{", content_type="application/json").status_code, 400)
            self.assertEqual(self.client.post("/quote", data="intent=swap").status_code, 415)
            self.assertEqual(self.client.post("/quote", data="x" * 8193, content_type="application/json").status_code, 413)
            self.assertEqual(self.client.get("/quote").status_code, 405)
            self.assertEqual(self.client.post("/execute", json={"intent": "swap 0.01 bnb to rNOTE"}).status_code, 404)
            handle.assert_not_called()

    def test_real_agent_retains_quote_and_cap_behavior(self) -> None:
        with mock.patch.dict(os.environ, {"DARKSWAP_POOL_SOURCE": "seed", "CMC_API_KEY": "", "ANTHROPIC_API_KEY": "", "DARKSWAP_CAP_WEI": ""}), mock.patch(
            "darkswap_agent.service.fetch_atlas", return_value={"status": "unavailable"}
        ):
            for amount, expected in (("0.04", "quoted"), ("0.1", "refused")):
                response = self.client.post("/quote", json={"intent": f"swap {amount} bnb to rNOTE privately"})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json["status"], expected)
                self.assertEqual(response.json["amount_bnb"], amount)
                self.assertIn("privacy", response.json)

    def test_vercel_defaults_logs_to_writable_temporary_storage(self) -> None:
        environment = os.environ.copy()
        environment["VERCEL"] = "1"
        for name in ("CMC_LOG_PATH", "ATLAS_LOG_PATH"):
            environment.pop(name, None)
        result = subprocess.run(
            [sys.executable, "-c", "import app, os, json; print(json.dumps([os.environ['CMC_LOG_PATH'], os.environ['ATLAS_LOG_PATH']]))"],
            env=environment, capture_output=True, text=True, check=True,
        )
        self.assertEqual(json.loads(result.stdout), ["/tmp/cmc-requests.jsonl", "/tmp/atlas-requests.jsonl"])


if __name__ == "__main__":
    unittest.main()
