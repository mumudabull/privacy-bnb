import type { Metadata } from "next";
import { Source_Sans_3, Space_Mono } from "next/font/google";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl = "https://hack.darkswap.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "DarkSwap on BNB",
  description:
    "Private swaps on BNB Chain New L1. Shield native BNB, swap through atomicCall, reshield. Built at BNB Bangkok.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "DarkSwap on BNB",
    description: "One deep shielded pool instead of fifty shallow ones. Devnet and testnet only.",
    type: "website",
    url: siteUrl,
    images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: "DarkSwap on BNB" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DarkSwap on BNB",
    description: "One deep shielded pool instead of fifty shallow ones.",
    images: ["/brand/og.png"],
  },
};

export const viewport = {
  themeColor: "#07060b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
