# HackQuest fields

Deadline: Friday 27 November 2026, 09:00 Asia/Bangkok (02:00 UTC).

## Name

DarkSwap on BNB

## Tagline

An oracle-guarded swap rehearsal on BNB, quoted by a capped agent.

## Description

DarkSwap on BNB is a new hackathon codebase for a private swap on BNB Chain. The live New L1 devnet shielded pool is read at `0x…5000`. Spending a note needs the unpublished `newl1-shield` proof CLI, so the swap that runs here is a public rehearsal: shield, swap on a demo AMM, reshield, with every amount visible.

An agent takes a sentence such as “swap 0.04 bnb to rNOTE privately”. It quotes the pool, asks CoinMarketCap for BNB/USD, and refuses the trade when that print is outside a bps band or when the amount is above 0.05 BNB. On chain, `atomicSwap` refuses when an AggregatorV3 feed is stale or when the AMM’s implied BNB price diverges from it. The feed address is configuration. No BNB/USD Atlas feed on BSC testnet was published in the catalog checked for this build.

The production app at darkswap.app is unchanged. This repository is the new code.

## Tracks

- Developer Track
- CMC x Atlas bounty

## Links to include

- Repository
- Pull requests, stacked from the landing page through this guard
- `docs/cmc-atlas-writeup.md`
- `agent/logs/cmc-requests.jsonl` after a run with `CMC_API_KEY` (proof of the API call; the key is not in the file)
