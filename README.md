<p align="center">
  <img src="./docs/brand/darkswap-bnb-banner.svg" width="100%" alt="DarkSwap on BNB. Go Dark on BNB. BNB Chain New L1 preview, built at BNB Bangkok.">
</p>

# DarkSwap on BNB

**A trading interface for BNB Chain’s native privacy layer.** DarkSwap brings its intent-based swap experience to BNB Chain New L1. The Bangkok build reads the live shielded pool and lets judges walk through a public swap rehearsal with a capped quoting agent.

**Live demo:** [hack.darkswap.app](https://hack.darkswap.app) · [简体中文](https://hack.darkswap.app/hack/zh) · [technical page](https://hack.darkswap.app/)

[Run the demo](#run-the-demo) · [What stays public](#what-stays-public) · [HackQuest submission notes](./docs/hackquest-submission.md) · [CoinMarketCap × Atlas write-up](./docs/cmc-atlas-writeup.md)

> **BNB Bangkok hackathon preview.** Pool data comes from New L1 devnet. The rehearsal runs with public amounts and cleartext notes on a local chain. Proof-backed swap settlement is the next milestone.

## The three-minute demo

| Time | Show | What to look for |
| --- | --- | --- |
| 0:00 | **Read the live pool.** Open the homepage and find the New L1 devnet receipt. | Chain ID `1105`, the latest block, and the balance of the native ShieldedPool at `0x…5000`. |
| 0:40 | **Ask the agent for a quote.** Open the console at `/hack` or use the CLI below. Enter `0.10 BNB`, then `0.04 BNB`. | The first quote hits the **0.05 BNB** cap. The second lets you inspect the quote and any configured market decision. |
| 1:30 | **Show the market check.** The homepage reads Atlas BNB/USD on BSC testnet with no key. CoinMarketCap appears when `CMC_API_KEY` is set. | The quote shows the Atlas price, the pool price, the bps gap, and pass or refuse. The [sponsor write-up](./docs/cmc-atlas-writeup.md) has the feed address. |
| 2:15 | **Run the public rehearsal.** Walk through shield → swap → reshield on Anvil. | Cleartext notes show the sequence. The contract guard can reject stale or divergent oracle data before spending the note. |

## What runs where

| Capability | Network or environment | Status |
| --- | --- | --- |
| ShieldedPool reads | BNB Chain New L1 devnet · `1105` | Live read-only RPC integration. Pool at `0x0000000000000000000000000000000000005000`. |
| Quote agent and spend cap | Local CLI and MCP | `quote_swap` is available over stdio and via the read-only HTTP endpoint at `/api/mcp`, live at `https://privacy-bnb.vercel.app/api/mcp`. The Python agent supports optional Claude parsing for free-form requests. |
| Swap rehearsal and oracle guard | Local Anvil · `31337` | Executable public flow with a demo AMM, cleartext notes, and a mock AggregatorV3 feed. |
| Atlas BNB/USD | BSC testnet · `97` | [`0x3957d289ee9C38272377786787ea34F9dd29788D`](https://testnet.bscscan.com/address/0x3957d289ee9C38272377786787ea34F9dd29788D). Confirmed by the Atlas team, read on chain. 18 decimals. The quote uses it with no key. |
| CoinMarketCap BNB/USD | CoinMarketCap Pro API | Compared as well when `CMC_API_KEY` is set. With the key unset, that half of the check is skipped. |
| ERC-8004 agent identity | BNB Smart Chain testnet · `97` | Registered. Agent id **2930**. Registry `0x8004A818BFB912233c491871b3d84c89A494BD9e`. Owner `0x57f37b891980616e76ED2f650e7e38BeAFd59084`. [Transaction](https://testnet.bscscan.com/tx/0xb1e4d02d93129995dfb26f1fed3f2c2ad9eeac997c8d0b9a2d889e1a564b6a00). Default RPC is `https://bsc-testnet-dataseed.bnbchain.org`. |
| Proof-backed swap | BNB Chain New L1 devnet | Documented integration path. End-to-end proof generation and settlement are pending. |

## Why DarkSwap

**One deep shielded pool instead of fifty shallow ones.**

- 17.65% of Railgun withdrawals are linkable. [arXiv 2606.25926](https://arxiv.org/abs/2606.25926)
- 95.81% of bridge withdrawals matched from public logs. [arXiv 2409.04937](https://arxiv.org/abs/2409.04937)
- Solana's largest shielded pool holds about $1.18m. Zcash splits its shielded supply across four pools. [DefiLlama](https://defillama.com/protocol/privacy-cash), [Atlas ZEC](https://www.atlaszec.com/shielded.html)

Small, split pools mean thin anonymity sets, and every hop between them leaks.

**Live.** The private swap step is one atomicCall on New L1, about 1.01m gas against a mock DEX ([BNB forum](https://forum.bnbchain.org/t/introducing-the-new-l1-native-privacy-layer/5481)). The preview pool is native BNB, so the funnel lands assets as BNB notes.

**Roadmap.** DarkSwap's ERC-8004 agent (id 2930) becomes the relayer for user intents into one New L1 pool.

**Roadmap, for LPs.** Move liquidity into DarkSwap dark pools on BNB for higher yield and arbitrage flow from private order routing. Not live.

Funnel: any chain, intent, one pool, agent. That funnel is the roadmap. No type 0x77 proof in this repo yet. Deposits are public today.

The seed pool is about 555 rNOTE per BNB so a live CoinMarketCap print can sit inside the 500 bps band. Set `DEMO_RNOTE_PER_BNB` to change it.

## What stays public

In the **intended New L1 flow**, the deposit exposes the depositor, amount and asset. The atomic call reveals the swap target, calldata and input and output amounts. The reshielded open note can keep its owner private while its amount and asset remain visible. The devnet pool currently shields native BNB. The demo’s `rNOTE` is a local test token. [New L1 shielded pool docs](https://docs.bnbchain.org/newl1/core-concepts/privacy/)

## Run the demo

**Web.** Install dependencies and start the Next.js app.

```bash
npm install
npm run dev
```

Open the hackathon console in [English](http://localhost:3000/hack) or [简体中文](http://localhost:3000/hack/zh). The [technical homepage](http://localhost:3000) shows the devnet receipt, and [the swap page](http://localhost:3000/swap) provides a stand-alone rehearsal quote. The pool read and demo quote require no wallet. See [the environment template](./.env.example) for optional RPC and market-data settings. The site can be deployed to Vercel with the repo root and Next.js preset.

**Agent.** Try an over-cap request and an under-cap quote.

```bash
cd agent
PYTHONPATH=. python3 -m darkswap_agent quote "swap 0.1 bnb to rNOTE privately"
PYTHONPATH=. python3 -m darkswap_agent quote "swap 0.04 bnb to rNOTE privately"
```

The over-cap command returns a refusal and exits with status 1. The under-cap command quotes without broadcasting. See the [agent guide](./agent/README.md) for MCP, optional model-based parsing, ERC-8004 registration and local execution.

**Contracts.** From the repo root, use Foundry to run the rehearsal tests and read the devnet pool.

```bash
cd contracts
forge test
./script/probe-devnet.sh
```

See the [contract guide](./contracts/README.md) for the full Anvil walkthrough, local addresses and testnet configuration.

## Built at BNB Bangkok

darkswap.app: live private swaps (private routing) and Multi Exchange, with real users. The Bangkok work adds New L1 pool reads, a public swap rehearsal, capped agent quotes and price guards. The next milestone is a proof-backed native BNB flow on New L1.

[BNB Bangkok on HackQuest](https://www.hackquest.io/hackathons/BNB-Bangkok) · [Demo Night](https://luma.com/5topfryz) · [BNB Chain New L1 docs](https://docs.bnbchain.org/newl1/overview/) · [@darkswapapp](https://x.com/darkswapapp)
