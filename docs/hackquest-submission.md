<!--
File: docs/hackquest-submission.md
Purpose: The field-by-field copy of the "DarkSwap on BNB" HackQuest entry. The site and the README are written to match this file, so change it first when the positioning changes.
-->

# HackQuest fields

Submissions close on 27 November 2026.

Figures are checked against BNB Chain's forum post "Introducing the New L1 Native Privacy Layer" (28 July 2026) and the New L1 privacy docs. The forum post describes an earlier Groth16 circuit and the current docs specify PLONK, so the gas and throughput figures are quoted as that post's measurements.

## Name

DarkSwap on BNB

## Intro

DarkSwap is a shielded zk pool and private swap, live on Solana. We are building our core on BNB Chain's New L1, where the shielded pool is part of the protocol itself.

## Sector

DeFi, Infra

## Tech tags

Next, React, Python, Solidity, Web3, Node, Foundry

## Links

- MVP Link: https://hack.darkswap.app/
- Project Link: https://github.com/mumudabull/privacy-bnb
- X: darkswapapp

## Description

### What DarkSwap is

DarkSwap is a privacy product that is live today at darkswap.app. Its core is Dark Pools, our own shielded zk pool. You deposit, hold a private balance as encrypted notes, send to another shielded address, and withdraw to a public wallet. Your browser makes a zero-knowledge proof that you own the funds and that the amounts balance, and the contract or program checks the proof and prevents the same note being spent twice. Dark Pools has EVM contracts, a Solana program, client-side proofs, encrypted notes and a transaction relayer. Around that core, DarkSwap routes private swaps that start on Solana through NEAR Intents.

### Why we are building our core on New L1

The shielded space on Solana is crowded, and every application-level pool there has to gather its own deposits before it can offer much cover. Activity in a small pool is easier to match by amount and timing. BNB Chain's New L1 takes a different approach. Its shielded pool is part of the protocol: predeployed at genesis at 0x0000000000000000000000000000000000005000, with notes, nullifiers, zero-knowledge proofs and a native shielded transaction type (0x77). Every application on the chain shares that one pool. For DarkSwap this means we stop competing to fill a pool and build on a shared one.

The feature that matters most to us is the atomic call: unshield, call public DeFi, and reshield the result in one transaction. That is a private swap at the protocol level, which is the product DarkSwap exists to offer. BNB Chain's forum post measured it at about 1.01 million gas against a mock DEX, and projects a ceiling of about 740 atomic calls per second at 200 ms blocks and a 150M gas limit.

Two properties of the design match how we already describe Dark Pools. Deposits are public by design: being seen as a pool user is the cost of entering a shielded pool. And governance can pause deposits only, so withdrawals can never be switched off.

### Where DarkSwap fits: the relayer

Relayers are the main way a shielded transaction reaches New L1. The relayer wraps the proofs in an ordinary transaction and pays the gas, so the user's own wallet never appears on it, and the relayer is paid through a private fee note inside the same spend. Dark Pools already runs a transaction relayer for its own pools. Running one on New L1 is the first piece of our core we plan to bring over: it is the part of a private swap that a user cannot do alone, and it is work we already do.

### What we built for this hackathon

This repository is new code. It does not modify the production app.

Live pool reads. The site reads the New L1 devnet (chain 1105) and its ShieldedPool directly, with no key: bytecode, total shielded BNB, Merkle root, note queue and deposit pause state.

A rehearsal of the swap path. Foundry contracts (PublicRehearsal, DemoAMM and a demo token) run shield, atomic swap and reshield end to end, behind an interface whose selectors match the live devnet pool.

Price guards. Before a note is spent, the swap reads an AggregatorV3 feed and reverts on a stale or divergent price, leaving the note unspent. Off chain, each quote is checked against CoinMarketCap BNB/USD and refused when the pool's implied price is outside a 500 bps band. A hard cap of 0.05 BNB limits the rehearsal.

A public quote endpoint. The same quote is served read-only at /api/mcp on the site, so other tools can call it. It holds no key. On BNB Smart Chain testnet that endpoint is registered in the ERC-8004 registry as id 2930.

### What is real, and what is not yet

The swap in this build is a public rehearsal. Every owner and amount is visible, and no privacy is claimed for it. Spending a real shielded note needs BNB Chain's newl1-shield proof CLI, which had no public repository when this was built. New L1 is a devnet, and its circuits are unaudited. Only native BNB can be shielded today; token support has a reserved field in the note and is on BNB Chain's roadmap, as is a per-asset compliance hook. This build is testnet and devnet only, with no fee and no token.

### Roadmap

Public testnet: shield and unshield native BNB through the protocol pool from DarkSwap, and run a relayer. Until tokens are supported, assets that DarkSwap users bridge in from Solana and NEAR land as BNB notes. Mainnet: private swaps through the atomic call. BNB Chain's planning targets are Q1 2027 for the testnet and H2 2027 for mainnet. Those are its FAQ targets, not a DarkSwap launch date.

Solana roots. NEAR routes. BNB shield.

### Tracks

Developer Track and CoinMarketCap x Atlas. The one-page write-up is docs/cmc-atlas-writeup.md in this repository.

## Progress During Hackathon

All code in this repository was written during the hackathon, on 25 and 26 November 2026.

Day one: the site with live reads of the New L1 devnet and its shielded pool; the public rehearsal contracts in Foundry (PublicRehearsal, DemoAMM, the rNOTE demo token, and a quoted minimum on the swap); the capped swap quote; the CoinMarketCap market check and the AggregatorV3 oracle guard.

Day two: the quote served as a public read-only endpoint and registered on BSC testnet; the hackathon page at /hack with a live quote console, and a Simplified Chinese version at /hack/zh; the site deployed at hack.darkswap.app.

Tests: TypeScript tests for the quote, the market check and the page copy, Python tests for the quote service, and a Foundry suite that covers shield, atomic swap, reshield, withdraw, and the two oracle refusals.

## Deployment Details

- Ecosystem: BNB Chain. Network: BSC testnet (chain 97).
- ERC-8004 registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`, entry id 2930, owner `0x57f37b891980616e76ED2f650e7e38BeAFd59084`.
- Registration transaction: https://testnet.bscscan.com/tx/0xb1e4d02d93129995dfb26f1fed3f2c2ad9eeac997c8d0b9a2d889e1a564b6a00
- Read-only: New L1 devnet ShieldedPool at `0x0000000000000000000000000000000000005000` (chain 1105).
- The rehearsal contracts run on a local chain and are not deployed to a public network.

## Links to include

- Repository and the live site
- `docs/cmc-atlas-writeup.md`
- `agent/logs/cmc-requests.jsonl` after a run with `CMC_API_KEY` (proof of the API call; the key is not in the file)
