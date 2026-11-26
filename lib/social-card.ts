/**
 * Link-preview image for hack.darkswap.app.
 * The filename is new so Telegram fetches this card instead of a cached one.
 * The swap on this site is a read-only testnet demo, so the card does not say it is live.
 */

export const SOCIAL_CARD = {
  url: "https://hack.darkswap.app/og-darkswap-bnb-hack.png",
  width: 1200,
  height: 630,
  alt: "DarkSwap × BNB Hackathon. Private AI agent swaps on BNB Chain.",
  type: "image/png",
} as const;
