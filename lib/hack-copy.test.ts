/**
 * File: lib/hack-copy.test.ts
 * Purpose: Guards the two languages of the hackathon page against drifting
 * apart: same sections, same number of items, and no empty strings.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentQuote, MarketSummary } from "./agent-quote.ts";
import { HACK_COPY, HACK_PATHS, type HackPageCopy } from "./hack-copy.ts";
import { QUOTE_TOOL_NAME } from "./mcp-server.ts";
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
    assert.deepEqual(Object.keys(chinese.agents).sort(), Object.keys(english.agents).sort());
    assert.equal(chinese.agents.chains.length, english.agents.chains.length);
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
      executionCapBnb: "0.05",
    };
    const marketCheck = "Inside the band.";
    const englishSteps = english.console.simulation.steps.map((step) => step.body(quote, marketCheck));
    const chineseSteps = chinese.console.simulation.steps.map((step) => step.body(quote, marketCheck));
    const englishStatus = english.console.simulation.status(1, 5, "Review");
    const chineseStatus = chinese.console.simulation.status(1, 5, "核对");

    assert.deepEqual(
      english.console.simulation.steps.map((step) => step.title),
      ["Review", "Shield", "Atomic call", "Reshield", "Receipt"],
    );
    assert.deepEqual(
      chinese.console.simulation.steps.map((step) => step.title),
      ["核对", "屏蔽", "原子调用", "重新屏蔽", "回执"],
    );
    assert.equal(english.console.simulation.label, "Simulation");
    assert.equal(chinese.console.simulation.label, "模拟");
    assert.equal(english.console.simulation.back, "Back");
    assert.equal(chinese.console.simulation.back, "上一步");
    assert.equal(english.console.simulation.next, "Next");
    assert.equal(chinese.console.simulation.next, "下一步");
    assert.equal(
      englishStatus,
      "Simulation. Step 1 of 5: Review. New L1 is on devnet only. Public testnet and mainnet have not launched.",
    );
    assert.equal(
      chineseStatus,
      "模拟。第 1 步，共 5 步：核对。New L1 仅有开发网。公开测试网和主网尚未推出。",
    );
    assert.equal(english.console.simulation.recordedLink, "Recorded BSC testnet rehearsal");
    assert.equal(chinese.console.simulation.recordedLink, "已记录的 BSC 测试网演练");
    assert.doesNotMatch(englishStatus, /not live/i);
    assert.doesNotMatch(chineseStatus, /尚未上线/);
    assert.match(
      englishSteps[0],
      /Sell 0\.04 BNB\. Pool quote about 22\.045482 rNOTE\. Cap 0\.05 BNB\. Market check: Inside the band\./,
    );
    assert.match(englishSteps[1], /0\.04 BNB enters the New L1 shielded pool as a note/);
    assert.match(englishSteps[2], /admitted public EVM swap of 0\.04 BNB/);
    assert.match(englishSteps[2], /BNB New L1 litepaper/);
    assert.match(englishSteps[3], /goes back into a new note/);
    assert.match(englishSteps[3], /about 22\.045482 rNOTE/);
    assert.match(englishSteps[3], /devnet pool reshields native BNB only/);
    assert.match(englishSteps[3], /not a shielded balance/);
    assert.match(chineseSteps[3], /输出回到一张新票据/);
    assert.match(chineseSteps[3], /只重新屏蔽原生 BNB/);
    assert.match(chineseSteps[3], /不是屏蔽余额/);
    assert.match(englishSteps[4], /recorded run on PublicRehearsal: unshield, swap, and reshield/);
    assert.match(englishSteps[4], /not a receipt for this quote/);
    assert.match(chineseSteps[0], /卖出 0\.04 BNB/);
    assert.match(chineseSteps[0], /资金池报价约 22\.045482 rNOTE/);
    assert.match(chineseSteps[0], /上限 0\.05 BNB/);
    assert.match(chineseSteps[0], /市场检查：Inside the band/);
    assert.match(chineseSteps[1], /0\.04 BNB 进入 New L1 屏蔽池，成为一张票据/);
    assert.match(chineseSteps[4], /PublicRehearsal 上的一次已记录运行：解屏蔽、兑换、重新屏蔽/);
    assert.match(chineseSteps[4], /不是这笔报价的回执/);

    const spoken = [
      english.console.simulation.label,
      chinese.console.simulation.label,
      english.console.simulation.back,
      chinese.console.simulation.back,
      english.console.simulation.next,
      chinese.console.simulation.next,
      english.console.simulation.recordedLink,
      chinese.console.simulation.recordedLink,
      englishStatus,
      chineseStatus,
      ...englishSteps,
      ...chineseSteps,
    ].join(" ");
    assert.doesNotMatch(spoken, /confirmed|success|\bsent\b|已确认|成功|已发送/i);
    assert.doesNotMatch(spoken, /0x[0-9a-f]{8}/i);
    assert.doesNotMatch(spoken, /guaranteed anonymity|not live/i);
  });

  it("frames the AI agent and the MCP API without calling other chains live", () => {
    assert.equal(english.heroEyebrow, "AI swap agent");
    assert.equal(chinese.heroEyebrow, "AI 兑换智能体");
    assert.equal(english.console.consoleTitle, "Talk to the DarkSwap agent");
    assert.equal(chinese.console.consoleTitle, "和 DarkSwap 智能体对话");
    assert.match(english.console.consoleExplainer, /refuses anything over its limits/);
    assert.equal(english.console.inputPlaceholder, chinese.console.inputPlaceholder);
    assert.equal(english.console.tryLabel, "Try:");
    assert.equal(chinese.console.tryLabel, "试试：");
    assert.equal(english.agents.title, "An AI swap agent, and an API for yours");
    assert.match(english.agents.intro, /public rehearsal/);
    assert.match(chinese.agents.intro, /公开演练/);
    assert.equal(english.agents.mcpUrl, "https://hack.darkswap.app/api/mcp");
    assert.equal(chinese.agents.mcpUrl, english.agents.mcpUrl);
    assert.equal(english.agents.mcpTool, QUOTE_TOOL_NAME);
    assert.equal(chinese.agents.mcpTool, QUOTE_TOOL_NAME);
    assert.equal(english.agents.mcpMethod, "POST");
    assert.equal(chinese.agents.mcpMethod, "POST");
    assert.match(english.agents.mcpBody, /POST https:\/\/hack\.darkswap\.app\/api\/mcp, tool quote_swap/);
    assert.deepEqual(
      english.agents.chains.map((chain) => chain.status),
      ["Live (testnet)", "Launching soon", "Launching soon"],
    );
    assert.deepEqual(
      chinese.agents.chains.map((chain) => chain.status),
      ["已上线（测试网）", "即将上线", "即将上线"],
    );
    assert.deepEqual(
      english.agents.chains.map((chain) => chain.state),
      ["live", "soon", "soon"],
    );
    assert.deepEqual(
      chinese.agents.chains.map((chain) => chain.state),
      english.agents.chains.map((chain) => chain.state),
    );
    const framing = [
      english.heroSubline,
      chinese.heroSubline,
      english.agents.intro,
      chinese.agents.intro,
      ...english.agents.chains.map((chain) => chain.status),
      ...chinese.agents.chains.map((chain) => chain.status),
    ].join(" ");
    assert.doesNotMatch(framing, /not live/i);
    assert.doesNotMatch(framing, /尚未上线/);
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
