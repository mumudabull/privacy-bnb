/**
 * File: lib/agent-quote.ts
 * Purpose: Builds the agent's quote-only answer for a swap sentence: parse the
 * intent, quote the seed pool, apply the execution cap, and attach the market
 * check. Mirrors the quote path of agent/darkswap_agent/service.py. It never
 * signs or broadcasts; the hosted endpoint holds no key.
 */

import { formatBnb } from "./format.ts";
import { parseIntent } from "./intent.ts";
import type { MarketDecision } from "./market.ts";
import {
  DEMO_RESERVE_BNB,
  DEMO_RESERVE_TOKEN,
  EXECUTION_CAP_WEI,
  priceImpactBps,
  quoteExactIn,
} from "./quote.ts";

/** Identical to PRIVACY_LINE in agent/darkswap_agent/rehearsal.py. */
export const PRIVACY_LINE =
  "Public rehearsal. Owners and amounts are visible. " +
  "This is not a type 0x77 shielded transfer and not ShieldedPool.";

const EXECUTABLE_ASSETS = new Set(["rnote", "the demo token"]);

/** CoinMarketCap plus the on-chain Atlas print used by a quote. */
export type MarketSummary = {
  decision: MarketDecision;
  cmcDecision: MarketDecision;
  ammImpliedUsd: string;
  cmcUsd: string | null;
  deviationBps: string | null;
  maxDeviationBps: number;
  detail: string;
  reserveBnbWei?: string | null;
  reserveTokenWei?: string | null;
  capWei?: string;
  cmcHttpStatus?: number | null;
  cmcFetchedAt?: string | null;
  cmcSha256?: string | null;
  riskScore?: number | null;
  riskTier?: string | null;
  atlas: {
    status: "pass" | "refuse" | "stale" | "unavailable";
    priceUsd: string | null;
    deviationBps: string | null;
    decimals: number | null;
    updatedAt: number | null;
    roundId: string | null;
    feed: string;
    explorer: string;
  };
};

export type AgentQuoteStatus = "quoted" | "refused" | "market_refused" | "rejected";

export type AgentQuote = {
  status: AgentQuoteStatus;
  reason?: string;
  privacy: string;
  amountBnb?: string;
  amountWei?: string;
  assetOut?: string;
  assetNote?: string;
  privateRequested?: boolean;
  quoteRnote?: string;
  quoteRnoteWei?: string;
  priceImpactBps?: string | null;
  executionCapBnb?: string;
  pool?: string;
  market?: MarketSummary;
};

/**
 * Decision order matches the Python agent: a malformed sentence is rejected,
 * an amount above the cap is refused (with the quote still attached), and
 * only then can the market band turn a quote into a market refusal.
 * Wei values are strings because JSON has no 256-bit integer.
 */
export function buildAgentQuote(
  intentText: string,
  market: MarketSummary,
  executionCapWei: bigint = EXECUTION_CAP_WEI,
): AgentQuote {
  const parsed = parseIntent(intentText);
  if (!parsed.ok) {
    return { status: "rejected", reason: parsed.reason, privacy: PRIVACY_LINE };
  }
  const { intent } = parsed;
  const reserves = reservesOf(market);
  if (!reserves) {
    return {
      status: "rejected",
      reason: "The BSC testnet DemoAMM reserves could not be read.",
      privacy: PRIVACY_LINE,
      market,
    };
  }
  const capWei = market.capWei ? BigInt(market.capWei) : executionCapWei;
  const quotedWei = quoteExactIn(intent.amountWei, reserves.bnb, reserves.token);
  const impact = priceImpactBps(intent.amountWei, reserves.bnb, reserves.token);

  const quote: AgentQuote = {
    status: "quoted",
    privacy: PRIVACY_LINE,
    amountBnb: formatBnb(intent.amountWei, 6),
    amountWei: intent.amountWei.toString(),
    assetOut: intent.assetOut,
    privateRequested: intent.privateRequested,
    quoteRnote: formatBnb(quotedWei, 6),
    quoteRnoteWei: quotedWei.toString(),
    priceImpactBps: impact === null ? null : impact.toString(),
    executionCapBnb: formatBnb(capWei, 6),
    pool: `DemoAMM ${formatBnb(reserves.bnb, 6)} BNB / ${formatBnb(reserves.token, 6)} rNOTE`,
    market,
  };

  if (!EXECUTABLE_ASSETS.has(intent.assetOut.toLowerCase())) {
    quote.assetNote = `${intent.assetOut} is not executable. This rehearsal only swaps BNB for rNOTE.`;
  }
  if (intent.amountWei > capWei) {
    quote.status = "refused";
    quote.reason =
      capWei === 0n
        ? "Risk tier is quote-only. The quote is shown and nothing is executed."
        : `Above the ${formatBnb(capWei, 6)} BNB execution cap. Quote only.`;
    return quote;
  }
  if (market.decision === "refuse") {
    quote.status = "market_refused";
    quote.reason = market.detail;
  }
  return quote;
}

function reservesOf(market: MarketSummary): { bnb: bigint; token: bigint } | null {
  if (market.reserveBnbWei === undefined && market.reserveTokenWei === undefined) {
    return { bnb: DEMO_RESERVE_BNB, token: DEMO_RESERVE_TOKEN };
  }
  if (!market.reserveBnbWei || !market.reserveTokenWei) return null;
  return { bnb: BigInt(market.reserveBnbWei), token: BigInt(market.reserveTokenWei) };
}
