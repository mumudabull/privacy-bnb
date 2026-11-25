"""CoinMarketCap BNB/USD check against the AMM's implied price.

1 rNOTE is treated as 1 USD, so rNOTE received per BNB is an implied BNB/USD.
The API key is read from CMC_API_KEY and is never written to the log.
"""

import hashlib
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ENDPOINT = "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest"
QUERY = "symbol=BNB&convert=USD"
_PRICE = re.compile(rb'"USD"\s*:\s*\{[^{}]*"price"\s*:\s*([0-9]+(?:\.[0-9]+)?)')


def deviation_bps(left: int, right: int) -> int:
    if right <= 0:
        return 10_000
    diff = abs(left - right)
    return diff * 10_000 // right


def usd_to_wei(price: str) -> int:
    whole, _, fraction = price.partition(".")
    if not whole.isdigit() or (fraction and not fraction.isdigit()):
        raise ValueError("price was not a decimal")
    return int(whole) * 10**18 + int((fraction + "0" * 18)[:18] or "0")


def implied_bnb_usd_wei(amount_in: int, amount_out: int) -> int:
    if amount_in <= 0:
        return 0
    return amount_out * 10**18 // amount_in


def parse_bnb_usd(body: bytes) -> str | None:
    match = _PRICE.search(body)
    if match is None:
        return None
    return match.group(1).decode("ascii")


def log_path() -> Path:
    configured = os.environ.get("CMC_LOG_PATH", "").strip()
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[1] / "logs" / "cmc-requests.jsonl"


def _append_log(record: dict[str, object]) -> None:
    path = log_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, separators=(",", ":")) + "\n")


def fetch_cmc() -> dict[str, object] | None:
    """Return a CMC snapshot, or None when CMC_API_KEY is unset. Never logs the key."""
    key = os.environ.get("CMC_API_KEY", "").strip()
    if not key:
        return None
    request = urllib.request.Request(
        f"{ENDPOINT}?{QUERY}",
        headers={"Accept": "application/json", "X-CMC_PRO_API_KEY": key},
    )
    status = 0
    body = b""
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            status = response.status
            body = response.read()
    except urllib.error.HTTPError as error:
        status = error.code
        body = error.read()
    except OSError:
        _append_log(
            {
                "timestamp": _now(),
                "endpoint": ENDPOINT,
                "query": QUERY,
                "status": 0,
                "price_usd": None,
                "response_sha256": None,
            }
        )
        return {"ok": False, "status": 0}
    digest = hashlib.sha256(body).hexdigest()
    price = parse_bnb_usd(body) if status == 200 else None
    _append_log(
        {
            "timestamp": _now(),
            "endpoint": ENDPOINT,
            "query": QUERY,
            "status": status,
            "price_usd": price,
            "response_sha256": digest,
        }
    )
    if price is None:
        return {"ok": False, "status": status, "response_sha256": digest}
    return {
        "ok": True,
        "status": status,
        "price_usd": price,
        "price_wei": usd_to_wei(price),
        "response_sha256": digest,
    }


def describe_market(amm_price_wei: int, snapshot: dict[str, object] | None) -> dict[str, object]:
    max_bps = _max_bps()
    base: dict[str, object] = {
        "amm_implied_usd_wei": str(amm_price_wei),
        "max_deviation_bps": max_bps,
        "unit": "1 rNOTE treated as 1 USD",
    }
    if snapshot is None:
        base["status"] = "skipped"
        base["reason"] = "CMC_API_KEY is unset. No request was sent."
        return base
    if not snapshot.get("ok"):
        base["status"] = "unavailable"
        base["http_status"] = snapshot.get("status")
        base["response_sha256"] = snapshot.get("response_sha256")
        base["reason"] = "CoinMarketCap did not return a BNB/USD price."
        return base
    reference = int(snapshot["price_wei"])
    bps = deviation_bps(amm_price_wei, reference)
    base.update(
        {
            "status": "pass" if bps <= max_bps else "refuse",
            "cmc_usd": snapshot["price_usd"],
            "deviation_bps": bps,
            "http_status": snapshot["status"],
            "response_sha256": snapshot["response_sha256"],
        }
    )
    return base


def _max_bps() -> int:
    raw = os.environ.get("CMC_MAX_DEVIATION_BPS", "").strip()
    if not raw:
        return 500
    try:
        value = int(raw, 10)
    except ValueError:
        return 500
    if value < 0 or value > 10_000:
        return 500
    return value


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
