"""Broadcast the public rehearsal. This never talks to ShieldedPool."""

import json
import time
import urllib.request

SHIELD_SELECTOR = "70d39cff"
ATOMIC_SWAP_SELECTOR = "ed23a8e6"
WITHDRAW_TOKEN_SELECTOR = "50baa622"
AMM_SELECTOR = "2a943945"
RESERVE_BNB_SELECTOR = "aed24cd3"
RESERVE_TOKEN_SELECTOR = "f4325d67"
TOKEN_SELECTOR = "fc0c546a"
BALANCE_OF_SELECTOR = "70a08231"
SHIELD_TOPIC = "0xe1a72de330fbbeca103cfbfdb343f632437bcf895b886ad5778478a146b9da43"
RESHIELD_TOPIC = "0x79464c7f93c1764087afd085253baf3a66da261c8c4979513402ba00ad036b88"
SWAP_TOPIC = "0x8eaf4d9925cc5467db759740de2bb3b9104a46cb90edfd3d8aa5bd465bcc0fc5"

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


def plan_calls(note_id: int, min_tokens: int) -> list[dict[str, str | int]]:
    return [
        {"name": "shield", "data": shield_calldata(), "value_field": "amount"},
        {
            "name": "atomicSwap",
            "data": atomic_swap_calldata(note_id, min_tokens),
            "min_tokens": min_tokens,
        },
        {"name": "withdrawToken", "data": "note id is taken from the RehearsalReshield log"},
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


def _wait(url: str, tx_hash: str) -> dict[str, object]:
    for _ in range(30):
        receipt = rpc_call(url, "eth_getTransactionReceipt", [tx_hash])
        if receipt is None:
            time.sleep(0.15)
            continue
        if not isinstance(receipt, dict):
            raise RehearsalError("receipt had an unexpected shape")
        if _as_hex_int(receipt.get("status"), "status") != 1:
            raise RehearsalError(f"reverted: {tx_hash}")
        return receipt
    raise RehearsalError(f"timed out waiting for {tx_hash}")


def _topic_value(receipt: dict[str, object], topic0: str, label: str) -> int:
    logs = receipt.get("logs")
    if not isinstance(logs, list):
        raise RehearsalError(f"{label} receipt had no logs")
    for entry in logs:
        if not isinstance(entry, dict):
            continue
        topics = entry.get("topics")
        if not isinstance(topics, list) or len(topics) < 2:
            continue
        if str(topics[0]).lower() == topic0.lower():
            return _as_hex_int(topics[1], label)
    raise RehearsalError(f"{label} log was not in the receipt")


def _swap_tokens_out(receipt: dict[str, object]) -> int:
    logs = receipt.get("logs")
    if not isinstance(logs, list):
        raise RehearsalError("swap receipt had no logs")
    for entry in logs:
        if not isinstance(entry, dict):
            continue
        topics = entry.get("topics")
        data = entry.get("data")
        if not isinstance(topics, list) or not topics or str(topics[0]).lower() != SWAP_TOPIC:
            continue
        if not isinstance(data, str) or not data.startswith("0x") or len(data) < 2 + 128:
            raise RehearsalError("swap log data was short")
        return int(data[-64:], 16)
    raise RehearsalError("swap log was not in the receipt")


def read_reserves(url: str, rehearsal: str) -> tuple[int, int]:
    amm = "0x" + _call(url, rehearsal, "0x" + AMM_SELECTOR)[-40:]
    reserve_bnb = _as_hex_int(_call(url, amm, "0x" + RESERVE_BNB_SELECTOR), "reserveBnb")
    reserve_token = _as_hex_int(_call(url, amm, "0x" + RESERVE_TOKEN_SELECTOR), "reserveToken")
    return reserve_bnb, reserve_token


def run_rehearsal(
    url: str, rehearsal: str, sender: str, amount_wei: int, min_tokens: int
) -> dict[str, str | int]:
    """Shield, swap, and withdraw on a node whose sender is unlocked (anvil)."""
    if min_tokens <= 0:
        raise RehearsalError("refusing to swap with a zero minimum output")
    shield_hash = _send(url, sender, rehearsal, shield_calldata(), amount_wei)
    shield_receipt = _wait(url, shield_hash)
    try:
        note_id = _topic_value(shield_receipt, SHIELD_TOPIC, "shield note")
    except RehearsalError as error:
        raise RehearsalError(f"{error}; shielded funds are in {shield_hash}") from error
    swap_hash = _send(url, sender, rehearsal, atomic_swap_calldata(note_id, min_tokens), 0)
    swap_receipt = _wait(url, swap_hash)
    token_note = _topic_value(swap_receipt, RESHIELD_TOPIC, "reshield note")
    tokens_out = _swap_tokens_out(swap_receipt)
    if tokens_out < min_tokens:
        raise RehearsalError(f"received {tokens_out}, below the minimum {min_tokens}")
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
        "tokens_out_wei": tokens_out,
        "token": token,
        "token_balance_wei": balance,
        "transactions": f"{shield_hash},{swap_hash},{withdraw_hash}",
        "privacy": PRIVACY_LINE,
    }
