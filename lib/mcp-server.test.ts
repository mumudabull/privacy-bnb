/**
 * File: lib/mcp-server.test.ts
 * Purpose: Tests the intent parser, the quote-only agent answer, and the MCP
 * message handler, including parity with the Python agent's quote vectors.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAgentQuote, type MarketSummary } from "./agent-quote.ts";
import { parseIntent } from "./intent.ts";
import { handleMcpMessage, LATEST_PROTOCOL_VERSION, QUOTE_TOOL_NAME } from "./mcp-server.ts";

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
