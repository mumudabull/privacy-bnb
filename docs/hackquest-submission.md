# HackQuest fields

Deadline: Friday 27 November 2026, 09:00 Asia/Bangkok (02:00 UTC).

## Name

DarkSwap on BNB

## Tagline

Say the swap. A guarded agent built for BNB's shielded pool.

## Description

DarkSwap on BNB is a new hackathon codebase for a private swap on BNB Chain. The live New L1 devnet shielded pool is read at `0x…5000`. Spending a note needs the unpublished `newl1-shield` proof CLI, so the swap that runs here is a public rehearsal: shield, swap on a demo AMM, reshield, with every amount visible.

An agent takes a sentence such as “swap 0.04 bnb to rNOTE privately”. Free-form sentences are read by a Claude model through one forced tool call that can return only an amount, an asset, and a privacy flag; the model proposes and deterministic guards decide. The agent quotes the pool, reads Atlas BNB/USD on BSC testnet, and asks CoinMarketCap when a key is set. It refuses the trade when the pool is outside the bps band or when the amount is above 0.05 BNB. On chain, `atomicSwap` refuses when the feed is stale or when the AMM’s implied BNB price diverges from it. The default feed is `0x3957d289ee9C38272377786787ea34F9dd29788D`, confirmed by the Atlas team, read on chain.

The agent's `quote_swap` tool is public over MCP at `/api/mcp` on the deployed site, and that URL is what the ERC-8004 registration on BSC testnet publishes. It is read-only and holds no key.

The production app at darkswap.app is unchanged. This repository is the new code.

## Tracks

- Developer Track
- CMC x Atlas bounty

## Links to include

- Repository
- Pull requests, stacked from the landing page through this guard
- `docs/cmc-atlas-writeup.md`
- `agent/logs/cmc-requests.jsonl` after a run with `CMC_API_KEY` (proof of the API call; the key is not in the file)
