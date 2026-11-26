import os

from darkswap_agent.intent import IntentError, SwapIntent
from darkswap_agent.interpreter import interpret_intent
from darkswap_agent.market import fetch_atlas, fetch_cmc, implied_bnb_usd_wei, quote_market
from darkswap_agent.quote import (
    DEMO_RESERVE_BNB,
    DEMO_RESERVE_TOKEN,
    DEMO_RNOTE_PER_BNB,
    EXECUTION_CAP_WEI,
    format_units,
    quote_exact_in,
)
from darkswap_agent.rehearsal import PRIVACY_LINE, RehearsalError, plan_calls, read_reserves, run_rehearsal

EXECUTABLE_ASSETS = {"rnote", "the demo token"}


def handle_intent(text: str, *, execute: bool = False) -> dict[str, object]:
    # The model, when used, only fills in amount, asset, and privacy flag.
    # Every limit below is applied to the validated intent by this code.
    try:
        interpreted = interpret_intent(text)
    except IntentError as error:
        return {"status": "rejected", "reason": str(error), "privacy": PRIVACY_LINE}
    intent = interpreted.intent

    cap = _cap_wei()
    quoted = quote_exact_in(intent.amount_wei, DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN)
    result: dict[str, object] = {
        "status": "quoted",
        "amount_bnb": format_units(intent.amount_wei),
        "amount_wei": intent.amount_wei,
        "asset_out": intent.asset_out,
        "private_requested": intent.private,
        "parser": interpreted.describe(),
        "quote_rnote": format_units(quoted),
        "quote_rnote_wei": quoted,
        "execution_cap_bnb": format_units(cap),
        "pool": f"seed quote, 10 BNB / {DEMO_RNOTE_PER_BNB * 10} rNOTE, 0.30% fee",
        "privacy": PRIVACY_LINE,
        "example_calls_for_note_0": plan_calls(0, quoted),
    }
    seed_implied = implied_bnb_usd_wei(DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN)
    cmc = fetch_cmc()
    atlas = fetch_atlas(seed_implied)
    result["market"] = quote_market(seed_implied, cmc, atlas)
    if intent.asset_out.lower() not in EXECUTABLE_ASSETS:
        result["asset_note"] = (
            f"{intent.asset_out} is not executable. This rehearsal only swaps BNB for rNOTE."
        )
    if intent.amount_wei > cap:
        result["status"] = "refused"
        result["reason"] = f"Above the {format_units(cap)} BNB execution cap. Quote only."
        return result
    if execute and intent.asset_out.lower() not in EXECUTABLE_ASSETS:
        result["status"] = "refused"
        result["reason"] = (
            f"Refusing to broadcast a swap to {intent.asset_out}. "
            "Execution only supports rNOTE."
        )
        return result
    if not execute:
        if _market_refuses(result):
            result["status"] = "market_refused"
            result["reason"] = "Pool price is outside the Atlas or CoinMarketCap band."
        return result

    rpc_url = os.environ.get("RPC_URL", "").strip()
    rehearsal = os.environ.get("REHEARSAL", "").strip()
    sender = os.environ.get("SENDER", "").strip()
    if not rpc_url or not rehearsal or not sender:
        result["status"] = "quoted_only"
        result["reason"] = (
            "Set RPC_URL, REHEARSAL, and SENDER (an unlocked account) to broadcast "
            "the public rehearsal. PRIVATE_KEY is not read by this path."
        )
        return result
    try:
        reserve_bnb, reserve_token = read_reserves(rpc_url, rehearsal)
        live_quote = quote_exact_in(intent.amount_wei, reserve_bnb, reserve_token)
        if live_quote <= 0:
            raise RehearsalError("live pool quote was zero")
        result["quote_rnote_wei"] = live_quote
        result["quote_rnote"] = format_units(live_quote)
        result["pool"] = "live DemoAMM reserves, minimum output equals this quote"
        live_implied = implied_bnb_usd_wei(reserve_bnb, reserve_token)
        result["market"] = quote_market(live_implied, cmc, fetch_atlas(live_implied))
        if _market_refuses(result):
            result["status"] = "market_refused"
            result["reason"] = "Live AMM spot is outside the Atlas or CoinMarketCap band. Not broadcast."
            return result
        settled = run_rehearsal(rpc_url, rehearsal, sender, intent.amount_wei, live_quote)
    except (RehearsalError, OSError, TimeoutError) as error:
        result["status"] = "broadcast_failed"
        result["reason"] = str(error)
        return result
    result["status"] = "rehearsed"
    result["settlement"] = settled
    return result


def _cap_wei() -> int:
    raw = os.environ.get("DARKSWAP_CAP_WEI", "").strip()
    if not raw:
        return EXECUTION_CAP_WEI
    try:
        cap = int(raw, 0)
    except ValueError:
        return EXECUTION_CAP_WEI
    if cap < 0:
        return EXECUTION_CAP_WEI
    return cap


def _market_refuses(result: dict[str, object]) -> bool:
    market = result.get("market")
    return isinstance(market, dict) and market.get("status") == "refuse"


def describe(intent: SwapIntent) -> str:
    return f"swap {format_units(intent.amount_wei)} bnb to {intent.asset_out}"
