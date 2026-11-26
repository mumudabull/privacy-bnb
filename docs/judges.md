# Judges

The mascot is Dark Nailong.

BNB Bangkok, Developer Track and CoinMarketCap x Atlas. Contract addresses below are BSC testnet (chain 97) unless a row says otherwise.

## Before Bangkok vs new for Bangkok

**Before Bangkok.** [darkswap.app](https://darkswap.app) is a live private swap app on Solana. It has real users and Multi Exchange. The dark pools program is limited access. That product is unchanged.

**New for Bangkok.** This repository:

- The guarded agent. It quotes, caps the size, and refuses when the price gap is outside the band.
- The Atlas plus CoinMarketCap guard.
- `PublicRehearsal` and `DemoAMM` on BSC testnet, with the rNOTE demo token.
- ERC-8004 agent 2930 on BSC testnet.
- The New L1 shielded-pool integration path. The devnet pool is read at `0x0000000000000000000000000000000000005000` on chain 1105. Proof-backed settlement is roadmap.
- This site.

The rehearsal stores every amount in the clear. It is not a New L1 type `0x77` proof.

## CoinMarketCap x Atlas

| What | BSC testnet |
| --- | --- |
| PublicRehearsal | [`0x8341dC4948FfCecd7dc5cDA1366f3DC55AC24258`](https://testnet.bscscan.com/address/0x8341dC4948FfCecd7dc5cDA1366f3DC55AC24258) |
| DemoAMM | [`0x7C5Cd03B1e554675b146844B7C8Ff3DE20F0Db2E`](https://testnet.bscscan.com/address/0x7C5Cd03B1e554675b146844B7C8Ff3DE20F0Db2E) |
| rNOTE | [`0x9Df7CC1878B45E69A421c2476C00B99E45d68bb7`](https://testnet.bscscan.com/address/0x9Df7CC1878B45E69A421c2476C00B99E45d68bb7) |
| Guarded swap, 41 bps gap | [`0x8e50e2af0598310885023e424abe8025c3695b23747f927637673e8ad6c84fca`](https://testnet.bscscan.com/tx/0x8e50e2af0598310885023e424abe8025c3695b23747f927637673e8ad6c84fca) |
| Atlas BNB/USD, 18 decimals | [`0x3957d289ee9C38272377786787ea34F9dd29788D`](https://testnet.bscscan.com/address/0x3957d289ee9C38272377786787ea34F9dd29788D) |
| ERC-8004 registry, agent 2930 | [`0x8004A818BFB912233c491871b3d84c89A494BD9e`](https://testnet.bscscan.com/address/0x8004A818BFB912233c491871b3d84c89A494BD9e) |
| DecisionLog | [`0x0253Aff4b3493E86EeFfC03FD8b524688cfaFCa2`](https://testnet.bscscan.com/address/0x0253Aff4b3493E86EeFfC03FD8b524688cfaFCa2). Verified on BscScan and Sourcify. Deploy [tx](https://testnet.bscscan.com/tx/0xb5b094fc0538a5501e62de110c5f4c006147040d1fcd9cf4df2fa007a9f3dd8f). Record 0, pass, 20 bps, risk 34 normal: [tx](https://testnet.bscscan.com/tx/0x9746cb34f3e6fa500488f346f5de14cca9eda1d08892b468f311c5b60cc41bbd). Recording from the site is roadmap. |

That transaction called `PublicRehearsal.atomicSwap` and succeeded. The gap for that swap is 41 bps. Registration of agent 2930: [`0xb1e4d02d93129995dfb26f1fed3f2c2ad9eeac997c8d0b9a2d889e1a564b6a00`](https://testnet.bscscan.com/tx/0xb1e4d02d93129995dfb26f1fed3f2c2ad9eeac997c8d0b9a2d889e1a564b6a00). Owner `0x57f37b891980616e76ED2f650e7e38BeAFd59084`.

### How the Atlas feed is read on chain

The feed is Atlas SingleFeed BNB/USD. The Atlas team confirmed this address. `decimals()` returns 18, so the `latestRoundData` answer is already USD per BNB scaled by 1e18.

`PublicRehearsal.atomicSwap` reads `decimals()` and `latestRoundData()` before it spends the note. Spot is `reserveToken / reserveBnb`, treating 1 rNOTE as 1 USD. A round id of 0, a zero or future update time, or an age above `maxStaleSeconds` (default 3600) reverts `StaleOracle` and leaves the note unspent. A non-positive answer reverts `BadOraclePrice`. A gap above `maxDeviationBps` (default 500) reverts `OracleDeviation`. Trade slippage is the separate `minOut` check.

The off-chain quote uses those same two calls with `eth_call` against `https://bsc-testnet-dataseed.bnbchain.org`. That read needs no key. `decimals()` is selector `0x313ce567`. `latestRoundData()` is selector `0xfeaf968c`.

### How CoinMarketCap is used

**Live price.** The server calls `GET https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=BNB&convert=USD`. The key is the `X-CMC_PRO_API_KEY` header from `CMC_API_KEY`. It is not logged and it is not put in the query string. With the key unset, no request is sent and that half of the check is skipped. A returned price is scaled to 18 decimals and compared with the pool. The gap is an integer number of basis points.

**Response hash.** Each call stores the sha256 of the response body. Those 32 bytes are the value `DecisionLog` takes as `cmcResponseHash`. Zero means there was no body.

**Risk score.** When `CMC_API_KEY` is set, the quote path reads CoinMarketCap's BNB quote (1h, 24h, and 7d moves, plus 24h volume change), the fear-and-greed index, and the global market-cap 24h change. `lib/risk.ts` adds the highest matching band for each input. A missing input adds nothing. The total is capped at 100. The bands are a design choice for this build. 0-39 is normal and keeps the 500 bps band and the 0.05 BNB cap. 40-69 is caution: 250 bps and 0.02 BNB. 70-100 is quote-only: 100 bps and a zero cap. [`DecisionLog`](https://testnet.bscscan.com/address/0x0253Aff4b3493E86EeFfC03FD8b524688cfaFCa2) stores the `uint8` the writer submits. Record 0 is 34, the normal tier, with decision pass and a 20 bps gap, written by the operator wallet in [`0x9746cb34f3e6fa500488f346f5de14cca9eda1d08892b468f311c5b60cc41bbd`](https://testnet.bscscan.com/tx/0x9746cb34f3e6fa500488f346f5de14cca9eda1d08892b468f311c5b60cc41bbd). Recording from the site is roadmap.

The two checks can refuse a quote. They do not make the rehearsal private.

### Decision log

An authorized agent can record `atlasPrice`, `cmcPrice`, `cmcResponseHash`, `riskScore`, the gap in bps, an amount, a decision, and an optional `txRef`. The decision is `pass`, `block_gap`, `block_stale`, `block_cap`, or `quote_only`. The owner chooses which addresses may write. Each record emits one event.

The contract is deployed at [`0x0253Aff4b3493E86EeFfC03FD8b524688cfaFCa2`](https://testnet.bscscan.com/address/0x0253Aff4b3493E86EeFfC03FD8b524688cfaFCa2). Deploy transaction [`0xb5b094fc0538a5501e62de110c5f4c006147040d1fcd9cf4df2fa007a9f3dd8f`](https://testnet.bscscan.com/tx/0xb5b094fc0538a5501e62de110c5f4c006147040d1fcd9cf4df2fa007a9f3dd8f). Record 0 is pass, a 20 bps gap, and risk 34 (normal), written by the operator wallet in [`0x9746cb34f3e6fa500488f346f5de14cca9eda1d08892b468f311c5b60cc41bbd`](https://testnet.bscscan.com/tx/0x9746cb34f3e6fa500488f346f5de14cca9eda1d08892b468f311c5b60cc41bbd). Recording from the site is roadmap. The script a local wallet used:

```bash
export DECISION_LOG_AGENT=0x...
export PRIVATE_KEY=0x...
forge script script/DeployDecisionLog.s.sol --rpc-url bsc_testnet --broadcast
```

The field list, units, and ABI are in [decision-log.md](./decision-log.md).

**Roadmap.** Have the site write DecisionLog records. Settle a proof-backed swap on New L1.
