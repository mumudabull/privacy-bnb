/** Implied BNB/USD from an AMM quote. 1 rNOTE is treated as 1 USD. */

export function impliedBnbUsdWei(amountIn: bigint, amountOut: bigint): bigint {
  if (amountIn === 0n) return 0n;
  return (amountOut * 10n ** 18n) / amountIn;
}

export function deviationBps(left: bigint, right: bigint): bigint {
  if (right <= 0n) return 10_000n;
  const diff = left > right ? left - right : right - left;
  return (diff * 10_000n) / right;
}

export function usdToWei(price: string): bigint | null {
  if (!/^\d+(\.\d+)?$/.test(price)) return null;
  const [whole, fraction = ""] = price.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0").slice(0, 18) || "0");
}

export type MarketDecision = "pass" | "refuse" | "skipped" | "unavailable";

export function decideMarket(
  ammPriceWei: bigint,
  referenceWei: bigint | null,
  maxBps: bigint,
): { status: MarketDecision; deviationBps: bigint | null } {
  if (referenceWei === null) return { status: "skipped", deviationBps: null };
  if (referenceWei <= 0n) return { status: "unavailable", deviationBps: null };
  const bps = deviationBps(ammPriceWei, referenceWei);
  return { status: bps <= maxBps ? "pass" : "refuse", deviationBps: bps };
}
