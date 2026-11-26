/**
 * File: components/testnet-readonly-note.tsx
 * Purpose: The status line shown beside the swap and quote controls.
 */

export const TESTNET_READONLY_NOTE =
  "Testnet demo: swaps are read-only on BNB testnet and do not move real funds.";

export function TestnetReadonlyNote() {
  return (
    // The demo runs on BNB testnet and is read-only for the hackathon, so users and judges aren't misled.
    <p className="banner testnet-readonly-note">{TESTNET_READONLY_NOTE}</p>
  );
}
