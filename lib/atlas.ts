/**
 * File: lib/atlas.ts
 * Purpose: Reads the Atlas BNB/USD SingleFeed on BNB Smart Chain testnet with
 * two eth_call requests (decimals and latestRoundData), checks that the round
 * is fresh, and compares the answer with the rehearsal pool's implied price.
 * This is the on-chain Atlas read shown in the market check. It needs no key
 * and sends no transaction.
 */

import { decideMarket, impliedBnbUsdWei, type MarketDecision } from "./market.ts";
import { DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN } from "./quote.ts";

/** Atlas SingleFeed BNB/USD on BSC testnet. `description()` returns "SingleFeed BNB/USD". */
export const ATLAS_BNB_USD_FEED = {
  address: "0x3957d289ee9C38272377786787ea34F9dd29788D",
  chainId: 97,
  networkName: "BNB Smart Chain testnet",
  explorerUrl: "https://testnet.bscscan.com/address/0x3957d289ee9C38272377786787ea34F9dd29788D",
} as const;

const DEFAULT_BSC_TESTNET_RPC_URL = "https://bsc-testnet-rpc.publicnode.com";
const DEFAULT_MAX_STALE_SECONDS = 3600;
const DEFAULT_MAX_DEVIATION_BPS = 500;

/** AggregatorV3Interface function selectors. */
const SELECTOR_DECIMALS = "0x313ce567";
const SELECTOR_LATEST_ROUND_DATA = "0xfeaf968c";

const ABI_WORD_HEX_LENGTH = 64;
const LATEST_ROUND_DATA_WORD_COUNT = 5;
const INT256_SIGN_BIT = 1n << 255n;
const UINT256_MODULUS = 1n << 256n;
const USD_WEI_DECIMALS = 18;

export type AtlasRound = {
  roundId: bigint;
  /** Signed, in the feed's own decimals. A feed can report zero or a negative value. */
  answer: bigint;
  startedAtSeconds: bigint;
  updatedAtSeconds: bigint;
  answeredInRound: bigint;
};

export type AtlasRead =
  | {
      ok: true;
      feedAddress: string;
      roundId: string;
      atlasUsd: string;
      ammImpliedUsd: string;
      updatedAtIso: string;
      ageSeconds: number;
      maxStaleSeconds: number;
      deviationBps: string | null;
      maxDeviationBps: number;
      decision: MarketDecision;
      detail: string;
    }
  | { ok: false; feedAddress: string; error: string };

/** Reads one unsigned 256-bit word at `wordIndex` from ABI-encoded return data. */
function readAbiWord(returnDataHex: string, wordIndex: number): bigint {
  const start = 2 + wordIndex * ABI_WORD_HEX_LENGTH;
  return BigInt(`0x${returnDataHex.slice(start, start + ABI_WORD_HEX_LENGTH)}`);
}

/**
 * Decodes latestRoundData(): (uint80 roundId, int256 answer, uint256 startedAt,
 * uint256 updatedAt, uint80 answeredInRound). The answer is two's complement,
 * so a word with the top bit set is a negative number, not a huge price.
 */
export function decodeLatestRoundData(returnDataHex: string): AtlasRound {
  const expectedHexLength = 2 + LATEST_ROUND_DATA_WORD_COUNT * ABI_WORD_HEX_LENGTH;
  if (!/^0x[0-9a-fA-F]*$/.test(returnDataHex) || returnDataHex.length !== expectedHexLength) {
    throw new Error("latestRoundData did not return five 32-byte words");
  }
  const rawAnswer = readAbiWord(returnDataHex, 1);
  return {
    roundId: readAbiWord(returnDataHex, 0),
    answer: rawAnswer >= INT256_SIGN_BIT ? rawAnswer - UINT256_MODULUS : rawAnswer,
    startedAtSeconds: readAbiWord(returnDataHex, 2),
    updatedAtSeconds: readAbiWord(returnDataHex, 3),
    answeredInRound: readAbiWord(returnDataHex, 4),
  };
}

/** Rescales a positive feed answer to 18 decimals so it compares with the pool's implied price. */
export function scaleAnswerToUsdWei(answer: bigint, feedDecimals: number): bigint {
  if (!Number.isInteger(feedDecimals) || feedDecimals < 0 || feedDecimals > 36) {
    throw new Error("feed decimals out of range");
  }
  if (feedDecimals === USD_WEI_DECIMALS) return answer;
  if (feedDecimals < USD_WEI_DECIMALS) return answer * 10n ** BigInt(USD_WEI_DECIMALS - feedDecimals);
  return answer / 10n ** BigInt(feedDecimals - USD_WEI_DECIMALS);
}

/** Two decimal places, truncated, the same way the CoinMarketCap card formats the pool price. */
export function formatUsdWei(usdWei: bigint): string {
  const whole = usdWei / 10n ** 18n;
  const cents = (usdWei % 10n ** 18n).toString().padStart(18, "0").slice(0, 2);
  return `${whole.toString()}.${cents}`;
}

/**
 * Mirrors the stale-round rules in PublicRehearsal.atomicSwap: a zero round, a
 * zero or future update time, or an age above the limit is not a usable price.
 */
export function describeStaleRound(
  round: AtlasRound,
  nowSeconds: bigint,
  maxStaleSeconds: bigint,
): string | null {
  if (round.roundId === 0n) return "The feed has no round yet.";
  if (round.updatedAtSeconds === 0n) return "The round has no update time.";
  if (round.updatedAtSeconds > nowSeconds) return "The round's update time is in the future.";
  if (nowSeconds - round.updatedAtSeconds > maxStaleSeconds) {
    return `The round is older than ${maxStaleSeconds.toString()} seconds.`;
  }
  return null;
}

function readPositiveIntegerSetting(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue ?? "");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveRpcUrl(): string {
  const configured = process.env.BSC_TESTNET_RPC_URL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BSC_TESTNET_RPC_URL;
}

async function ethCall(rpcUrl: string, contractAddress: string, callData: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: contractAddress, data: callData }, "latest"],
    }),
    signal: AbortSignal.timeout(8000),
    // Same cadence as the devnet receipt, so one page render shares one read.
    next: { revalidate: 15 },
  } as RequestInit);
  if (!response.ok) {
    throw new Error(`RPC answered HTTP ${response.status}`);
  }
  const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) {
    // A whitelist-gated feed reverts here until the caller is allowed.
    throw new Error(body.error.message ?? "RPC error");
  }
  if (typeof body.result !== "string" || !body.result.startsWith("0x")) {
    throw new Error("RPC result was not hex");
  }
  return body.result;
}

export async function readAtlasFeed(): Promise<AtlasRead> {
  const feedAddress = ATLAS_BNB_USD_FEED.address;
  const maxStaleSeconds = readPositiveIntegerSetting(process.env.MAX_STALE_SECONDS, DEFAULT_MAX_STALE_SECONDS);
  const maxDeviationBps = readPositiveIntegerSetting(process.env.MAX_DEVIATION_BPS, DEFAULT_MAX_DEVIATION_BPS);
  const impliedUsdWei = impliedBnbUsdWei(DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN);

  try {
    const rpcUrl = resolveRpcUrl();
    const [decimalsHex, roundHex] = await Promise.all([
      ethCall(rpcUrl, feedAddress, SELECTOR_DECIMALS),
      ethCall(rpcUrl, feedAddress, SELECTOR_LATEST_ROUND_DATA),
    ]);
    const feedDecimals = Number(BigInt(decimalsHex));
    const round = decodeLatestRoundData(roundHex);
    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    const ageSeconds = Number(nowSeconds - round.updatedAtSeconds);

    const shared = {
      ok: true as const,
      feedAddress,
      roundId: round.roundId.toString(),
      ammImpliedUsd: formatUsdWei(impliedUsdWei),
      updatedAtIso: new Date(Number(round.updatedAtSeconds) * 1000).toISOString(),
      ageSeconds,
      maxStaleSeconds,
      maxDeviationBps,
    };

    if (round.answer <= 0n) {
      return {
        ...shared,
        atlasUsd: "0.00",
        deviationBps: null,
        decision: "unavailable",
        detail: "The feed returned a price that is not positive.",
      };
    }
    const atlasUsdWei = scaleAnswerToUsdWei(round.answer, feedDecimals);
    const staleReason = describeStaleRound(round, nowSeconds, BigInt(maxStaleSeconds));
    if (staleReason) {
      return {
        ...shared,
        atlasUsd: formatUsdWei(atlasUsdWei),
        deviationBps: null,
        decision: "unavailable",
        detail: `${staleReason} The swap guard would revert on this round.`,
      };
    }

    const decided = decideMarket(impliedUsdWei, atlasUsdWei, BigInt(maxDeviationBps));
    return {
      ...shared,
      atlasUsd: formatUsdWei(atlasUsdWei),
      deviationBps: decided.deviationBps === null ? null : decided.deviationBps.toString(),
      decision: decided.status,
      detail: "Read on chain with latestRoundData. Compared with the seed pool spot, treating 1 rNOTE as 1 USD.",
    };
  } catch (failure) {
    return {
      ok: false,
      feedAddress,
      error: failure instanceof Error ? failure.message : "The feed could not be read.",
    };
  }
}
