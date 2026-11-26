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
    assert.deepEqual(
      Object.keys(chinese.console.simulation).sort(),
      Object.keys(english.console.simulation).sort(),
    );
    assert.equal(chinese.console.simulation.steps.length, english.console.simulation.steps.length);
    assert.equal(english.console.simulation.steps.length, 5);
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

  it("labels the quote as read-only and explains an endpoint failure without a price", () => {
    assert.equal(english.console.demoBadge, "Read-only quote");
    assert.equal(chinese.console.demoBadge, "只读报价");
    assert.equal(english.console.demoFallback, "The quote endpoint did not answer. Nothing was sent.");
    assert.equal(chinese.console.demoFallback, "报价端点没有响应。没有发送任何交易。");
    assert.doesNotMatch(english.console.demoFallback, /\d/);
    assert.doesNotMatch(chinese.console.demoFallback, /\d/);
    assert.doesNotMatch(english.console.demoFallback, /market data feed/i);
    assert.doesNotMatch(chinese.console.demoFallback, /市场数据源/);
  });

  it("describes the simulated walk-through in both languages without a fake receipt", () => {
    const quote: AgentQuote = {
      status: "quoted",
      privacy: "",
      amountBnb: "0.04",
      quoteRnote: "22.045482",
    };
    const marketCheck = "Inside the band.";
    const englishSteps = english.console.simulation.steps.map((step) => step.body(quote, marketCheck));
    const chineseSteps = chinese.console.simulation.steps.map((step) => step.body(quote, marketCheck));

    assert.deepEqual(
      english.console.simulation.steps.map((step) => step.title),
      ["Review", "Shield", "Atomic call", "Reshield", "Receipt"],
    );
    assert.deepEqual(
      chinese.console.simulation.steps.map((step) => step.title),
      ["核对", "屏蔽", "原子调用", "重新屏蔽", "回执"],
    );
    assert.equal(english.console.simulation.start, "Simulate this swap");
    assert.equal(english.console.simulation.next, "Next step");
    assert.equal(english.console.simulation.startOver, "Start over");
    assert.equal(
      english.console.simulation.status,
      "Simulation. New L1 is on devnet only and BNB Chain has not published the proof tool needed to spend a shielded note, so nothing is sent.",
    );
    assert.equal(
      chinese.console.simulation.status,
      "模拟演示。New L1 目前仅有开发网，BNB Chain 尚未发布花费隐私票据所需的证明工具，因此不会发送任何交易。",
    );
    assert.equal(english.console.simulation.recordedLink, "Recorded rehearsal on BSC testnet");
    assert.doesNotMatch(english.console.simulation.status, /not live/i);
    assert.match(englishSteps[0], /Sell 0\.04 BNB for about 22\.045482 rNOTE\. Market check: Inside the band\./);
    assert.match(englishSteps[1], /0\.04 BNB is deposited into the pool/);
    assert.match(englishSteps[3], /About 22\.045482 rNOTE/);
    assert.match(englishSteps[4], /No transaction was sent/);
    assert.match(englishSteps[4], /recorded run, not a receipt for this quote/);
    assert.match(chineseSteps[0], /0\.04 BNB/);
    assert.match(chineseSteps[0], /22\.045482 rNOTE/);
    assert.match(chineseSteps[4], /没有发送任何交易/);
    assert.match(chineseSteps[4], /不是这笔报价的回执/);

    const earlySteps = [...englishSteps.slice(0, 4), ...chineseSteps.slice(0, 4)].join(" ");
    assert.doesNotMatch(earlySteps, /confirmed|success|\bsent\b|已确认|成功/i);
    assert.doesNotMatch([...englishSteps, ...chineseSteps].join(" "), /0x[0-9a-f]{8}/i);
    assert.doesNotMatch(
      [english.console.simulation.status, chinese.console.simulation.status, ...englishSteps, ...chineseSteps].join(" "),
      /guaranteed anonymity/i,
    );
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
