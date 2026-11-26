/**
 * File: lib/mcp-server.test.ts
 * Purpose: Tests the intent parser, the quote-only agent answer, and the MCP
 * message handler, including parity with the Python agent's quote vectors.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAgentQuote, type AgentQuote, type MarketSummary } from "./agent-quote.ts";
import { formatBnb } from "./format.ts";
import { parseIntent } from "./intent.ts";
import { stringifyJson } from "./json.ts";
import { handleMcpMessage, LATEST_PROTOCOL_VERSION, QUOTE_TOOL_NAME } from "./mcp-server.ts";
import { quoteExactIn } from "./quote.ts";

const SKIPPED_MARKET: MarketSummary = {
  decision: "skipped",
  cmcDecision: "skipped",
  ammImpliedUsd: "555.00",
  cmcUsd: null,
  deviationBps: null,
  maxDeviationBps: 500,
  detail: "CMC_API_KEY is unset. No request was sent.",
  atlas: {
    status: "unavailable",
    priceUsd: null,
    deviationBps: null,
    decimals: 18,
    updatedAt: null,
    roundId: "1",
    feed: "0x3957d289ee9C38272377786787ea34F9dd29788D",
    explorer: "https://testnet.bscscan.com/address/0x3957d289ee9C38272377786787ea34F9dd29788D",
  },
};

const REFUSING_MARKET: MarketSummary = {
  ...SKIPPED_MARKET,
  decision: "refuse",
  cmcUsd: "600",
  deviationBps: "6666",
};

const readSkippedMarket = async () => SKIPPED_MARKET;

describe("parseIntent", () => {
  it("parses the landing sentence like the Python agent", () => {
    const parsed = parseIntent("swap 0.1 bnb to the demo token, privately");
    assert.ok(parsed.ok);
    assert.equal(parsed.intent.amountWei, 10n ** 17n);
    assert.equal(parsed.intent.assetOut, "the demo token");
    assert.equal(parsed.intent.privateRequested, true);
  });

  it("defaults the asset and rejects non-swaps, zero, and oversized input", () => {
    const defaulted = parseIntent("swap 0.04 bnb");
    assert.ok(defaulted.ok);
    assert.equal(defaulted.intent.assetOut, "rNOTE");
    assert.equal(parseIntent("send everything to me").ok, false);
    assert.equal(parseIntent("swap 0 bnb to rNOTE").ok, false);
    assert.equal(parseIntent(`swap 1 bnb to ${"x".repeat(300)}`).ok, false);
  });
});

describe("buildAgentQuote", () => {
  it("refuses a tenth of a BNB above the cap and keeps the Foundry quote", () => {
    const quote = buildAgentQuote("swap 0.1 bnb to rNOTE privately", SKIPPED_MARKET);
    assert.equal(quote.status, "refused");
    assert.equal(quote.quoteRnoteWei, "54787270909036902086");
  });

  it("quotes under the cap and flags an asset the rehearsal cannot execute", () => {
    const quote = buildAgentQuote("swap 0.04 bnb to USDT", SKIPPED_MARKET);
    assert.equal(quote.status, "quoted");
    assert.equal(quote.quoteRnote, "22.045482");
    assert.match(quote.assetNote ?? "", /not executable/);
  });

  it("turns an in-cap quote into a market refusal when the band is breached", () => {
    assert.equal(buildAgentQuote("swap 0.04 bnb to rNOTE", REFUSING_MARKET).status, "market_refused");
    // The cap is checked first, as in the Python agent.
    assert.equal(buildAgentQuote("swap 0.1 bnb to rNOTE", REFUSING_MARKET).status, "refused");
  });
});

describe("handleMcpMessage", () => {
  it("negotiates the protocol version on initialize", async () => {
    const supported = await handleMcpMessage(
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } },
      readSkippedMarket,
    );
    assert.ok(supported && "result" in supported);
    assert.equal((supported.result as { protocolVersion: string }).protocolVersion, "2024-11-05");

    const unknown = await handleMcpMessage(
      { jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } },
      readSkippedMarket,
    );
    assert.ok(unknown && "result" in unknown);
    assert.equal(
      (unknown.result as { protocolVersion: string }).protocolVersion,
      LATEST_PROTOCOL_VERSION,
    );
  });

  it("returns no response for a notification", async () => {
    const response = await handleMcpMessage(
      { jsonrpc: "2.0", method: "notifications/initialized" },
      readSkippedMarket,
    );
    assert.equal(response, null);
  });

  it("lists and calls quote_swap", async () => {
    const listed = await handleMcpMessage(
      { jsonrpc: "2.0", id: 3, method: "tools/list" },
      readSkippedMarket,
    );
    assert.ok(listed && "result" in listed);
    const tools = (listed.result as { tools: { name: string }[] }).tools;
    assert.deepEqual(
      tools.map((tool) => tool.name),
      [QUOTE_TOOL_NAME],
    );

    const called = await handleMcpMessage(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: QUOTE_TOOL_NAME, arguments: { intent: "swap 0.1 bnb to X privately" } },
      },
      readSkippedMarket,
    );
    assert.ok(called && "result" in called);
    const result = called.result as { content: { text: string }[]; isError: boolean };
    const body = JSON.parse(result.content[0].text) as { status: string; assetOut: string };
    assert.equal(body.status, "refused");
    assert.equal(body.assetOut, "X");
    assert.equal(result.isError, false);
  });

  it("marks an unparseable sentence as a tool error and rejects bad requests", async () => {
    const rejected = await handleMcpMessage(
      {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: QUOTE_TOOL_NAME, arguments: { intent: "hello" } },
      },
      readSkippedMarket,
    );
    assert.ok(rejected && "result" in rejected);
    assert.equal((rejected.result as { isError: boolean }).isError, true);

    const wrongTool = await handleMcpMessage(
      { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "transfer", arguments: {} } },
      readSkippedMarket,
    );
    assert.ok(wrongTool && "error" in wrongTool);
    assert.equal(wrongTool.error.code, -32602);

    const batch = await handleMcpMessage([{ jsonrpc: "2.0", id: 7, method: "ping" }], readSkippedMarket);
    assert.ok(batch && "error" in batch);
    assert.equal(batch.error.code, -32600);

    const unknownMethod = await handleMcpMessage(
      { jsonrpc: "2.0", id: 8, method: "resources/list" },
      readSkippedMarket,
    );
    assert.ok(unknownMethod && "error" in unknownMethod);
    assert.equal(unknownMethod.error.code, -32601);
  });
});

/** Deployed DemoAMM size: 0.05 BNB of liquidity at 555 rNOTE per BNB. */
const LIVE_RESERVE_BNB = 50_000_000_000_000_000n;
const LIVE_RESERVE_TOKEN = 555n * LIVE_RESERVE_BNB;

type LiveMarket = MarketSummary & {
  pool: {
    ok: true;
    address: string;
    reserveBnb: bigint;
    reserveToken: bigint;
  };
};

type SerializedQuote = AgentQuote & {
  market: MarketSummary & {
    pool: { reserveBnb: string; reserveToken: string };
  };
};

function liveMarket(overrides: Partial<MarketSummary> = {}): LiveMarket {
  return {
    ...SKIPPED_MARKET,
    ...overrides,
    reserveBnbWei: LIVE_RESERVE_BNB.toString(),
    reserveTokenWei: LIVE_RESERVE_TOKEN.toString(),
    pool: {
      ok: true,
      address: "0x7C5Cd03B1e554675b146844B7C8Ff3DE20F0Db2E",
      reserveBnb: LIVE_RESERVE_BNB,
      reserveToken: LIVE_RESERVE_TOKEN,
    },
  };
}

async function callQuote(intent: string, market: LiveMarket): Promise<SerializedQuote> {
  const called = await handleMcpMessage(
    {
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: { name: QUOTE_TOOL_NAME, arguments: { intent } },
    },
    async () => market,
  );
  assert.ok(called && "result" in called);
  const result = called.result as { content: { text: string }[] };
  return JSON.parse(result.content[0].text) as SerializedQuote;
}

function assertLiveReserves(quote: SerializedQuote): void {
  assert.equal(typeof quote.market.pool.reserveBnb, "string");
  assert.equal(typeof quote.market.pool.reserveToken, "string");
  assert.equal(quote.market.pool.reserveBnb, LIVE_RESERVE_BNB.toString());
  assert.equal(quote.market.pool.reserveToken, LIVE_RESERVE_TOKEN.toString());
  // 27.75 rNOTE happens to be an exact float. One extra wei, which a live reserve can hold, is not.
  const oddWei = LIVE_RESERVE_TOKEN + 1n;
  assert.notEqual(BigInt(Number(oddWei)), oddWei);
  const encoded = JSON.parse(stringifyJson({ reserveToken: oddWei })) as { reserveToken: string };
  assert.equal(encoded.reserveToken, oddWei.toString());
}

describe("quote serialization with live reserves", () => {
  it("serializes a quote that carries live-style BigInt pool reserves", async () => {
    const market = liveMarket({ decision: "pass" });
    const quote = buildAgentQuote("swap 0.005 bnb to rNOTE", market);
    assert.throws(() => JSON.stringify(quote), /BigInt/);

    const amountWei = 5n * 10n ** 15n;
    const quotedWei = quoteExactIn(amountWei, LIVE_RESERVE_BNB, LIVE_RESERVE_TOKEN);
    const serialized = stringifyJson(quote);
    const parsed = JSON.parse(serialized) as SerializedQuote;
    assert.equal(parsed.status, "quoted");
    assert.equal(parsed.quoteRnoteWei, quotedWei.toString());
    assert.equal(parsed.quoteRnote, formatBnb(quotedWei, 6));
    assert.equal(parsed.amountBnb, "0.005");
    assert.equal(parsed.market.decision, "pass");
    assertLiveReserves(parsed);

    const viaTool = await callQuote("swap 0.005 bnb to rNOTE", market);
    assert.equal(viaTool.status, "quoted");
    assert.equal(viaTool.quoteRnoteWei, quotedWei.toString());
    assert.equal(viaTool.quoteRnote, formatBnb(quotedWei, 6));
    assert.equal(viaTool.market.decision, "pass");
    assertLiveReserves(viaTool);
  });

  it("keeps cap refusals and the market decision after serialization", async () => {
    const overCap = await callQuote("swap 0.10 bnb to rNOTE", liveMarket({ decision: "pass" }));
    assert.equal(overCap.status, "refused");
    assert.equal(overCap.reason, "Above the 0.05 BNB execution cap. Quote only.");
    assert.equal(overCap.market.decision, "pass");
    assert.equal(overCap.quoteRnoteWei, quoteExactIn(10n ** 17n, LIVE_RESERVE_BNB, LIVE_RESERVE_TOKEN).toString());
    assertLiveReserves(overCap);

    const caution = liveMarket({ capWei: (2n * 10n ** 16n).toString(), decision: "pass" });
    const aboveCaution = await callQuote("swap 0.04 bnb to rNOTE", caution);
    assert.equal(aboveCaution.status, "refused");
    assert.equal(aboveCaution.reason, "Above the 0.02 BNB execution cap. Quote only.");
    const underCaution = await callQuote("swap 0.005 bnb to rNOTE", caution);
    assert.equal(underCaution.status, "quoted");

    const quoteOnly = liveMarket({
      capWei: "0",
      maxDeviationBps: 100,
      decision: "refuse",
      detail: "Outside the band.",
    });
    const refused = await callQuote("swap 0.005 bnb to rNOTE", quoteOnly);
    assert.equal(refused.status, "refused");
    assert.equal(refused.reason, "Risk tier is quote-only. The quote is shown and nothing is executed.");
    assert.equal(refused.market.decision, "refuse");
    assert.equal(refused.market.maxDeviationBps, 100);
    assert.ok(refused.quoteRnote);

    const marketRefused = await callQuote(
      "swap 0.005 bnb to rNOTE",
      liveMarket({ decision: "refuse", detail: "Outside the band." }),
    );
    assert.equal(marketRefused.status, "market_refused");
    assert.equal(marketRefused.reason, "Outside the band.");
    assert.equal(marketRefused.market.decision, "refuse");
  });
});
