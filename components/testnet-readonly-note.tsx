/**
 * File: components/testnet-readonly-note.tsx
 * Purpose: The status line shown beside the swap and quote controls.
 */

import { TESTNET_READONLY_NOTE } from "@/lib/testnet-note";

export function TestnetReadonlyNote({ text = TESTNET_READONLY_NOTE }: { text?: string }) {
  return (
    // The demo runs on BNB testnet and is read-only for the hackathon, so users and judges aren't misled.
    <p className="banner testnet-readonly-note">{text}</p>
  );
}
