# DarkSwap on BNB: CMC x Atlas

Oracle-guarded public rehearsal of a private swap. Built for BNB Bangkok, Developer Track and the CMC x Atlas bounty. The swap is not a New L1 type `0x77` proof.

## What is on BNB Chain

| Use | Network | Address or data |
| --- | --- | --- |
| ShieldedPool, read-only | New L1 devnet, chain 1105 | `0x0000000000000000000000000000000000005000` |
| Auth verifier, documented | New L1 devnet | `0x0000000000000000000000000000000000005003` |
| ERC-8004 agent id 2930 | BSC testnet, chain 97 | registry `0x8004A818BFB912233c491871b3d84c89A494BD9e`, owner `0x57f37b891980616e76ED2f650e7e38BeAFd59084`, [tx](https://testnet.bscscan.com/tx/0xb1e4d02d93129995dfb26f1fed3f2c2ad9eeac997c8d0b9a2d889e1a564b6a00) |
| Public rehearsal | BSC testnet, chain 97 | [PublicRehearsal](https://testnet.bscscan.com/address/0x8341dC4948FfCecd7dc5cDA1366f3DC55AC24258), [DemoAMM](https://testnet.bscscan.com/address/0x7C5Cd03B1e554675b146844B7C8Ff3DE20F0Db2E), [rNOTE](https://testnet.bscscan.com/address/0x9Df7CC1878B45E69A421c2476C00B99E45d68bb7). Guarded swap, 41 bps gap: [tx](https://testnet.bscscan.com/tx/0x8e50e2af0598310885023e424abe8025c3695b23747f927637673e8ad6c84fca) |
| DecisionLog | Not deployed | Interface in [docs/decision-log.md](./decision-log.md). Run `DeployDecisionLog.s.sol` from a local wallet |
| Atlas BNB/USD | BSC testnet, chain 97 | [`0x3957d289ee9C38272377786787ea34F9dd29788D`](https://testnet.bscscan.com/address/0x3957d289ee9C38272377786787ea34F9dd29788D). Confirmed by the Atlas team, read on chain. 18 decimals. Upgradeable proxy. |

The BSC testnet deploy script uses that feed when `ORACLE_FEED` is unset. Local Anvil still deploys a `MockAggregator` at the pool spot. The guard reads `decimals()` from the feed, so an 18 decimal answer is not treated as an 8 decimal one. `roundId` 1 is a normal round. A round older than `MAX_STALE_SECONDS` (default 1 hour) reverts.

## API calls

CoinMarketCap Pro, server-side only:

`GET https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=BNB&convert=USD`

The key is the `X-CMC_PRO_API_KEY` header from `CMC_API_KEY`. It is not committed, not logged, and not put in the query string. Each call appends one line to `agent/logs/cmc-requests.jsonl` with timestamp, endpoint, query, HTTP status, price, and sha256 of the body.

The agent compares that price with the AMM. One rNOTE is treated as one USD, so rNOTE out per BNB is an implied BNB/USD. Default band is 500 bps (`CMC_MAX_DEVIATION_BPS`). Outside the band, `quote_swap` returns `market_refused` and does not broadcast. The seed pool implies about 555 USD per BNB. On 26 Nov 2026 a live print of 553.71 USD was 23 bps away, inside the band, so 0.04 BNB was quoted. A print more than 5% away returns `market_refused`.

The same check is rendered on the landing page next to the Atlas read. With no key, CoinMarketCap stays skipped. Atlas is read on chain from `https://bsc-testnet-dataseed.bnbchain.org` and needs no key. A quote reports the Atlas price, the pool price, the bps gap, and pass or refuse.

Live evidence, 26 Nov 2026: three CoinMarketCap Pro calls (14:12 and 16:14 Bangkok, all HTTP 200, 554.81 and 553.71 USD). 0.10 BNB was refused by the 0.05 cap. 0.04 BNB quoted 22.045482 rNOTE, a 23 bps gap inside the 500 bps band.

## On-chain guard

`PublicRehearsal.atomicSwap` reads an AggregatorV3 (`latestRoundData`, `decimals`) before it spends the note.

- Round 0, a zero update time, a future update time, or age above `MAX_STALE_SECONDS` reverts `StaleOracle`.
- A non-positive answer reverts `BadOraclePrice`.
- Spot BNB/USD (`reserveToken / reserveBnb`, 1 rNOTE = 1 USD) versus the answer scaled by `decimals()`, above `MAX_DEVIATION_BPS`, reverts `OracleDeviation`. The note stays unspent. Trade slippage is the separate `minOut` check, so a 0.01 BNB swap on a 0.05 BNB / 27.75 rNOTE pool still passes when the feed matches the 555 USD spot. An 18 decimal mock and an 8 decimal mock both cover that scaling.

`forge test` covers the aligned pass (the existing swap), the deviation revert, and the stale revert.

## Safety

Testnet and devnet only. No mainnet key, no `0x77` proof, no claim that the rehearsal hides the sender or the amount. The oracle and CoinMarketCap checks can both refuse a trade. They do not make the rehearsal private. The Atlas team said an on-chain read is enough, and `eth_call` against the BSC testnet feed succeeds without a key.
