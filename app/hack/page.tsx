/**
 * File: app/hack/page.tsx
 * Purpose: English route for the standalone hackathon page. Explains what
 * DarkSwap on BNB does today and what waits on New L1, and lets a visitor try
 * the agent's quote live. The Chinese version is at /hack/zh.
 */

import type { Metadata } from "next";
import { HackPageView } from "@/components/hack/hack-page-view";
import { HACK_COPY } from "@/lib/hack-copy";
import { SOCIAL_CARD } from "@/lib/social-card";
import "./hack.css";

const copy = HACK_COPY.en;

export const metadata: Metadata = {
  title: copy.metadataTitle,
  description: copy.metadataDescription,
  openGraph: {
    title: "DarkSwap on BNB: the hackathon build",
    description: "A guarded swap agent on BNB Smart Chain today, built for the New L1 shielded pool.",
    type: "website",
    images: [SOCIAL_CARD],
  },
  twitter: {
    card: "summary_large_image",
    images: [SOCIAL_CARD],
  },
};

export default function HackPage() {
  return <HackPageView locale="en" />;
}
