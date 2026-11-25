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

export const LINKS = {
  darkswap: "https://darkswap.app",
  darkswapDocs: "https://darkswap.app/docs",
  darkswapX: "https://x.com/darkswapapp",
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
