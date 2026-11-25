import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXECUTION_CAP_WEI, parseBnbInput, quoteExactIn } from "./quote.ts";

describe("quoteExactIn", () => {
  it("matches the Foundry vector for 0.1 BNB", () => {
    const out = quoteExactIn(10n ** 17n, 10n * 10n ** 18n, 10_000n * 10n ** 18n);
    assert.equal(out, 98_715803439706129885n);
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
