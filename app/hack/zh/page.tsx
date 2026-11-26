/**
 * File: app/hack/zh/page.tsx
 * Purpose: Simplified Chinese route for the hackathon page. Same structure as
 * /hack, with Chinese text and a Chinese typeface loaded only on this route.
 */

import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import { HackPageView } from "@/components/hack/hack-page-view";
import { HACK_COPY } from "@/lib/hack-copy";
import { SOCIAL_CARD } from "@/lib/social-card";
import "../hack.css";

/*
 * Noto Sans SC covers the full Simplified Chinese character set. Google serves
 * it in unicode-range slices, so a visitor downloads only the slices holding
 * characters that appear on the page. Preloading is off because there is no
 * single file to preload for a font split this way.
 */
const chineseSans = Noto_Sans_SC({
  weight: ["400", "600"],
  variable: "--font-chinese",
  display: "swap",
  preload: false,
});

const copy = HACK_COPY.zh;

export const metadata: Metadata = {
  title: copy.metadataTitle,
  description: copy.metadataDescription,
  openGraph: {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    type: "website",
    locale: "zh_CN",
    images: [SOCIAL_CARD],
  },
  twitter: {
    card: "summary_large_image",
    images: [SOCIAL_CARD],
  },
};

export default function HackPageChinese() {
  return <HackPageView locale="zh" className={chineseSans.variable} />;
}
