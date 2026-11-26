import { createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { decideMarket, impliedBnbUsdWei, usdToWei, type MarketDecision } from "./market";
import { assessRisk, BASE_CAP_WEI, BASE_MAX_DEVIATION_BPS, type RiskInputs, type RiskTier } from "./risk";

const QUOTES_PATH = "/v1/cryptocurrency/quotes/latest?symbol=BNB&convert=USD";
const FEAR_PATH = "/v3/fear-and-greed/latest";
const GLOBAL_PATH = "/v1/global-metrics/quotes/latest";
const ORIGIN = "https://pro-api.coinmarketcap.com";
const MEMORY_MS = 60_000;
export const CMC_KEY_MISSING = "cmc: key not configured";

let memory: { at: number; key: string; value: MarketCheck } | null = null;

export type MarketCheck = {
  decision: MarketDecision;
  ammImpliedUsd: string;
  cmcUsd: string | null;
  cmcLabel: string;
  deviationBps: string | null;
  maxDeviationBps: number;
  httpStatus: number | null;
  fetchedAt: string | null;
  responseSha256: string | null;
  sha256Short: string | null;
  detail: string;
  riskScore: number | null;
  riskTier: RiskTier | "unread";
  riskInputs: RiskInputs | null;
  capWei: string;
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

export async function readMarketCheck(impliedWei: bigint): Promise<MarketCheck> {
  const key = process.env.CMC_API_KEY?.trim();
  if (!key) {
    return blank(impliedWei, {
      decision: "skipped",
      cmcLabel: CMC_KEY_MISSING,
      detail: CMC_KEY_MISSING,
    });
  }
  if (memory && memory.key === key && Date.now() - memory.at < MEMORY_MS) {
    return retarget(memory.value, impliedWei);
  }

  const fetchedAt = new Date().toISOString();
  const [quotes, fear, global] = await Promise.all([
    cmcGet(QUOTES_PATH, key),
    cmcGet(FEAR_PATH, key),
    cmcGet(GLOBAL_PATH, key),
  ]);
  const digest = createHash("sha256").update(quotes.body).digest("hex");
  const parsed = quotes.status === 200 ? parseQuote(quotes.body) : null;
  const inputs = riskInputs(parsed, fear.status === 200 ? fear.body : "", global.status === 200 ? global.body : "");
  const risk = assessRisk(inputs);
  await writeLog({
    timestamp: fetchedAt,
    endpoint: `${ORIGIN}${QUOTES_PATH}`,
    status: quotes.status,
    price_usd: parsed?.price ?? null,
    response_sha256: digest,
  });
  const reference = parsed ? usdToWei(parsed.price) : null;
  const decided = decideMarket(impliedWei, reference, BigInt(risk.maxDeviationBps));
  const value = blank(impliedWei, {
    decision: parsed ? decided.status : "unavailable",
    cmcUsd: parsed?.price ?? null,
    cmcLabel: parsed?.price ?? "cmc: no price",
    deviationBps: decided.deviationBps === null ? null : decided.deviationBps.toString(),
    maxDeviationBps: risk.maxDeviationBps,
    httpStatus: quotes.status,
    fetchedAt,
    responseSha256: digest,
    sha256Short: digest.slice(0, 12),
    detail: parsed ? `CMC HTTP ${quotes.status}.` : "CoinMarketCap did not return a BNB price.",
    riskScore: risk.score,
    riskTier: risk.tier,
    riskInputs: inputs,
    capWei: risk.capWei.toString(),
  });
  if (quotes.status !== 0) memory = { at: Date.now(), key, value };
  return value;
}

function blank(impliedWei: bigint, extra: Partial<MarketCheck> & Pick<MarketCheck, "decision" | "cmcLabel" | "detail">): MarketCheck {
  return {
    decision: extra.decision,
    ammImpliedUsd: formatUsd(impliedWei),
    cmcUsd: extra.cmcUsd ?? null,
    cmcLabel: extra.cmcLabel,
    deviationBps: extra.deviationBps ?? null,
    maxDeviationBps: extra.maxDeviationBps ?? BASE_MAX_DEVIATION_BPS,
    httpStatus: extra.httpStatus ?? null,
    fetchedAt: extra.fetchedAt ?? null,
    responseSha256: extra.responseSha256 ?? null,
    sha256Short: extra.sha256Short ?? null,
    detail: extra.detail,
    riskScore: extra.riskScore ?? null,
    riskTier: extra.riskTier ?? "unread",
    riskInputs: extra.riskInputs ?? null,
    capWei: extra.capWei ?? BASE_CAP_WEI.toString(),
  };
}

function retarget(cached: MarketCheck, impliedWei: bigint): MarketCheck {
  const reference = cached.cmcUsd ? usdToWei(cached.cmcUsd) : null;
  const decided = decideMarket(impliedWei, reference, BigInt(cached.maxDeviationBps));
  return {
    ...cached,
    ammImpliedUsd: formatUsd(impliedWei),
    decision: cached.cmcUsd ? decided.status : cached.decision,
    deviationBps: decided.deviationBps === null ? null : decided.deviationBps.toString(),
  };
}

async function cmcGet(path: string, key: string): Promise<{ status: number; body: string }> {
  try {
    const response = await fetch(`${ORIGIN}${path}`, {
      headers: { Accept: "application/json", "X-CMC_PRO_API_KEY": key },
      cache: "no-store",
    });
    return { status: response.status, body: await response.text() };
  } catch {
    return { status: 0, body: "" };
  }
}

function parseQuote(body: string): { price: string; inputs: Pick<RiskInputs, "change1h" | "change24h" | "change7d" | "volumeChange24h"> } | null {
  const usd = usdNode(body, "BNB");
  const price = rawField(usd, "price");
  if (price === null) return null;
  return {
    price,
    inputs: {
      change1h: numberField(usd, "percent_change_1h"),
      change24h: numberField(usd, "percent_change_24h"),
      change7d: numberField(usd, "percent_change_7d"),
      volumeChange24h: numberField(usd, "volume_change_24h"),
    },
  };
}

function riskInputs(
  quote: ReturnType<typeof parseQuote>,
  fearBody: string,
  globalBody: string,
): RiskInputs {
  const globalUsd = usdNode(globalBody, null);
  return {
    change1h: quote?.inputs.change1h ?? null,
    change24h: quote?.inputs.change24h ?? null,
    change7d: quote?.inputs.change7d ?? null,
    volumeChange24h: quote?.inputs.volumeChange24h ?? null,
    fearGreed: numberField(fearBody, "value"),
    marketCapChange24h: numberField(globalUsd, "total_market_cap_yesterday_percentage_change"),
  };
}

function usdNode(body: string, symbol: string | null): string {
  try {
    const parsed = JSON.parse(body) as { data?: unknown };
    const data = parsed.data;
    if (!data || typeof data !== "object") return "";
    const record = data as Record<string, unknown>;
    const entry = symbol ? record[symbol] : record;
    const node = Array.isArray(entry) ? entry[0] : entry;
    if (!node || typeof node !== "object") {
      const quote = (record.quote as Record<string, unknown> | undefined)?.USD;
      return quote ? JSON.stringify(quote) : body;
    }
    const quote = ((node as { quote?: { USD?: unknown } }).quote ?? {}).USD;
    if (symbol) return quote ? JSON.stringify(quote) : "";
    return body;
  } catch {
    return "";
  }
}

function rawField(source: string, name: string): string | null {
  const match = new RegExp(`"${name}"\\s*:\\s*(-?[0-9]+(?:\\.[0-9]+)?)`).exec(source);
  return match ? match[1] : null;
}

function numberField(source: string, name: string): number | null {
  const raw = rawField(source, name);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
