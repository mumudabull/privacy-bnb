/**
 * File: lib/atlas.test.ts
 * Purpose: Tests the pure parts of the Atlas feed read: decoding
 * latestRoundData, rescaling the answer, formatting, and the stale-round
 * rules. The first vector is a real response from the BNB/USD SingleFeed on
 * BSC testnet, captured on 26 November 2026.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeLatestRoundData,
  describeStaleRound,
  formatUsdWei,
  scaleAnswerToUsdWei,
  type AtlasRound,
} from "./atlas.ts";

const CAPTURED_LATEST_ROUND_DATA =
  "0x" +
  "0000000000000000000000000000000000000000000000000000000000000001" +
  "00000000000000000000000000000000000000000000001df6933ac6715b51fc" +
  "000000000000000000000000000000000000000000000000000000006b08076b" +
  "000000000000000000000000000000000000000000000000000000006b08076c" +
  "0000000000000000000000000000000000000000000000000000000000000001";

function buildRound(overrides: Partial<AtlasRound>): AtlasRound {
  return {
    roundId: 1n,
    answer: 552n * 10n ** 18n,
    startedAtSeconds: 1_000n,
    updatedAtSeconds: 1_000n,
    answeredInRound: 1n,
    ...overrides,
  };
}

describe("decodeLatestRoundData", () => {
  it("decodes the captured BNB/USD round", () => {
    const round = decodeLatestRoundData(CAPTURED_LATEST_ROUND_DATA);
    assert.equal(round.roundId, 1n);
    assert.equal(round.answer, 0x1df6933ac6715b51fcn);
    assert.equal(round.startedAtSeconds, 0x6b08076bn);
    assert.equal(round.updatedAtSeconds, 0x6b08076cn);
    assert.equal(round.answeredInRound, 1n);
    assert.equal(formatUsdWei(scaleAnswerToUsdWei(round.answer, 18)), "552.72");
  });

  it("reads a word with the top bit set as a negative answer", () => {
    const negativeOne = "f".repeat(64);
    const zeroWord = "0".repeat(64);
    const round = decodeLatestRoundData(`0x${zeroWord}${negativeOne}${zeroWord}${zeroWord}${zeroWord}`);
    assert.equal(round.answer, -1n);
  });

  it("rejects return data that is not five words", () => {
    assert.throws(() => decodeLatestRoundData("0x"));
    assert.throws(() => decodeLatestRoundData(CAPTURED_LATEST_ROUND_DATA.slice(0, -2)));
    assert.throws(() => decodeLatestRoundData(`${CAPTURED_LATEST_ROUND_DATA}00`));
  });
});

describe("scaleAnswerToUsdWei", () => {
  it("scales an 8-decimal answer up and a 20-decimal answer down", () => {
    assert.equal(scaleAnswerToUsdWei(55_272_000_000n, 8), 552_720_000_000_000_000_000n);
    assert.equal(scaleAnswerToUsdWei(55_272n * 10n ** 18n, 20), 552_720_000_000_000_000_000n);
  });

  it("rejects decimals outside a sane range", () => {
    assert.throws(() => scaleAnswerToUsdWei(1n, -1));
    assert.throws(() => scaleAnswerToUsdWei(1n, 37));
    assert.throws(() => scaleAnswerToUsdWei(1n, 1.5));
  });
});

describe("describeStaleRound", () => {
  it("accepts a round inside the age limit", () => {
    assert.equal(describeStaleRound(buildRound({}), 1_000n + 3_600n, 3_600n), null);
  });

  it("flags a round one second past the limit", () => {
    assert.ok(describeStaleRound(buildRound({}), 1_000n + 3_601n, 3_600n));
  });

  it("flags round zero, a zero update time and a future update time", () => {
    assert.ok(describeStaleRound(buildRound({ roundId: 0n }), 1_000n, 3_600n));
    assert.ok(describeStaleRound(buildRound({ updatedAtSeconds: 0n }), 1_000n, 3_600n));
    assert.ok(describeStaleRound(buildRound({ updatedAtSeconds: 2_000n }), 1_000n, 3_600n));
  });
});
