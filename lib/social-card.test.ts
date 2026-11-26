import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { SOCIAL_CARD } from "./social-card.ts";

describe("social card", () => {
  it("uses a fresh absolute image URL on hack.darkswap.app", () => {
    assert.equal(SOCIAL_CARD.url, "https://hack.darkswap.app/og-darkswap-bnb-hack.png");
    assert.equal(SOCIAL_CARD.width, 1200);
    assert.equal(SOCIAL_CARD.height, 630);
    assert.equal(SOCIAL_CARD.type, "image/png");
    assert.match(SOCIAL_CARD.alt, /BNB/);
    assert.doesNotMatch(`${SOCIAL_CARD.alt} ${SOCIAL_CARD.url}`, /NEAR/i);
    assert.doesNotMatch(SOCIAL_CARD.alt, /guaranteed anonymity/i);
  });

  it("is a 1200 by 630 PNG", () => {
    const bytes = readFileSync(new URL("../public/og-darkswap-bnb-hack.png", import.meta.url));
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(bytes.readUInt32BE(16), 1200);
    assert.equal(bytes.readUInt32BE(20), 630);
  });
});
