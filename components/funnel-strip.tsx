/**
 * File: components/funnel-strip.tsx
 * Purpose: Slim banner at the top of the technical front page that sends
 * visitors to the hackathon page (/hack), where the guarded quote can be tried.
 */

import { ArrowRight } from "lucide-react";

export function FunnelStrip() {
  return (
    <a className="funnel-strip" href="/hack">
      <span>
        <strong>DarkSwap is moving onto BNB.</strong> See the hackathon build and try a
        guarded quote.
      </span>
      <ArrowRight size={18} aria-hidden />
    </a>
  );
}
