import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessFeed, scaleFeedAnswer } from "./atlas.ts";

const NOW = 1_795_658_900n;

describe("atlas feed scaling", () => {
  it("keeps an 18 decimal answer unchanged", () => {
    const answer = 553084174049970300000n;
    assert.equal(scaleFeedAnswer(answer, 18), answer);
  });

  it("scales an 8 decimal answer up to 1e18", () => {
    const answer = 55308417405n;
    assert.equal(scaleFeedAnswer(answer, 8), 553084174050000000000n);
  });

  it("accepts roundId 1 with answeredInRound 0 inside the staleness window", () => {
    const assessed = assessFeed(
      {
        roundId: 1n,
        answer: 553084174049970300000n,
        updatedAt: NOW - 40n,
        answeredInRound: 0n,
        decimals: 18,
      },
      NOW,
      3600n,
    );
    assert.equal(assessed.ok, true);
    if (assessed.ok) assert.equal(assessed.priceWei, 553084174049970300000n);
  });

  it("rejects a round older than the configured window", () => {
    const assessed = assessFeed(
      {
        roundId: 1n,
        answer: 553084174049970300000n,
        updatedAt: NOW - 3601n,
        answeredInRound: 1n,
        decimals: 18,
      },
      NOW,
      3600n,
    );
    assert.deepEqual(assessed, { ok: false, reason: "stale" });
  });
});
