import { createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { decideMarket, impliedBnbUsdWei, usdToWei, type MarketDecision } from "./market";
import { DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN, quoteExactIn } from "./quote";

const ENDPOINT = "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest";
const QUERY = "symbol=BNB&convert=USD";
const PRICE = /"USD"\s*:\s*\{[^{}]*"price"\s*:\s*([0-9]+(?:\.[0-9]+)?)/;

export type MarketCheck = {
  decision: MarketDecision;
  ammImpliedUsd: string;
  cmcUsd: string | null;
  deviationBps: string | null;
  maxDeviationBps: number;
  httpStatus: number | null;
  responseSha256: string | null;
  detail: string;
};

function logFile(): string {
  return process.env.CMC_LOG_PATH?.trim() || path.join(process.cwd(), "agent", "logs", "cmc-requests.jsonl");
}

function formatUsd(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const fraction = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 2);
  return `${whole.toString()}.${fraction}`;
}

async function writeLog(record: Record<string, string | number | null>): Promise<void> {
  const file = logFile();
  try {
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, `${JSON.stringify(record)}\n`, "utf8");
  } catch {
    // A read-only deploy still shows the price. The agent log is the proof file.
  }
}

export async function readMarketCheck(): Promise<MarketCheck> {
  const amountIn = 10n ** 17n;
  const amountOut = quoteExactIn(amountIn, DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN);
  const implied = impliedBnbUsdWei(amountIn, amountOut);
  const maxDeviationBps = Number(process.env.CMC_MAX_DEVIATION_BPS ?? "500");
  const maxBps = Number.isInteger(maxDeviationBps) && maxDeviationBps >= 0 ? BigInt(maxDeviationBps) : 500n;
  const base = {
    ammImpliedUsd: formatUsd(implied),
    maxDeviationBps: Number(maxBps),
    cmcUsd: null,
    deviationBps: null,
    httpStatus: null,
    responseSha256: null,
  };
  const key = process.env.CMC_API_KEY?.trim();
  if (!key) {
    return {
      ...base,
      decision: "skipped",
      detail: "CMC_API_KEY is unset. No request was sent.",
    };
  }

  let status = 0;
  let body = "";
  try {
    const response = await fetch(`${ENDPOINT}?${QUERY}`, {
      headers: { Accept: "application/json", "X-CMC_PRO_API_KEY": key },
      next: { revalidate: 60 },
    });
    status = response.status;
    body = await response.text();
  } catch {
    await writeLog({
      timestamp: new Date().toISOString(),
      endpoint: ENDPOINT,
      query: QUERY,
      status: 0,
      price_usd: null,
      response_sha256: null,
    });
    return { ...base, decision: "unavailable", detail: "CoinMarketCap could not be reached." };
  }

  const digest = createHash("sha256").update(body).digest("hex");
  const price = status === 200 ? (PRICE.exec(body)?.[1] ?? null) : null;
  await writeLog({
    timestamp: new Date().toISOString(),
    endpoint: ENDPOINT,
    query: QUERY,
    status,
    price_usd: price,
    response_sha256: digest,
  });
  const reference = price ? usdToWei(price) : null;
  const decided = decideMarket(implied, reference, maxBps);
  return {
    ...base,
    decision: price ? decided.status : "unavailable",
    cmcUsd: price,
    deviationBps: decided.deviationBps === null ? null : decided.deviationBps.toString(),
    httpStatus: status,
    responseSha256: digest,
    detail: price
      ? "Compared with the seed AMM, treating 1 rNOTE as 1 USD."
      : "CoinMarketCap did not return a BNB/USD price.",
  };
}
