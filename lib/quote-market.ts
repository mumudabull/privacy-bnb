/**
 * Quote decision that puts the on-chain Atlas BNB/USD print next to CoinMarketCap.
 * CMC stays skipped when no key is configured. Atlas needs no key.
 */

import { ATLAS_BNB_USD_FEED, ATLAS_EXPLORER, readAtlasFeed, type AtlasRead } from "./atlas";
import { readMarketCheck, type MarketCheck } from "./cmc";
import { impliedBnbUsdWei } from "./market";
import { DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN } from "./quote";
import type { MarketSummary } from "./agent-quote";

export type QuoteMarket = MarketCheck & {
  cmcDecision: MarketSummary["cmcDecision"];
  atlas: AtlasRead;
};

export async function readQuoteMarket(): Promise<QuoteMarket> {
  const implied = impliedBnbUsdWei(DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN);
  const cmc = await readMarketCheck();
  const maxBps = BigInt(cmc.maxDeviationBps);
  const atlas = await readAtlasFeed(implied, maxBps);
  const decision = combine(cmc.decision, atlas.status);
  const deviationBps = atlas.deviationBps ?? cmc.deviationBps;
  return {
    ...cmc,
    decision,
    cmcDecision: cmc.decision,
    deviationBps,
    atlas,
    detail: describe(cmc, atlas, decision),
  };
}

function combine(cmc: MarketCheck["decision"], atlas: AtlasRead["status"]): MarketCheck["decision"] {
  if (atlas === "refuse" || cmc === "refuse") return "refuse";
  if (atlas === "pass" && (cmc === "pass" || cmc === "skipped")) return "pass";
  if (atlas === "stale" || atlas === "unavailable") return "unavailable";
  return cmc;
}

function describe(cmc: MarketCheck, atlas: AtlasRead, decision: MarketCheck["decision"]): string {
  const atlasLine =
    atlas.priceUsd === null
      ? "Atlas BNB/USD could not be read on chain."
      : `Atlas BNB/USD is ${atlas.priceUsd}, ${atlas.deviationBps} bps from the pool.`;
  const cmcLine =
    cmc.decision === "skipped"
      ? "CoinMarketCap was not requested."
      : cmc.decision === "pass" || cmc.decision === "refuse"
        ? `CoinMarketCap is ${cmc.cmcUsd}.`
        : "CoinMarketCap did not return a price.";
  const verdict =
    decision === "pass"
      ? "Inside the band."
      : decision === "refuse"
        ? "Outside the band. The quote is refused."
        : "The on-chain check did not complete.";
  return `${atlasLine} ${cmcLine} ${verdict} Feed ${ATLAS_BNB_USD_FEED}, confirmed by the Atlas team.`;
}

export { ATLAS_BNB_USD_FEED, ATLAS_EXPLORER };
