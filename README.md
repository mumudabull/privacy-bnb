# DarkSwap on BNB

Private swaps on [BNB Chain New L1](https://docs.bnbchain.org/newl1/overview/), built for the [BNB Bangkok](https://www.hackquest.io/hackathons/BNB-Bangkok) hackathon. Deadline: Friday 27 November 2026, 09:00 Asia/Bangkok.

[DarkSwap](https://darkswap.app) today routes private swaps that start on Solana, through NEAR Intents, with DarkPools shielded balances on Solana. This repository is new code for BNB. It does not modify the production app.

## What this slice is

A landing page you can deploy on Vercel:

- Hero for DarkSwap on BNB, in the dark palette used on darkswap.app (near-black ground, lavender accent, Source Sans 3 and Space Mono).
- How a private swap is specified on New L1: shield → atomicCall → reshield, and what stays public.
- The agent angle: a natural-language intent, ERC-8004 identity on BSC testnet.
- Architecture, live devnet status, roadmap, links, and a Built at BNB Bangkok section.

Live status is read from `https://newl1-devnet-rpc.bnbchain.org/` (chain id, latest block, client version, and `ShieldedPool` at `0x0000000000000000000000000000000000005000`: code, `totalShielded`, Merkle root, note queue, deposit pause).

## What is real, on this page

| Piece | Status |
| --- | --- |
| Devnet chain id 1105, RPC, websocket | Documented and read live |
| Shielded pool bytecode and view calls | Real. Selectors answered on devnet |
| Shield → atomicCall → reshield as a user flow | Specified from the docs. This page does not submit it |
| Privacy of a swap | Not claimed here. Circuits are unaudited. Proofs need the `newl1-shield` CLI, which has no public repo |
| Agent registration | Described. Not performed by the page |

The swap prototype and the agent land in follow-up changes. They will keep the same rule: a public rehearsal is labeled simulated, and a shielded transaction is only claimed when a real proof is submitted.

## Run the page

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:3000`. Optional: copy `.env.example` to `.env.local` and set `NEWL1_RPC_URL` if you need a different endpoint. No private key is required to read the devnet.

```bash
npm run build
npm start
```

## Deploy

Vercel, framework Next.js, root directory `.`. `NEWL1_RPC_URL` is optional.

## Network facts used here

Checked against the docs on 25 November 2026:

- EVM L1, gas in BNB, devnet chain id **1105**, RPC `https://newl1-devnet-rpc.bnbchain.org/`, websocket `wss://newl1-devnet-rpc.bnbchain.org/ws`.
- No faucet. Devnet BNB is bridged from BSC testnet tBNB.
- Fees charge the declared gas limit. No public mempool. `eth_getProof` is unsupported.
- Opt-in shielded pool at `0x…5000`, auth verifier at `0x…5003`. Transaction type `0x77`: shield is an ordinary `privDeposit`; private transfer, unshield, and atomicCall (operation `2`) go through proofs.
- Native BNB only. Unaudited. Devnet is unstable.
- Planning targets in the [General FAQ](https://docs.bnbchain.org/newl1/faq/general/) (dated 2 November 2026): public testnet **Q1 2027**, mainnet **H2 2027**. Not committed dates.

The [July 2026 forum introduction](https://forum.bnbchain.org/t/introducing-the-new-l1-native-privacy-layer/5481) describes an earlier Groth16 circuit. Current docs specify two PLONK proofs. This repo follows the docs.

## Links

- Product: [darkswap.app](https://darkswap.app) · [docs](https://darkswap.app/docs) · [@darkswapapp](https://x.com/darkswapapp)
- New L1: [overview](https://docs.bnbchain.org/newl1/overview/) · [privacy](https://docs.bnbchain.org/newl1/core-concepts/privacy/) · [network](https://docs.bnbchain.org/newl1/get-started/network-info/) · [quick guide](https://docs.bnbchain.org/newl1/developers/quick-guide/)
- Agents: [BNB Agent SDK](https://docs.bnbchain.org/developer-kit/bnbagent-sdk/) · [github.com/bnb-chain/bnbagent-sdk](https://github.com/bnb-chain/bnbagent-sdk)

## Keys

Never commit a private key or seed. `.env.example` lists the names. Deploying contracts or registering an agent needs `PRIVATE_KEY` and, for the SDK, `WALLET_PASSWORD`, plus testnet funds. This landing page does not use them.
