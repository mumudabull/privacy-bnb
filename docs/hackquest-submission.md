# HackQuest fields

Deadline: Friday 27 November 2026, 09:00 Asia/Bangkok (02:00 UTC).

## Name

DarkSwap on BNB

## Tagline

Say the swap. A guarded agent built for BNB's shielded pool.

## Description

DarkSwap on BNB is a new hackathon codebase for a private swap on BNB Chain. The live New L1 devnet shielded pool is read at `0x…5000`. Spending a note needs the unpublished `newl1-shield` proof CLI, so the swap that runs here is a public rehearsal: shield, swap on a demo AMM, reshield, with every amount visible.

An agent takes a sentence such as “swap 0.04 bnb to rNOTE privately”. Free-form sentences are read by a Claude model through one forced tool call that can return only an amount, an asset, and a privacy flag; the model proposes and deterministic guards decide. The agent quotes the pool, asks CoinMarketCap for BNB/USD, and refuses the trade when that print is outside a bps band or when the amount is above 0.05 BNB. On chain, `atomicSwap` refuses when an AggregatorV3 feed is stale or when the AMM’s implied BNB price diverges from it. The feed address is configuration. No BNB/USD Atlas feed on BSC testnet was published in the catalog checked for this build.

The agent's `quote_swap` tool is public over MCP at `/api/mcp` on the deployed site, and that URL is what the ERC-8004 registration on BSC testnet publishes. It is read-only and holds no key.

The next step is for DarkSwap’s agent to relay user-authorized swaps. It would submit the proof from its own address, pay the gas and receive a private fee note. On New L1, `atomicCall` unshields into a public DeFi call and reshields the return in one transaction. BNB Chain’s July 2026 forum post measured about **1.01 million gas** for this flow against a mock DEX on the earlier Groth16 design. The devnet shielded pool currently accepts native BNB. Our planned cross-chain route converts supported assets into BNB before bridging and shielding. [New L1 docs](https://docs.bnbchain.org/newl1/core-concepts/privacy/) · [Forum benchmark](https://forum.bnbchain.org/t/introducing-the-new-l1-native-privacy-layer/5481)

The production app at darkswap.app is unchanged. This repository is the new code.

## Tracks

- Developer Track
- CMC x Atlas bounty

## Links to include

- Repository
- Pull requests, stacked from the landing page through this guard
- `docs/cmc-atlas-writeup.md`
- `agent/logs/cmc-requests.jsonl` after a run with `CMC_API_KEY` (proof of the API call; the key is not in the file)
