import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN, EXECUTION_CAP_WEI, parseBnbInput, quoteExactIn } from "./quote.ts";

describe("quoteExactIn", () => {
  it("matches the Foundry vector for 0.1 BNB on the 555 rNOTE seed", () => {
    const out = quoteExactIn(10n ** 17n, DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN);
    assert.equal(out, 54_787270909036902086n);
  });
});

describe("parseBnbInput", () => {
  it("parses decimal BNB and rejects junk", () => {
    assert.equal(parseBnbInput("0.1"), 10n ** 17n);
    assert.equal(parseBnbInput("0.05"), EXECUTION_CAP_WEI);
    assert.equal(parseBnbInput("1.2.3"), null);
    assert.equal(parseBnbInput("abc"), null);
  });
});
