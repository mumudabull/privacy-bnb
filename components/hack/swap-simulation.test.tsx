/**
 * File: components/hack/swap-simulation.test.tsx
 * Purpose: Renders the hackathon swap walk-through. It appears only for an
 * accepted quote, moves one step per click, and the last step links the
 * recorded BSC testnet rehearsal transaction. Chinese strings come from the
 * same copy table as /hack/zh.
 */

import assert from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement, type ReactElement } from "react";
import type { Root } from "react-dom/client";
import type { AgentQuote } from "../../lib/agent-quote.ts";
import { HACK_COPY } from "../../lib/hack-copy.ts";
import { RECORDED_REHEARSAL_TX, RECORDED_REHEARSAL_TX_URL } from "../../lib/network.ts";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://hack.darkswap.app/hack",
  pretendToBeVisual: true,
});

const { window } = dom;

function installGlobal(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}

installGlobal("window", window);
installGlobal("document", window.document);
installGlobal("HTMLElement", window.HTMLElement);
installGlobal("Element", window.Element);
installGlobal("Node", window.Node);
installGlobal("DocumentFragment", window.DocumentFragment);
installGlobal("navigator", window.navigator);
installGlobal("IS_REACT_ACT_ENVIRONMENT", true);
installGlobal("getComputedStyle", window.getComputedStyle.bind(window));
installGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
  window.setTimeout(() => callback(Date.now()), 0),
);
installGlobal("cancelAnimationFrame", (handle: number) => window.clearTimeout(handle));

type CreateRoot = typeof import("react-dom/client").createRoot;
type QuoteAnswerComponent = typeof import("./agent-console.tsx").QuoteAnswer;
type SwapSimulationComponent = typeof import("./swap-simulation.tsx").SwapSimulation;

let createRoot: CreateRoot;
let QuoteAnswer: QuoteAnswerComponent;
let SwapSimulation: SwapSimulationComponent;

const QUOTED: AgentQuote = {
  status: "quoted",
  privacy: "Public rehearsal. Owners and amounts are visible.",
  amountBnb: "0.04",
  quoteRnote: "22.045482",
  executionCapBnb: "0.05",
  market: {
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
  },
};

before(async () => {
  ({ createRoot } = await import("react-dom/client"));
  ({ QuoteAnswer } = await import("./agent-console.tsx"));
  ({ SwapSimulation } = await import("./swap-simulation.tsx"));
});

describe("swap simulation walk-through", () => {
  let host: HTMLDivElement;
  let root: Root;

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    host?.remove();
  });

  async function render(element: ReactElement) {
    host = window.document.createElement("div");
    window.document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(element);
    });
    return host;
  }

  function heading(): string {
    return host.querySelector("h3")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }

  function button(name: string): HTMLButtonElement {
    const found = [...host.querySelectorAll("button")].find((element) => element.textContent?.trim() === name);
    if (found === undefined) assert.fail(name);
    return found;
  }

  async function click(name: string) {
    await act(async () => {
      button(name).click();
    });
  }

  it("renders only for a quoted answer", async () => {
    for (const status of ["refused", "market_refused", "rejected"] as const) {
      const view = await render(createElement(QuoteAnswer, { quote: { ...QUOTED, status }, copy: HACK_COPY.en.console }));
      assert.equal(view.querySelector(".hack-simulation"), null, status);
      await act(async () => root.unmount());
      host.remove();
    }
    const quoted = await render(
      createElement(QuoteAnswer, { quote: QUOTED, copy: HACK_COPY.en.console }),
    );
    assert.ok(quoted.querySelector(".hack-simulation"));
    assert.match(heading(), /Review/);
  });

  it("advances one step per click and returns with Back", async () => {
    await render(createElement(SwapSimulation, { quote: QUOTED, copy: HACK_COPY.en.console }));
    assert.match(heading(), /Review/);
    assert.match(host.textContent ?? "", /Sell 0\.04 BNB/);
    assert.match(host.textContent ?? "", /22\.045482 rNOTE/);
    assert.match(host.textContent ?? "", /Cap 0\.05 BNB/);
    assert.match(host.textContent ?? "", /Market check:/);
    assert.equal(host.querySelector("a"), null);
    assert.equal(button("Back").disabled, true);

    await click("Next");
    assert.match(heading(), /Shield/);
    assert.doesNotMatch(heading(), /Review/);
    assert.match(host.textContent ?? "", /enters the New L1 shielded pool as a note/);
    assert.doesNotMatch(heading(), /Atomic call/);
    assert.equal(window.document.activeElement, host.querySelector("h3"));

    await click("Next");
    assert.match(heading(), /Atomic call/);
    assert.match(host.textContent ?? "", /admitted public EVM swap/);

    await click("Back");
    assert.match(heading(), /Shield/);
    assert.equal(window.document.activeElement, host.querySelector("h3"));
  });

  it("moves one step with the arrow keys", async () => {
    await render(createElement(SwapSimulation, { quote: QUOTED, copy: HACK_COPY.en.console }));
    await act(async () => {
      button("Next").dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    assert.match(heading(), /Shield/);
    await act(async () => {
      button("Back").dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    });
    assert.match(heading(), /Review/);
  });

  it("links the recorded rehearsal transaction on the last step only", async () => {
    await render(createElement(SwapSimulation, { quote: QUOTED, copy: HACK_COPY.en.console }));
    for (const title of ["Shield", "Atomic call", "Reshield", "Receipt"]) {
      await click("Next");
      assert.match(heading(), new RegExp(title));
      if (title !== "Receipt") assert.equal(host.querySelector("a"), null);
    }
    const link = host.querySelector("a");
    assert.ok(link);
    assert.equal(link.getAttribute("href"), RECORDED_REHEARSAL_TX_URL);
    assert.match(link.getAttribute("href") ?? "", new RegExp(RECORDED_REHEARSAL_TX));
    assert.match(host.textContent ?? "", /recorded run on PublicRehearsal: unshield, swap, and reshield/);
    assert.match(host.textContent ?? "", /not a receipt for this quote/);
    assert.equal(button("Next").disabled, true);
    await click("Next");
    assert.match(heading(), /Receipt/);
    assert.doesNotMatch(host.textContent ?? "", /confirmed|success|\bsent\b/i);
  });

  it("uses the Chinese strings for /hack/zh", async () => {
    const copy = HACK_COPY.zh.console;
    await render(createElement(SwapSimulation, { quote: QUOTED, copy }));
    assert.match(host.textContent ?? "", /模拟。第 1 步，共 5 步：核对/);
    assert.match(heading(), /核对/);
    assert.match(host.textContent ?? "", /卖出 0\.04 BNB/);
    await click("下一步");
    assert.match(heading(), /屏蔽/);
    assert.match(host.textContent ?? "", /进入 New L1 屏蔽池，成为一张票据/);
    await click("下一步");
    await click("下一步");
    await click("下一步");
    assert.match(heading(), /回执/);
    assert.match(host.textContent ?? "", /不是这笔报价的回执/);
    assert.equal(host.querySelector("a")?.getAttribute("href"), RECORDED_REHEARSAL_TX_URL);
    assert.equal(host.querySelector("a")?.textContent, copy.simulation.recordedLink);
    assert.equal(copy.simulation.steps.length, 5);
    for (const step of copy.simulation.steps) {
      assert.ok(step.title.trim().length > 0);
      assert.ok(step.body(QUOTED, "市场带内").trim().length > 0);
    }
  });
});
