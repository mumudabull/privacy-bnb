/** New L1 devnet facts, checked against the docs on 25 Nov 2026. */

export const NETWORK = {
  name: "New L1 devnet",
  chainId: 1105,
  rpcUrl: "https://newl1-devnet-rpc.bnbchain.org/",
  wsUrl: "wss://newl1-devnet-rpc.bnbchain.org/ws",
  currency: "BNB",
  blockIntervalMs: 200,
  shieldedPool: "0x0000000000000000000000000000000000005000",
  authVerifier: "0x0000000000000000000000000000000000005003",
  txTypeShielded: "0x77",
  atomicCallOperation: 2,
} as const;

/**
 * BSC testnet rehearsal named in contracts/README.md and docs/judges.md.
 * The recorded transaction swapped 0.01 BNB for rNOTE through PublicRehearsal.
 * It is a past run, not a receipt for a visitor's quote.
 */
export const BSC_TESTNET_CHAIN_ID = 97;
export const PUBLIC_REHEARSAL_ADDRESS = "0x8341dC4948FfCecd7dc5cDA1366f3DC55AC24258";
export const PUBLIC_REHEARSAL_EXPLORER =
  `https://testnet.bscscan.com/address/${PUBLIC_REHEARSAL_ADDRESS}`;
export const RECORDED_REHEARSAL_TX =
  "0x8e50e2af0598310885023e424abe8025c3695b23747f927637673e8ad6c84fca";
export const RECORDED_REHEARSAL_TX_URL = `https://testnet.bscscan.com/tx/${RECORDED_REHEARSAL_TX}`;

export const LINKS = {
  darkswap: "https://darkswap.app",
  darkswapDocs: "https://darkswap.app/docs",
  darkswapX: "https://x.com/darkswapapp",
  repository: "https://github.com/mumudabull/privacy-bnb",
  hackquest: "https://www.hackquest.io/hackathons/BNB-Bangkok",
  overview: "https://docs.bnbchain.org/newl1/overview/",
  privacy: "https://docs.bnbchain.org/newl1/core-concepts/privacy/",
  networkInfo: "https://docs.bnbchain.org/newl1/get-started/network-info/",
  quickGuide: "https://docs.bnbchain.org/newl1/developers/quick-guide/",
  txTypes: "https://docs.bnbchain.org/newl1/developers/transaction-types/",
  systemContracts: "https://docs.bnbchain.org/newl1/governance/system-contracts/",
  faq: "https://docs.bnbchain.org/newl1/faq/general/",
  forum: "https://forum.bnbchain.org/t/introducing-the-new-l1-native-privacy-layer/5481",
  agentSdk: "https://docs.bnbchain.org/developer-kit/bnbagent-sdk/",
  agentRepo: "https://github.com/bnb-chain/bnbagent-sdk",
  mcp: "https://www.npmjs.com/package/@bnb-chain/mcp",
} as const;
