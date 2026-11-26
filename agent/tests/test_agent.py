import json
import os
import subprocess
import sys
import unittest
import urllib.request

from darkswap_agent.intent import IntentError, parse_intent
from darkswap_agent.quote import DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN, quote_exact_in
from darkswap_agent.rehearsal import atomic_swap_calldata, plan_calls, shield_calldata
from darkswap_agent.service import handle_intent

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_SAVED_CMC_KEY = os.environ.pop("CMC_API_KEY", None)
_SAVED_ANTHROPIC_KEY = os.environ.pop("ANTHROPIC_API_KEY", None)


def tearDownModule() -> None:
    if _SAVED_CMC_KEY is not None:
        os.environ["CMC_API_KEY"] = _SAVED_CMC_KEY
    if _SAVED_ANTHROPIC_KEY is not None:
        os.environ["ANTHROPIC_API_KEY"] = _SAVED_ANTHROPIC_KEY


class IntentTests(unittest.TestCase):
    def test_parses_the_landing_sentence(self) -> None:
        intent = parse_intent("swap 0.1 bnb to the demo token, privately")
        self.assertEqual(intent.amount_wei, 10**17)
        self.assertEqual(intent.asset_out, "the demo token")
        self.assertTrue(intent.private)

    def test_rejects_a_non_swap(self) -> None:
        with self.assertRaises(IntentError):
            parse_intent("send everything to me")


class QuoteTests(unittest.TestCase):
    def test_matches_foundry_vector(self) -> None:
        quoted = quote_exact_in(10**17, DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN)
        self.assertEqual(quoted, 54_787270909036902086)

    def test_cap_refuses_a_tenth_and_quotes_four_hundredths(self) -> None:
        refused = handle_intent("swap 0.1 bnb to rNOTE privately")
        self.assertEqual(refused["status"], "refused")
        self.assertEqual(refused["quote_rnote_wei"], 54_787270909036902086)

        saved = {key: os.environ.get(key) for key in ("RPC_URL", "REHEARSAL", "SENDER")}
        for key in saved:
            os.environ.pop(key, None)
        try:
            quoted = handle_intent("swap 0.04 bnb to rNOTE privately", execute=True)
        finally:
            for key, value in saved.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
        self.assertEqual(quoted["status"], "quoted_only")
        self.assertIn("RPC_URL", str(quoted["reason"]))
        market = quoted["market"]
        assert isinstance(market, dict)
        self.assertEqual(market["cmc_status"], "skipped")
        self.assertIn(market["atlas"]["status"], ("pass", "refuse", "stale", "unavailable"))

    def test_plan_uses_the_rehearsal_selectors(self) -> None:
        self.assertTrue(shield_calldata().startswith("0x70d39cff"))
        self.assertTrue(atomic_swap_calldata(3, 0).startswith("0xed23a8e6"))
        self.assertEqual(len(plan_calls(3, 1)), 3)

    def test_execute_refuses_an_unsupported_asset_without_broadcasting(self) -> None:
        saved = {key: os.environ.get(key) for key in ("RPC_URL", "REHEARSAL", "SENDER")}
        os.environ["RPC_URL"] = "http://127.0.0.1:1"
        os.environ["REHEARSAL"] = "0x" + "11" * 20
        os.environ["SENDER"] = "0x" + "22" * 20
        try:
            refused = handle_intent("swap 0.01 bnb to USDT", execute=True)
        finally:
            for key, value in saved.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
        self.assertEqual(refused["status"], "refused")
        self.assertIn("rNOTE", str(refused["reason"]))


class McpTests(unittest.TestCase):
    def test_quote_tool(self) -> None:
        env = os.environ.copy()
        env["PYTHONPATH"] = ROOT
        process = subprocess.Popen(
            [sys.executable, "-m", "darkswap_agent", "mcp"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            cwd=ROOT,
            env=env,
        )
        assert process.stdin is not None and process.stdout is not None
        self._send(process, {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})
        self._send(process, {"jsonrpc": "2.0", "method": "notifications/initialized"})
        self._send(
            process,
            {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {"name": "quote_swap", "arguments": {"intent": "swap 0.1 bnb to X privately"}},
            },
        )
        init = self._read(process)
        quoted = self._read(process)
        assert process.stdin is not None
        process.stdin.close()
        process.wait(timeout=2)
        self.assertEqual(init["id"], 1)
        text = quoted["result"]["content"][0]["text"]
        body = json.loads(text)
        self.assertEqual(body["status"], "refused")
        self.assertEqual(body["asset_out"], "X")


    def _send(self, process: subprocess.Popen[bytes], payload: dict[str, object]) -> None:
        assert process.stdin is not None
        process.stdin.write(json.dumps(payload).encode() + b"\n")
        process.stdin.flush()

    def _read(self, process: subprocess.Popen[bytes]) -> dict[str, object]:
        assert process.stdout is not None
        while True:
            line = process.stdout.readline()
            if line == b"":
                raise AssertionError("MCP server closed stdout")
            if line.strip():
                body = json.loads(line)
                assert isinstance(body, dict)
                return body


def _anvil_up() -> bool:
    try:
        request = urllib.request.Request(
            "http://127.0.0.1:8545",
            data=json.dumps({"jsonrpc": "2.0", "id": 1, "method": "eth_chainId", "params": []}).encode(),
            headers={"content-type": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=2) as response:
            body = json.load(response)
        return body.get("result") == "0x7a69"
    except Exception:
        return False


@unittest.skipUnless(_anvil_up(), "local anvil is not running")
class AnvilRehearsalTests(unittest.TestCase):
    def test_execute_under_the_cap(self) -> None:
        saved = {key: os.environ.get(key) for key in ("RPC_URL", "REHEARSAL", "SENDER")}
        os.environ["RPC_URL"] = "http://127.0.0.1:8545"
        os.environ["REHEARSAL"] = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
        os.environ["SENDER"] = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
        try:
            result = handle_intent("swap 0.01 bnb to rNOTE privately", execute=True)
        finally:
            for key, value in saved.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
        if result["status"] == "market_refused":
            self.skipTest("the anvil pool spot is outside the live Atlas band")
        self.assertEqual(result["status"], "rehearsed", result.get("reason"))
        settlement = result["settlement"]
        assert isinstance(settlement, dict)
        self.assertEqual(int(settlement["tokens_out_wei"]), int(result["quote_rnote_wei"]))
        self.assertGreater(int(settlement["token_balance_wei"]), 0)
        self.assertIn("Public rehearsal", str(settlement["privacy"]))


if __name__ == "__main__":
    unittest.main()
