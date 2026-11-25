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

export const metadata: Metadata = {
  title: "DarkSwap on BNB",
  description:
    "Private swaps on BNB Chain New L1. Shield native BNB, swap through atomicCall, reshield. Built at BNB Bangkok.",
  openGraph: {
    title: "DarkSwap on BNB",
    description:
      "Shield, atomicCall swap, reshield — DarkSwap’s private route, on New L1. Devnet only.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DarkSwap on BNB",
    description: "Private swaps on New L1’s shielded pool. Built at BNB Bangkok.",
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
