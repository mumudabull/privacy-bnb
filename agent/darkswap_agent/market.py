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


ATLAS_BNB_USD_FEED = "0x3957d289ee9C38272377786787ea34F9dd29788D"
DEFAULT_BSC_TESTNET_RPC = "https://bsc-testnet-dataseed.bnbchain.org"
ATLAS_EXPLORER = f"https://testnet.bscscan.com/address/{ATLAS_BNB_USD_FEED}"
_DECIMALS = "0x313ce567"
_LATEST_ROUND = "0xfeaf968c"


def scale_feed_answer(answer: int, decimals: int) -> int:
    if decimals == 18:
        return answer
    if decimals < 18:
        return answer * 10 ** (18 - decimals)
    return answer // 10 ** (decimals - 18)


def assess_feed(round_id: int, answer: int, updated_at: int, answered_in_round: int, decimals: int, now: int, max_stale: int) -> tuple[bool, str]:
    if round_id == 0 or updated_at == 0 or updated_at > now or now - updated_at > max_stale:
        return False, "stale"
    if answered_in_round != 0 and answered_in_round < round_id:
        return False, "stale"
    if answer <= 0 or decimals < 0 or decimals > 36:
        return False, "bad-price"
    if scale_feed_answer(answer, decimals) <= 0:
        return False, "bad-price"
    return True, "ok"


def atlas_log_path() -> Path:
    configured = os.environ.get("ATLAS_LOG_PATH", "").strip()
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[1] / "logs" / "atlas-requests.jsonl"


def fetch_atlas(amm_price_wei: int) -> dict[str, object]:
    """Read Atlas BNB/USD with eth_call. No API key. Logs the round, never a secret."""
    feed = os.environ.get("ORACLE_FEED", ATLAS_BNB_USD_FEED).strip() or ATLAS_BNB_USD_FEED
    rpc = os.environ.get("RPC_URL_BSC_TESTNET", DEFAULT_BSC_TESTNET_RPC).strip() or DEFAULT_BSC_TESTNET_RPC
    base: dict[str, object] = {
        "status": "unavailable",
        "feed": feed,
        "explorer": f"https://testnet.bscscan.com/address/{feed}",
        "price_usd": None,
        "deviation_bps": None,
        "decimals": None,
        "updated_at": None,
        "round_id": None,
    }
    payload = json.dumps(
        [
            {"jsonrpc": "2.0", "id": 1, "method": "eth_call", "params": [{"to": feed, "data": _DECIMALS}, "latest"]},
            {"jsonrpc": "2.0", "id": 2, "method": "eth_call", "params": [{"to": feed, "data": _LATEST_ROUND}, "latest"]},
        ]
    ).encode()
    try:
        request = urllib.request.Request(rpc, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=8) as response:
            body = json.loads(response.read().decode())
    except (OSError, urllib.error.URLError, json.JSONDecodeError, TimeoutError):
        _append_atlas(base)
        return base
    if not isinstance(body, list):
        _append_atlas(base)
        return base
    decoded = _decode_round(body)
    if decoded is None:
        _append_atlas(base)
        return base
    round_id, answer, updated_at, answered_in_round, decimals = decoded
    now = int(datetime.now(timezone.utc).timestamp())
    ok, reason = assess_feed(round_id, answer, updated_at, answered_in_round, decimals, now, _stale_seconds())
    price_wei = scale_feed_answer(answer, decimals) if ok else 0
    bps = deviation_bps(amm_price_wei, price_wei) if ok else None
    status = "pass" if ok and bps is not None and bps <= _max_bps() else "refuse" if ok else ("stale" if reason == "stale" else "unavailable")
    base.update(
        {
            "status": status,
            "price_usd": _usd(price_wei) if ok else None,
            "price_wei": str(price_wei) if ok else None,
            "deviation_bps": bps,
            "decimals": decimals,
            "updated_at": updated_at,
            "round_id": round_id,
        }
    )
    _append_atlas(base)
    return base


def quote_market(amm_price_wei: int, cmc: dict[str, object] | None, atlas: dict[str, object]) -> dict[str, object]:
    market = describe_market(amm_price_wei, cmc)
    market["cmc_status"] = market["status"]
    market["atlas"] = atlas
    atlas_status = atlas.get("status")
    cmc_status = market["cmc_status"]
    if atlas_status == "refuse" or cmc_status == "refuse":
        market["status"] = "refuse"
    elif atlas_status == "pass" and cmc_status in ("pass", "skipped"):
        market["status"] = "pass"
    elif atlas_status in ("stale", "unavailable"):
        market["status"] = "unavailable"
    return market


def _decode_round(body: list[object]) -> tuple[int, int, int, int, int] | None:
    decimals_hex = _result(body, 1)
    round_hex = _result(body, 2)
    if decimals_hex is None or round_hex is None or len(round_hex) < 2 + 64 * 5:
        return None
    try:
        decimals = int(decimals_hex, 16)
        words = [int(round_hex[2 + i * 64 : 2 + (i + 1) * 64], 16) for i in range(5)]
    except ValueError:
        return None
    answer = words[1]
    if answer >= 1 << 255:
        answer -= 1 << 256
    return words[0], answer, words[3], words[4], decimals


def _result(body: list[object], wanted: int) -> str | None:
    for item in body:
        if isinstance(item, dict) and item.get("id") == wanted and isinstance(item.get("result"), str):
            return item["result"]
    return None


def _stale_seconds() -> int:
    raw = os.environ.get("MAX_STALE_SECONDS", "3600").strip()
    try:
        value = int(raw, 10)
    except ValueError:
        return 3600
    return value if value >= 0 else 3600


def _usd(wei: int) -> str:
    return f"{wei / 10**18}.{wei % 10**18:018d}"[:len(str(wei // 10**18)) + 3]


def _append_atlas(record: dict[str, object]) -> None:
    path = atlas_log_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    line = {"timestamp": _now(), "source": "atlas", **record}
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(line, separators=(",", ":")) + "\n")
