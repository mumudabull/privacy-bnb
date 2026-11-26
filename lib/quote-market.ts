/**
 * Quote decision: live DemoAMM spot, Atlas on-chain price, and CoinMarketCap.
 * The risk score, when CMC is configured, tightens the 500 bps band and the 0.05 BNB cap.
 */

import { ATLAS_BNB_USD_FEED, ATLAS_EXPLORER, readAtlasFeed, type AtlasRead } from "./atlas";
import { CMC_KEY_MISSING, readMarketCheck, type MarketCheck } from "./cmc";
import { impliedBnbUsdWei } from "./market";
import { readDemoPool, type PoolSnapshot } from "./pool";
import { BASE_CAP_WEI, BASE_MAX_DEVIATION_BPS, ORACLE_MAX_STALE_SECONDS } from "./risk";
import type { MarketSummary } from "./agent-quote";

export type QuoteMarket = MarketCheck & {
  cmcDecision: MarketSummary["cmcDecision"];
  atlas: AtlasRead;
  pool: PoolSnapshot;
  reserveBnbWei: string | null;
  reserveTokenWei: string | null;
  cmcHttpStatus: number | null;
  cmcFetchedAt: string | null;
  cmcSha256: string | null;
};

const UNREAD_ATLAS: AtlasRead = {
  status: "unavailable",
  priceUsd: null,
  priceWei: null,
  deviationBps: null,
  decimals: null,
  updatedAt: null,
  roundId: null,
  feed: ATLAS_BNB_USD_FEED,
  explorer: ATLAS_EXPLORER,
};

export async function readQuoteMarket(): Promise<QuoteMarket> {
  const pool = await readDemoPool();
  const implied = pool.ok ? impliedBnbUsdWei(pool.reserveBnb, pool.reserveToken) : 0n;
  const cmc = await readMarketCheck(implied);
  const maxBps = BigInt(cmc.maxDeviationBps);
  const atlas = pool.ok ? await readAtlasFeed(implied, maxBps) : UNREAD_ATLAS;
  const decision = pool.ok ? combine(cmc.decision, atlas.status) : "unavailable";
  return {
    ...cmc,
    ammImpliedUsd: pool.ok ? cmc.ammImpliedUsd : "unread",
    decision,
    cmcDecision: cmc.decision,
    deviationBps: atlas.deviationBps,
    atlas,
    pool,
    reserveBnbWei: pool.ok ? pool.reserveBnb.toString() : null,
    reserveTokenWei: pool.ok ? pool.reserveToken.toString() : null,
    cmcHttpStatus: cmc.httpStatus,
    cmcFetchedAt: cmc.fetchedAt,
    cmcSha256: cmc.sha256Short,
    detail: describe(cmc, atlas, decision, pool.ok),
  };
}

function combine(cmc: MarketCheck["decision"], atlas: AtlasRead["status"]): MarketCheck["decision"] {
  if (atlas === "refuse" || cmc === "refuse") return "refuse";
  if (atlas === "pass" && (cmc === "pass" || cmc === "skipped")) return "pass";
  if (atlas === "stale" || atlas === "unavailable") return "unavailable";
  return cmc;
}

function describe(cmc: MarketCheck, atlas: AtlasRead, decision: MarketCheck["decision"], poolOk: boolean): string {
  const pool = poolOk ? `Pool spot ${cmc.ammImpliedUsd}.` : "Pool reserves were not read.";
  const atlasLine =
    atlas.priceUsd === null
      ? "Atlas was not read."
      : `Atlas ${atlas.priceUsd}, gap ${atlas.deviationBps} bps, limit ${cmc.maxDeviationBps} bps, stale after ${ORACLE_MAX_STALE_SECONDS}s.`;
  const cmcLine =
    cmc.decision === "skipped"
      ? CMC_KEY_MISSING
      : `CMC ${cmc.cmcUsd ?? "unread"}, HTTP ${cmc.httpStatus ?? 0}, ${cmc.fetchedAt ?? "unread"}, sha ${cmc.sha256Short ?? "unread"}.`;
  const risk =
    cmc.riskScore === null
      ? `Risk unread. Band ${BASE_MAX_DEVIATION_BPS} bps, cap ${formatCap(BASE_CAP_WEI)} BNB.`
      : `Risk ${cmc.riskScore} ${cmc.riskTier}. Band ${cmc.maxDeviationBps} bps, cap ${formatCap(BigInt(cmc.capWei))} BNB.`;
  const verdict =
    decision === "pass" ? "Pass." : decision === "refuse" ? "Refuse." : "No pass.";
  return `${pool} ${atlasLine} ${cmcLine} ${risk} ${verdict}`;
}

function formatCap(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const fraction = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

export { ATLAS_BNB_USD_FEED, ATLAS_EXPLORER };
