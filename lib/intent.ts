/**
 * File: lib/intent.ts
 * Purpose: Parses a natural-language swap sentence ("swap 0.04 bnb to rNOTE
 * privately") into a structured intent. This is the TypeScript twin of
 * agent/darkswap_agent/intent.py; both must accept and reject the same
 * sentences so the hosted MCP endpoint and the Python agent agree.
 */

const AMOUNT_PATTERN = /swap\s+(\d+(?:\.\d{1,18})?)\s+bnb\b/i;
const ASSET_PATTERN = /\bto\s+(.+)$/i;
const PRIVATE_PATTERN = /private/i;
const TRAILING_PRIVATELY_PATTERN = /,?\s*privately\s*$/i;
const ASSET_EDGE_PUNCTUATION_PATTERN = /^[ .,]+|[ .,]+$/g;

/** Longest sentence the hosted endpoint will parse. Guards the regular expressions. */
export const MAXIMUM_INTENT_LENGTH = 280;

export const DEFAULT_ASSET_OUT = "rNOTE";

export type SwapIntent = {
  amountWei: bigint;
  assetOut: string;
  privateRequested: boolean;
  raw: string;
};

export type IntentParseResult =
  | { ok: true; intent: SwapIntent }
  | { ok: false; reason: string };

/** Converts a decimal BNB string with at most 18 fraction digits to wei. */
export function decimalBnbToWei(amount: string): bigint {
  const [wholePart, fractionPart = ""] = amount.split(".");
  return BigInt(wholePart) * 10n ** 18n + BigInt(fractionPart.padEnd(18, "0") || "0");
}

export function parseIntent(text: string): IntentParseResult {
  const raw = text.trim();
  if (raw.length > MAXIMUM_INTENT_LENGTH) {
    return { ok: false, reason: `Intent is longer than ${MAXIMUM_INTENT_LENGTH} characters` };
  }
  // A paragraph prompt can put the asset on the next line. The patterns are
  // single-line, so a newline would hide "USDT" and the default would become rNOTE.
  const sentence = raw.replace(/\s+/g, " ");

  const amountMatch = AMOUNT_PATTERN.exec(sentence);
  if (amountMatch === null) {
    return { ok: false, reason: "Say it as: swap 0.04 bnb to rNOTE privately" };
  }
  const amountWei = decimalBnbToWei(amountMatch[1]);
  if (amountWei === 0n) {
    return { ok: false, reason: "Amount must be above zero" };
  }

  // The asset is everything after the last-anchored "to", minus a trailing
  // "privately" and edge punctuation. A sentence with no "to" keeps the default.
  let assetOut = DEFAULT_ASSET_OUT;
  const assetMatch = ASSET_PATTERN.exec(sentence);
  if (assetMatch !== null) {
    assetOut = assetMatch[1]
      .replace(TRAILING_PRIVATELY_PATTERN, "")
      .replace(ASSET_EDGE_PUNCTUATION_PATTERN, "");
  }
  if (assetOut.length === 0) {
    return { ok: false, reason: "Name the asset after 'to'" };
  }

  return {
    ok: true,
    intent: {
      amountWei,
      assetOut,
      privateRequested: PRIVATE_PATTERN.test(sentence),
      raw,
    },
  };
}
