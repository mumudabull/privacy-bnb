import os
import unittest

from darkswap_agent.market import deviation_bps, describe_market, implied_bnb_usd_wei, parse_bnb_usd, usd_to_wei


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

    def test_missing_key_skips_without_a_request(self) -> None:
        decision = describe_market(10**18, None)
        self.assertEqual(decision["status"], "skipped")
        self.assertNotIn("response_sha256", decision)
