/**
 * File: components/hack/agent-platform.test.tsx
 * Purpose: Renders the hackathon chain list and checks that BNB, Solana, and
 * NEAR each keep their chip. A filter that dropped the soon rows would fail.
 */

import assert from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement, type ReactElement } from "react";
import type { Root } from "react-dom/client";
import { HACK_COPY, type HackLocale } from "../../lib/hack-copy.ts";

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

type CreateRoot = typeof import("react-dom/client").createRoot;
type AgentPlatformComponent = typeof import("./agent-platform.tsx").AgentPlatform;

let createRoot: CreateRoot;
let AgentPlatform: AgentPlatformComponent;

before(async () => {
  ({ createRoot } = await import("react-dom/client"));
  ({ AgentPlatform } = await import("./agent-platform.tsx"));
});

describe("hackathon chain chips", () => {
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

  async function expectEveryChain(locale: HackLocale) {
    const copy = HACK_COPY[locale].agents;
    const view = await render(createElement(AgentPlatform, { copy }));
    const items = [...view.querySelectorAll(".hack-chains li")];
    assert.equal(items.length, 3, locale);
    assert.deepEqual(
      items.map((item) => item.querySelector(".hack-chip")?.textContent),
      copy.chains.map((chain) => chain.status),
    );
    for (const [index, chain] of copy.chains.entries()) {
      const item = items[index];
      assert.ok(item);
      assert.match(item.textContent ?? "", new RegExp(chain.name));
      const chip = item.querySelector(".hack-chip");
      assert.ok(chip);
      const expectedClass = chain.state === "live" ? "hack-chip hack-chip-live" : "hack-chip hack-chip-soon";
      assert.equal(chip.className, expectedClass);
    }
  }

  it("shows the live BNB chip and the Solana and NEAR chips in English", async () => {
    await expectEveryChain("en");
    const text = host.textContent ?? "";
    assert.match(text, /BNB testnet/);
    assert.match(text, /Live \(testnet\)/);
    assert.match(text, /Solana/);
    assert.match(text, /NEAR/);
    assert.match(text, /Launching soon/);
    assert.doesNotMatch(text, /not live/i);
  });

  it("shows the same three chips in Chinese", async () => {
    await expectEveryChain("zh");
    const text = host.textContent ?? "";
    assert.match(text, /BNB 测试网/);
    assert.match(text, /已上线（测试网）/);
    assert.match(text, /Solana/);
    assert.match(text, /NEAR/);
    assert.match(text, /即将上线/);
    assert.doesNotMatch(text, /尚未上线/);
  });
});
