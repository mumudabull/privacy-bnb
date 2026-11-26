/**
 * On-chain Atlas BNB/USD read. BSC testnet SingleFeed, confirmed by the Atlas
 * team. No API key. The answer is scaled with the feed's own decimals().
 */

export const ATLAS_BNB_USD_FEED = "0x3957d289ee9C38272377786787ea34F9dd29788D";
export const DEFAULT_BSC_TESTNET_RPC = "https://bsc-testnet-dataseed.bnbchain.org";
export const ATLAS_EXPLORER = `https://testnet.bscscan.com/address/${ATLAS_BNB_USD_FEED}`;

const DECIMALS_DATA = "0x313ce567";
const LATEST_ROUND_DATA = "0xfeaf968c";
const CACHE_MS = 30_000;

export type FeedRound = {
  roundId: bigint;
  answer: bigint;
  updatedAt: bigint;
  answeredInRound: bigint;
  decimals: number;
};

export type FeedAssessment =
  | { ok: true; priceWei: bigint }
  | { ok: false; reason: "stale" | "bad-price" };

export function scaleFeedAnswer(answer: bigint, decimals: number): bigint {
  if (decimals === 18) return answer;
  if (decimals < 18) return answer * 10n ** BigInt(18 - decimals);
  return answer / 10n ** BigInt(decimals - 18);
}

/** Matches PublicRehearsal._enforceOracle. roundId 1 is a valid round. */
export function assessFeed(round: FeedRound, nowSec: bigint, maxStaleSeconds: bigint): FeedAssessment {
  if (
    round.roundId === 0n ||
    round.updatedAt === 0n ||
    round.updatedAt > nowSec ||
    nowSec - round.updatedAt > maxStaleSeconds
  ) {
    return { ok: false, reason: "stale" };
  }
  if (round.answeredInRound !== 0n && round.answeredInRound < round.roundId) {
    return { ok: false, reason: "stale" };
  }
  if (round.answer <= 0n || round.decimals < 0 || round.decimals > 36) {
    return { ok: false, reason: "bad-price" };
  }
  const priceWei = scaleFeedAnswer(round.answer, round.decimals);
  if (priceWei <= 0n) return { ok: false, reason: "bad-price" };
  return { ok: true, priceWei };
}

export function decodeRound(decimalsWord: string, roundPayload: string): FeedRound | null {
  const decimals = wordAt(decimalsWord, 0);
  const roundId = wordAt(roundPayload, 0);
  const answer = signedWord(roundPayload, 1);
  const updatedAt = wordAt(roundPayload, 3);
  const answeredInRound = wordAt(roundPayload, 4);
  if (decimals === null || roundId === null || answer === null || updatedAt === null || answeredInRound === null) {
    return null;
  }
  return {
    roundId,
    answer,
    updatedAt,
    answeredInRound,
    decimals: Number(decimals),
  };
}

function wordAt(payload: string, index: number): bigint | null {
  const hex = payload.startsWith("0x") ? payload.slice(2) : payload;
  const start = index * 64;
  const word = hex.slice(start, start + 64);
  if (word.length !== 64) return null;
  return BigInt(`0x${word}`);
}

function signedWord(payload: string, index: number): bigint | null {
  const value = wordAt(payload, index);
  if (value === null) return null;
  const sign = 1n << 255n;
  return value >= sign ? value - (1n << 256n) : value;
}

type Cache = { at: number; feed: string; value: AtlasRead };
let cache: Cache | null = null;

export type AtlasRead = {
  status: "pass" | "refuse" | "stale" | "unavailable";
  priceUsd: string | null;
  priceWei: string | null;
  deviationBps: string | null;
  decimals: number | null;
  updatedAt: number | null;
  roundId: string | null;
  feed: string;
  explorer: string;
};

export async function readAtlasFeed(ammPriceWei: bigint, maxBps: bigint): Promise<AtlasRead> {
  const feed = (process.env.ORACLE_FEED?.trim() || ATLAS_BNB_USD_FEED).toLowerCase();
  const now = Date.now();
  if (cache && cache.feed === feed && now - cache.at < CACHE_MS) {
    return freshDeviation(cache.value, ammPriceWei, maxBps);
  }
  const read = await fetchFeed(feed, ammPriceWei, maxBps);
  if (read.status !== "unavailable") cache = { at: now, feed, value: read };
  return read;
}

function freshDeviation(read: AtlasRead, ammPriceWei: bigint, maxBps: bigint): AtlasRead {
  if (read.priceWei === null || read.status === "stale" || read.status === "unavailable") return read;
  const gap = gapBps(ammPriceWei, BigInt(read.priceWei));
  return { ...read, deviationBps: gap.toString(), status: gap <= maxBps ? "pass" : "refuse" };
}

async function fetchFeed(feed: string, ammPriceWei: bigint, maxBps: bigint): Promise<AtlasRead> {
  const base: AtlasRead = {
    status: "unavailable",
    priceUsd: null,
    priceWei: null,
    deviationBps: null,
    decimals: null,
    updatedAt: null,
    roundId: null,
    feed: checksumFeed(feed),
    explorer: `https://testnet.bscscan.com/address/${checksumFeed(feed)}`,
  };
  const rpc = process.env.RPC_URL_BSC_TESTNET?.trim() || DEFAULT_BSC_TESTNET_RPC;
  let decimalsPayload = "";
  let roundPayload = "";
  try {
    const response = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify([
        { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: feed, data: DECIMALS_DATA }, "latest"] },
        { jsonrpc: "2.0", id: 2, method: "eth_call", params: [{ to: feed, data: LATEST_ROUND_DATA }, "latest"] },
      ]),
    });
    const body = (await response.json()) as { id?: number; result?: string }[];
    if (!Array.isArray(body)) return base;
    decimalsPayload = body.find((item) => item.id === 1)?.result ?? "";
    roundPayload = body.find((item) => item.id === 2)?.result ?? "";
  } catch {
    return base;
  }
  const round = decodeRound(decimalsPayload, roundPayload);
  if (!round) return base;
  const maxStale = staleSeconds();
  const assessed = assessFeed(round, BigInt(Math.floor(Date.now() / 1000)), maxStale);
  const shared = {
    ...base,
    decimals: round.decimals,
    updatedAt: Number(round.updatedAt),
    roundId: round.roundId.toString(),
  };
  if (!assessed.ok) return { ...shared, status: assessed.reason === "stale" ? "stale" : "unavailable" };
  const gap = gapBps(ammPriceWei, assessed.priceWei);
  return {
    ...shared,
    status: gap <= maxBps ? "pass" : "refuse",
    priceWei: assessed.priceWei.toString(),
    priceUsd: formatFeedUsd(assessed.priceWei),
    deviationBps: gap.toString(),
  };
}

function staleSeconds(): bigint {
  const raw = Number(process.env.MAX_STALE_SECONDS ?? "3600");
  return Number.isInteger(raw) && raw >= 0 ? BigInt(raw) : 3600n;
}

function gapBps(left: bigint, right: bigint): bigint {
  if (right <= 0n) return 10_000n;
  const diff = left > right ? left - right : right - left;
  return (diff * 10_000n) / right;
}

export function formatFeedUsd(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const fraction = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 2);
  return `${whole.toString()}.${fraction}`;
}

function checksumFeed(feed: string): string {
  return feed.toLowerCase() === ATLAS_BNB_USD_FEED.toLowerCase() ? ATLAS_BNB_USD_FEED : feed;
}
