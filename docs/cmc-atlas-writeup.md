# DarkSwap on BNB — CMC x Atlas

Oracle-guarded public rehearsal of a private swap. Built for BNB Bangkok, Developer Track and the CMC x Atlas bounty. The swap is not a New L1 type `0x77` proof.

## What is on BNB Chain

| Use | Network | Address or data |
| --- | --- | --- |
| ShieldedPool, read-only | New L1 devnet, chain 1105 | `0x0000000000000000000000000000000000005000` |
| Auth verifier, documented | New L1 devnet | `0x0000000000000000000000000000000000005003` |
| ERC-8004 agent id 2930 | BSC testnet, chain 97 | registry `0x8004A818BFB912233c491871b3d84c89A494BD9e`, owner `0x57f37b891980616e76ED2f650e7e38BeAFd59084`, [tx](https://testnet.bscscan.com/tx/0xb1e4d02d93129995dfb26f1fed3f2c2ad9eeac997c8d0b9a2d889e1a564b6a00) |
| Public rehearsal | Not deployed | Needs `PRIVATE_KEY`, `ORACLE_FEED`, and 0.2 tBNB |

No BNB/USD Atlas SingleFeed on BSC testnet was in the public catalog at https://atlasoracle.io/feeds on 25 Nov 2026. The listed BNB Chain feeds are other pairs and share `0xeace519ebb14fb8404fa6ddd23c3b34abade44aa`. That address is not used as a BNB/USD aggregator. `ORACLE_FEED` is required configuration. Tests use `MockAggregator`.

## API calls

CoinMarketCap Pro, server-side only:

`GET https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=BNB&convert=USD`

The key is the `X-CMC_PRO_API_KEY` header from `CMC_API_KEY`. It is not committed, not logged, and not put in the query string. Each call appends one line to `agent/logs/cmc-requests.jsonl` with timestamp, endpoint, query, HTTP status, price, and sha256 of the body.

The agent compares that price with the AMM. One rNOTE is treated as one USD, so rNOTE out per BNB is an implied BNB/USD. Default band is 500 bps (`CMC_MAX_DEVIATION_BPS`). Outside the band, `quote_swap` returns `market_refused` and does not broadcast. The seed pool spot is 555 USD per BNB (`DEMO_RNOTE_PER_BNB`, default 555), set near the market, so a live print passes when BNB trades within the band of 555 and refuses when it does not. Either outcome is the decision, and it is recorded with the request in the log.

The same check is rendered on the landing page. With no key, the page says the request was not sent.

## On-chain guard

`PublicRehearsal.atomicSwap` reads an AggregatorV3 (`latestRoundData`, `decimals`) before it spends the note.

- Round 0, a zero update time, a future update time, or age above `MAX_STALE_SECONDS` reverts `StaleOracle`.
- A non-positive answer reverts `BadOraclePrice`.
- Spot BNB/USD (`reserveToken / reserveBnb`, 1 rNOTE = 1 USD) versus the scaled oracle answer, above `MAX_DEVIATION_BPS`, reverts `OracleDeviation`. The note stays unspent. Trade slippage is the separate `minOut` check, so a 0.01 BNB swap on a 0.05 BNB / 50 rNOTE pool still passes when the feed matches the 1000 USD spot.

`forge test` covers the aligned pass (the existing swap), the deviation revert, and the stale revert.

## Safety

Testnet and devnet only. No mainnet key, no `0x77` proof, no claim that the rehearsal hides the sender or the amount. The oracle and CoinMarketCap checks can both refuse a trade. They do not make the rehearsal private. Atlas feeds may be whitelist-gated; a closed feed will revert on read until the contract is allowed.
