import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessRisk, BASE_CAP_WEI, type RiskInputs } from "./risk.ts";

const calm: RiskInputs = {
  change1h: 0,
  change24h: 0,
  change7d: 0,
  volumeChange24h: 0,
  fearGreed: 50,
  marketCapChange24h: 0,
};

describe("risk score", () => {
  it("stays at the on-chain guard when every input is calm", () => {
    const risk = assessRisk(calm);
    assert.equal(risk.score, 0);
    assert.equal(risk.tier, "normal");
    assert.equal(risk.maxDeviationBps, 500);
    assert.equal(risk.capWei, BASE_CAP_WEI);
  });

  it("reaches quote-only at the top of the design bands", () => {
    const risk = assessRisk({
      change1h: 8,
      change24h: 20,
      change7d: 30,
      volumeChange24h: 80,
      fearGreed: 10,
      marketCapChange24h: 5,
    });
    assert.equal(risk.score, 100);
    assert.equal(risk.tier, "quote-only");
    assert.equal(risk.maxDeviationBps, 100);
    assert.equal(risk.capWei, 0n);
  });

  it("does not treat a missing input as an extreme", () => {
    const risk = assessRisk({ ...calm, change1h: null, fearGreed: null });
    assert.equal(risk.score, 0);
    assert.equal(risk.tier, "normal");
  });
});
