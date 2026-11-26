"""Integer quote shared with contracts/src/SwapMath.sol and lib/quote.ts."""

import os

FEE_BPS = 30
BPS = 10_000


def _rnote_per_bnb() -> int:
    raw = os.environ.get("DEMO_RNOTE_PER_BNB", "555").strip()
    try:
        value = int(raw, 10)
    except ValueError:
        return 555
    return value if value > 0 else 555


DEMO_RNOTE_PER_BNB = _rnote_per_bnb()
DEMO_RESERVE_BNB = 10 * 10**18
DEMO_RESERVE_TOKEN = DEMO_RNOTE_PER_BNB * DEMO_RESERVE_BNB
# 0.05 BNB. Raised only by setting DARKSWAP_CAP_WEI in the environment.
EXECUTION_CAP_WEI = 5 * 10**16


def quote_exact_in(amount_in: int, reserve_in: int, reserve_out: int) -> int:
    if amount_in <= 0 or reserve_in <= 0 or reserve_out <= 0:
        return 0
    in_with_fee = amount_in * (BPS - FEE_BPS)
    return (in_with_fee * reserve_out) // (reserve_in * BPS + in_with_fee)


def format_units(wei: int, digits: int = 6) -> str:
    sign = "-" if wei < 0 else ""
    absolute = -wei if wei < 0 else wei
    whole, fraction = divmod(absolute, 10**18)
    trimmed = f"{fraction:018d}"[:digits].rstrip("0")
    body = f"{whole}.{trimmed}" if trimmed else str(whole)
    return sign + body
