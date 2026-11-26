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
  DEMO_RNOTE_PER_BNB,
  EXECUTION_CAP_WEI,
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
  const quotedWei = quoteExactIn(intent.amountWei, DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN);

  const quote: AgentQuote = {
    status: "quoted",
    privacy: PRIVACY_LINE,
    amountBnb: formatBnb(intent.amountWei, 6),
    amountWei: intent.amountWei.toString(),
    assetOut: intent.assetOut,
    privateRequested: intent.privateRequested,
    quoteRnote: formatBnb(quotedWei, 6),
    quoteRnoteWei: quotedWei.toString(),
    executionCapBnb: formatBnb(executionCapWei, 6),
    pool: `seed quote, 10 BNB / ${DEMO_RNOTE_PER_BNB * 10n} rNOTE, 0.30% fee`,
    market,
  };

  if (!EXECUTABLE_ASSETS.has(intent.assetOut.toLowerCase())) {
    quote.assetNote = `${intent.assetOut} is not executable. This rehearsal only swaps BNB for rNOTE.`;
  }
  if (intent.amountWei > executionCapWei) {
    quote.status = "refused";
    quote.reason = `Above the ${formatBnb(executionCapWei, 6)} BNB execution cap. Quote only.`;
    return quote;
  }
  if (market.decision === "refuse") {
    quote.status = "market_refused";
    quote.reason = market.detail;
  }
  return quote;
}
