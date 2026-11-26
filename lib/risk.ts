/**
 * CMC risk score. The bands below are design choices for this hackathon build.
 * They are not a backtest.
 *
 * Each input adds the highest matching band, then the total is capped at 100.
 * A missing input adds nothing: an unread field is not treated as an extreme.
 *
 * | input | bands (absolute value, except fear and greed) | points |
 * | 1h move | 2 / 4 / 8 | 8 / 16 / 24 |
 * | 24h move | 5 / 10 / 20 | 8 / 16 / 24 |
 * | 7d move | 15 / 30 | 6 / 12 |
 * | 24h volume change | 25 / 80 | 6 / 12 |
 * | fear and greed distance from 50 | 20 / 35 | 8 / 16 |
 * | global market-cap 24h change | 2 / 5 | 6 / 12 |
 *
 * Tiers, applied on top of the on-chain guard (500 bps, 0.05 BNB, 3600s):
 * 0-39 normal: 500 bps, 0.05 BNB
 * 40-69 caution: 250 bps, 0.02 BNB
 * 70-100 quote-only: 100 bps, no execution
 */

export const BASE_MAX_DEVIATION_BPS = 500;
export const BASE_CAP_WEI = 5n * 10n ** 16n;
export const ORACLE_MAX_STALE_SECONDS = 3600;

export type RiskTier = "normal" | "caution" | "quote-only";

export type RiskInputs = {
  change1h: number | null;
  change24h: number | null;
  change7d: number | null;
  volumeChange24h: number | null;
  fearGreed: number | null;
  marketCapChange24h: number | null;
};

export type RiskAssessment = {
  score: number;
  tier: RiskTier;
  maxDeviationBps: number;
  capWei: bigint;
};

const BANDS: Array<{ key: keyof RiskInputs; steps: Array<[number, number]>; fear?: boolean }> = [
  { key: "change1h", steps: [[2, 8], [4, 16], [8, 24]] },
  { key: "change24h", steps: [[5, 8], [10, 16], [20, 24]] },
  { key: "change7d", steps: [[15, 6], [30, 12]] },
  { key: "volumeChange24h", steps: [[25, 6], [80, 12]] },
  { key: "fearGreed", steps: [[20, 8], [35, 16]], fear: true },
  { key: "marketCapChange24h", steps: [[2, 6], [5, 12]] },
];

function pointsFor(value: number | null, steps: Array<[number, number]>, fear = false): number {
  if (value === null || Number.isNaN(value)) return 0;
  const magnitude = fear ? Math.abs(value - 50) : Math.abs(value);
  let points = 0;
  for (const [threshold, score] of steps) {
    if (magnitude >= threshold) points = score;
  }
  return points;
}

export function assessRisk(inputs: RiskInputs): RiskAssessment {
  const raw = BANDS.reduce((sum, band) => sum + pointsFor(inputs[band.key], band.steps, band.fear), 0);
  const score = Math.min(100, raw);
  if (score >= 70) {
    return { score, tier: "quote-only", maxDeviationBps: 100, capWei: 0n };
  }
  if (score >= 40) {
    return { score, tier: "caution", maxDeviationBps: 250, capWei: 2n * 10n ** 16n };
  }
  return { score, tier: "normal", maxDeviationBps: BASE_MAX_DEVIATION_BPS, capWei: BASE_CAP_WEI };
}
