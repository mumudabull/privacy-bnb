import os
import unittest
from pathlib import Path

from darkswap_agent.market import (
    _append_log,
    assess_feed,
    atlas_log_path,
    deviation_bps,
    describe_market,
    implied_bnb_usd_wei,
    log_path,
    parse_bnb_usd,
    scale_feed_answer,
    usd_to_wei,
)


class MarketMathTests(unittest.TestCase):
    def setUp(self) -> None:
        self._key = os.environ.pop("CMC_API_KEY", None)

    def tearDown(self) -> None:
        if self._key is not None:
            os.environ["CMC_API_KEY"] = self._key

    def test_parses_a_usd_price_without_using_a_key(self) -> None:
        body = b'{"data":{"BNB":[{"quote":{"USD":{"price":890.12,"volume_24h":1}}}]}}'
        self.assertEqual(parse_bnb_usd(body), "890.12")
        self.assertEqual(usd_to_wei("890.12"), 890_120000000000000000)

    def test_deviation_refuses_a_wide_gap(self) -> None:
        amm = implied_bnb_usd_wei(10**18, 987_158034397061298850)
        reference = usd_to_wei("600")
        bps = deviation_bps(amm, reference)
        self.assertGreater(bps, 500)
        decision = describe_market(
            amm,
            {"ok": True, "status": 200, "price_usd": "600", "price_wei": reference, "response_sha256": "abc"},
        )
        self.assertEqual(decision["status"], "refuse")

    def test_eighteen_decimal_feed_and_round_one(self) -> None:
        answer = 553084174049970300000
        self.assertEqual(scale_feed_answer(answer, 18), answer)
        self.assertEqual(scale_feed_answer(55308417405, 8), 553084174050000000000)
        now = 1_795_658_900
        ok, reason = assess_feed(1, answer, now - 40, 0, 18, now, 3600)
        self.assertTrue(ok)
        self.assertEqual(reason, "ok")
        stale, why = assess_feed(1, answer, now - 3601, 1, 18, now, 3600)
        self.assertFalse(stale)
        self.assertEqual(why, "stale")

    def test_missing_key_skips_without_a_request(self) -> None:
        decision = describe_market(10**18, None)
        self.assertEqual(decision["status"], "skipped")
        self.assertNotIn("response_sha256", decision)

    def test_a_failed_log_write_stays_quiet(self) -> None:
        saved = os.environ.get("CMC_LOG_PATH")
        os.environ["CMC_LOG_PATH"] = "/dev/full"
        try:
            _append_log({"status": 0, "price_usd": None})
        finally:
            if saved is None:
                os.environ.pop("CMC_LOG_PATH", None)
            else:
                os.environ["CMC_LOG_PATH"] = saved

    def test_vercel_log_files_land_in_tmp(self) -> None:
        keys = ("VERCEL", "CMC_LOG_PATH", "ATLAS_LOG_PATH")
        saved = {key: os.environ.get(key) for key in keys}
        os.environ["VERCEL"] = "1"
        os.environ.pop("CMC_LOG_PATH", None)
        os.environ.pop("ATLAS_LOG_PATH", None)
        try:
            self.assertEqual(log_path(), Path("/tmp/cmc-requests.jsonl"))
            self.assertEqual(atlas_log_path(), Path("/tmp/atlas-requests.jsonl"))
            os.environ["CMC_LOG_PATH"] = "/tmp/custom-cmc.jsonl"
            self.assertEqual(log_path(), Path("/tmp/custom-cmc.jsonl"))
        finally:
            for key, value in saved.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
