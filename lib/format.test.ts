import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBnb, queueCaughtUp, shortenHex } from "./format.ts";

describe("formatBnb", () => {
  it("formats whole and fractional devnet balances", () => {
    assert.equal(formatBnb(0n), "0");
    assert.equal(formatBnb(1_000000000000000000n), "1");
    assert.equal(formatBnb(40_995002206000000000n), "40.995");
    assert.equal(formatBnb(100_000000000000000n), "0.1");
  });
});

describe("shortenHex", () => {
  it("keeps short values and truncates roots", () => {
    assert.equal(shortenHex("0xabc"), "0xabc");
    const root = `0x${"ab".repeat(32)}`;
    assert.equal(shortenHex(root), `0xabababab…${"ab".repeat(4)}`);
  });
});

describe("queueCaughtUp", () => {
  it("treats equal head and count as a drained queue", () => {
    assert.equal(queueCaughtUp(48710n, 48710n), true);
    assert.equal(queueCaughtUp(10n, 8n), false);
  });
});
