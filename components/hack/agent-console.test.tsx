/**
 * File: components/hack/agent-console.test.tsx
 * Purpose: Checks the on-page quote control, which posts to /api/mcp. A 429
 * shows the rate-limit line. A normal quote still shows its status.
 */

import assert from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement, type ReactElement } from "react";
import type { Root } from "react-dom/client";
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
type AgentConsoleComponent = typeof import("./agent-console.tsx").AgentConsole;

let createRoot: CreateRoot;
let AgentConsole: AgentConsoleComponent;

before(async () => {
  ({ createRoot } = await import("react-dom/client"));
  ({ AgentConsole } = await import("./agent-console.tsx"));
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Retry-After": "60" },
  });
}

describe("on-page quote rate limit", { concurrency: false }, () => {
  let host: HTMLDivElement;
  let root: Root;
  const requested: string[] = [];

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    host?.remove();
    requested.length = 0;
    installGlobal("fetch", undefined);
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

  function button(name: string): HTMLButtonElement {
    const found = [...host.querySelectorAll("button")].find((element) => element.textContent?.includes(name));
    if (found === undefined) assert.fail(name);
    return found;
  }

  it("shows the rate-limit line when /api/mcp answers 429", async () => {
    installGlobal("fetch", async (url: string) => {
      requested.push(String(url));
      return jsonResponse(429, {
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32029, message: "Too many requests from this address. Retry after 60 seconds." },
      });
    });
    await render(createElement(AgentConsole, { locale: "en" }));
    await act(async () => {
      button("A swap under the cap").click();
    });
    assert.deepEqual(requested, ["/api/mcp"]);
    assert.equal(
      host.querySelector(".hack-console-demo")?.textContent,
      "Too many quotes. Wait a moment and try again. Nothing was sent.",
    );
    assert.equal(host.querySelector(".hack-answer-status"), null);
  });

  it("still shows a quoted answer when /api/mcp accepts the sentence", async () => {
    installGlobal("fetch", async () =>
      jsonResponse(200, {
        jsonrpc: "2.0",
        id: 1,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "quoted",
                privacy: "Public rehearsal. Owners and amounts are visible.",
                amountBnb: "0.04",
                quoteRnote: "22.045482",
                executionCapBnb: "0.05",
              }),
            },
          ],
        },
      }),
    );
    await render(createElement(AgentConsole, { locale: "en" }));
    await act(async () => {
      button("A swap under the cap").click();
    });
    const answer = host.querySelector(".hack-answer");
    assert.match(answer?.textContent ?? "", /Quoted/);
    assert.match(answer?.textContent ?? "", /0\.04 BNB/);
    assert.equal(host.querySelector(".hack-console-demo"), null);
  });
});
