/** Same 30 bps constant-product quote as contracts/src/SwapMath.sol. */

export const FEE_BPS = 30n;
export const BPS = 10_000n;

/** Seed used by Deploy.s.sol when AMM_*_LIQUIDITY is unset. About 555 rNOTE per BNB. */
export const DEMO_RNOTE_PER_BNB = 555n;
export const DEMO_RESERVE_BNB = 10n * 10n ** 18n;
export const DEMO_RESERVE_TOKEN = DEMO_RNOTE_PER_BNB * DEMO_RESERVE_BNB;

/** Agent execution cap until a funded testnet deployer is configured. */
export const EXECUTION_CAP_WEI = 5n * 10n ** 16n;

export function quoteExactIn(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return 0n;
  const inWithFee = amountIn * (BPS - FEE_BPS);
  return (inWithFee * reserveOut) / (reserveIn * BPS + inWithFee);
}

export function parseBnbInput(raw: string): bigint | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d{0,18})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const wei = BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0") || "0");
  return wei;
}
