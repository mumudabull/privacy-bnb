/**
 * File: lib/hack-copy.test.ts
 * Purpose: Guards the two languages of the hackathon page against drifting
 * apart: same sections, same number of items, and no empty strings.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentQuote, MarketSummary } from "./agent-quote.ts";
import { HACK_COPY, HACK_PATHS, type HackPageCopy } from "./hack-copy.ts";
import { TESTNET_READONLY_NOTE } from "./testnet-note.ts";

const english = HACK_COPY.en;
const chinese = HACK_COPY.zh;

const MARKET: MarketSummary = {
  decision: "pass",
  cmcDecision: "skipped",
  ammImpliedUsd: "555.00",
  cmcUsd: null,
  deviationBps: "35",
  maxDeviationBps: 500,
  detail: "Atlas check",
  atlas: {
    status: "pass",
    priceUsd: "553.08",
    deviationBps: "35",
    decimals: 18,
    updatedAt: 1795658900,
    roundId: "1",
    feed: "0x3957d289ee9C38272377786787ea34F9dd29788D",
    explorer: "https://testnet.bscscan.com/address/0x3957d289ee9C38272377786787ea34F9dd29788D",
  },
};

function collectStrings(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string") found.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, found));
  else if (typeof value === "object" && value !== null) {
    Object.values(value).forEach((item) => collectStrings(item, found));
  }
  return found;
}

describe("hackathon page copy", () => {
  it("has the same shape in both languages", () => {
    const listKeys: (keyof HackPageCopy)[] = ["lineage", "worksToday", "waits", "path"];
    for (const key of listKeys) {
      assert.equal((chinese[key] as unknown[]).length, (english[key] as unknown[]).length, key);
    }
    assert.deepEqual(Object.keys(chinese).sort(), Object.keys(english).sort());
    assert.deepEqual(Object.keys(chinese.console).sort(), Object.keys(english.console).sort());
    assert.equal(collectStrings(chinese).length, collectStrings(english).length);
  });

  it("has no empty text", () => {
    for (const text of [...collectStrings(english), ...collectStrings(chinese)]) {
      assert.ok(text.trim().length > 0);
    }
  });

  it("keeps the example sentences identical, since the agent parses English", () => {
    assert.deepEqual(
      chinese.console.examples.map((example) => example.sentence),
      english.console.examples.map((example) => example.sentence),
    );
  });

  it("states the read-only testnet status in each language", () => {
    assert.equal(english.console.readonlyNote, TESTNET_READONLY_NOTE);
    assert.equal(
      chinese.console.readonlyNote,
      "测试网演示：兑换在 BNB 测试网上是只读的，不会转移真实资金。",
    );
  });

  it("labels the quote as a demo and explains a feed failure without a price", () => {
    assert.equal(english.console.demoBadge, "Demo until live");
    assert.equal(chinese.console.demoBadge, "演示，上线前");
    assert.equal(
      english.console.demoFallback,
      "Live quote is in demo mode until the market data feed is connected.",
    );
    assert.equal(chinese.console.demoFallback, "在市场数据源接通之前，实时报价处于演示模式。");
    assert.doesNotMatch(english.console.demoFallback, /\d/);
    assert.doesNotMatch(chinese.console.demoFallback, /\d/);
  });

  it("links each language to the other", () => {
    assert.equal(HACK_PATHS[english.otherLanguage.locale], "/hack/zh");
    assert.equal(HACK_PATHS[chinese.otherLanguage.locale], "/hack");
  });

  it("describes every outcome in Chinese without falling back to the English reason", () => {
    const base: AgentQuote = {
      status: "refused",
      privacy: "",
      reason: "Above the 0.05 BNB execution cap. Quote only.",
      executionCapBnb: "0.05",
    };
    assert.match(chinese.console.describeReason(base) ?? "", /0\.05 BNB/);
    assert.notEqual(chinese.console.describeReason(base), base.reason);
    assert.ok(chinese.console.describeReason({ ...base, status: "market_refused" }));
    assert.ok(chinese.console.describeReason({ ...base, status: "rejected" }));
    assert.equal(chinese.console.describeReason({ ...base, status: "quoted" }), undefined);
    for (const decision of ["pass", "refuse", "unavailable", "skipped"] as const) {
      assert.ok(chinese.console.describeMarket({ ...MARKET, decision }).length > 0);
      assert.ok(english.console.describeMarket({ ...MARKET, decision }).length > 0);
    }
  });
});
