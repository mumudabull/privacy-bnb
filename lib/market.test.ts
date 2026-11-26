import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideMarket, deviationBps, impliedBnbUsdWei, usdToWei } from "./market.ts";

describe("market check", () => {
  it("treats the seed spot as 555 USD per BNB and refuses a 900 print", () => {
    const implied = impliedBnbUsdWei(10n * 10n ** 18n, 5550n * 10n ** 18n);
    assert.equal(implied, 555n * 10n ** 18n);
    const reference = usdToWei("900");
    assert.ok(reference);
    assert.ok(deviationBps(implied, reference) > 500n);
    assert.equal(decideMarket(implied, reference, 500n).status, "refuse");
  });

  it("passes when the reference matches the implied price", () => {
    const implied = impliedBnbUsdWei(10n ** 18n, 900n * 10n ** 18n);
    assert.equal(decideMarket(implied, 900n * 10n ** 18n, 500n).status, "pass");
  });
});
