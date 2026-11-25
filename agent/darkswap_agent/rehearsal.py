"""Broadcast the public rehearsal. This never talks to ShieldedPool."""

import json
import time
import urllib.request

SHIELD_SELECTOR = "70d39cff"
ATOMIC_SWAP_SELECTOR = "ed23a8e6"
WITHDRAW_TOKEN_SELECTOR = "50baa622"
NEXT_ID_SELECTOR = "61b8ce8c"
AMM_SELECTOR = "2a943945"
TOKEN_SELECTOR = "fc0c546a"
BALANCE_OF_SELECTOR = "70a08231"

PRIVACY_LINE = (
    "Public rehearsal. Owners and amounts are visible. "
    "This is not a type 0x77 shielded transfer and not ShieldedPool."
)


class RehearsalError(RuntimeError):
    pass


def _word(value: int) -> str:
    if value < 0:
        raise RehearsalError("negative abi word")
    return f"{value:064x}"


def shield_calldata() -> str:
    return "0x" + SHIELD_SELECTOR


def atomic_swap_calldata(note_id: int, min_tokens: int) -> str:
    return "0x" + ATOMIC_SWAP_SELECTOR + _word(note_id) + _word(min_tokens)


def withdraw_token_calldata(note_id: int) -> str:
    return "0x" + WITHDRAW_TOKEN_SELECTOR + _word(note_id)


def plan_calls(note_id: int) -> list[dict[str, str | int]]:
    token_note = note_id + 1
    return [
        {"name": "shield", "data": shield_calldata(), "value_field": "amount"},
        {"name": "atomicSwap", "data": atomic_swap_calldata(note_id, 0), "value_field": "0"},
        {"name": "withdrawToken", "data": withdraw_token_calldata(token_note), "value_field": "0"},
    ]


def rpc_call(url: str, method: str, params: list[object]) -> object:
    request = urllib.request.Request(
        url,
        data=json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode(),
        headers={"content-type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        body = json.load(response)
    if "error" in body:
        raise RehearsalError(str(body["error"]))
    return body.get("result")


def _as_hex_int(value: object, label: str) -> int:
    if not isinstance(value, str) or not value.startswith("0x"):
        raise RehearsalError(f"{label} was not hex")
    return int(value, 16)


def _call(url: str, to: str, data: str) -> str:
    result = rpc_call(url, "eth_call", [{"to": to, "data": data}, "latest"])
    if not isinstance(result, str):
        raise RehearsalError("eth_call returned no data")
    return result


def _send(url: str, sender: str, to: str, data: str, value: int) -> str:
    result = rpc_call(
        url,
        "eth_sendTransaction",
        [{"from": sender, "to": to, "data": data, "value": hex(value), "gas": hex(900_000)}],
    )
    if not isinstance(result, str) or not result.startswith("0x"):
        raise RehearsalError("eth_sendTransaction returned no hash")
    return result


def _wait(url: str, tx_hash: str) -> None:
    for _ in range(30):
        receipt = rpc_call(url, "eth_getTransactionReceipt", [tx_hash])
        if receipt is None:
            time.sleep(0.15)
            continue
        if not isinstance(receipt, dict):
            raise RehearsalError("receipt had an unexpected shape")
        if _as_hex_int(receipt.get("status"), "status") != 1:
            raise RehearsalError(f"reverted: {tx_hash}")
        return
    raise RehearsalError(f"timed out waiting for {tx_hash}")


def run_rehearsal(url: str, rehearsal: str, sender: str, amount_wei: int) -> dict[str, str | int]:
    """Shield, swap, and withdraw on a node whose sender is unlocked (anvil)."""
    note_id = _as_hex_int(_call(url, rehearsal, "0x" + NEXT_ID_SELECTOR), "nextId")
    shield_hash = _send(url, sender, rehearsal, shield_calldata(), amount_wei)
    _wait(url, shield_hash)
    swap_hash = _send(url, sender, rehearsal, atomic_swap_calldata(note_id, 0), 0)
    _wait(url, swap_hash)
    token_note = note_id + 1
    withdraw_hash = _send(url, sender, rehearsal, withdraw_token_calldata(token_note), 0)
    _wait(url, withdraw_hash)
    amm = "0x" + _call(url, rehearsal, "0x" + AMM_SELECTOR)[-40:]
    token = "0x" + _call(url, amm, "0x" + TOKEN_SELECTOR)[-40:]
    balance = _as_hex_int(
        _call(url, token, "0x" + BALANCE_OF_SELECTOR + _word(int(sender, 16))),
        "balance",
    )
    return {
        "bnb_note": note_id,
        "token_note": token_note,
        "token": token,
        "token_balance_wei": balance,
        "transactions": f"{shield_hash},{swap_hash},{withdraw_hash}",
        "privacy": PRIVACY_LINE,
    }
