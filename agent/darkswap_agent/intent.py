from dataclasses import dataclass
import re

_AMOUNT = re.compile(r"swap\s+(\d+(?:\.\d{1,18})?)\s+bnb\b", re.IGNORECASE)
_ASSET = re.compile(r"\bto\s+(.+)$", re.IGNORECASE)
_PRIVATE = re.compile(r"private", re.IGNORECASE)
_TRAILING_PRIVATELY = re.compile(r",?\s*privately\s*$", re.IGNORECASE)


class IntentError(ValueError):
    """The sentence is not a swap intent this agent accepts."""


@dataclass(frozen=True)
class SwapIntent:
    amount_wei: int
    asset_out: str
    private: bool
    raw: str


def decimal_to_wei(amount: str) -> int:
    whole, _, fraction = amount.partition(".")
    if fraction and len(fraction) > 18:
        raise IntentError("BNB amounts support at most 18 decimal places")
    return int(whole) * 10**18 + int(fraction.ljust(18, "0") or "0")


def parse_intent(text: str) -> SwapIntent:
    raw = text.strip()
    amount_match = _AMOUNT.search(raw)
    if amount_match is None:
        raise IntentError("Say it as: swap 0.04 bnb to rNOTE privately")
    amount_wei = decimal_to_wei(amount_match.group(1))
    if amount_wei == 0:
        raise IntentError("Amount must be above zero")
    asset = "rNOTE"
    asset_match = _ASSET.search(raw)
    if asset_match is not None:
        asset = _TRAILING_PRIVATELY.sub("", asset_match.group(1)).strip(" .,")
    if not asset:
        raise IntentError("Name the asset after 'to'")
    return SwapIntent(
        amount_wei=amount_wei,
        asset_out=asset,
        private=bool(_PRIVATE.search(raw)),
        raw=raw,
    )
