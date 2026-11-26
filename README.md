# DarkSwap on BNB

Private swaps on [BNB Chain New L1](https://docs.bnbchain.org/newl1/overview/), built for the [BNB Bangkok](https://www.hackquest.io/hackathons/BNB-Bangkok) hackathon. Deadline: Friday 27 November 2026, 09:00 Asia/Bangkok.

[DarkSwap](https://darkswap.app) today routes private swaps that start on Solana, through NEAR Intents, with DarkPools shielded balances on Solana. This repository is new code for BNB. It does not modify the production app.

Solana roots. NEAR routes. BNB shield. The agent on BSC is the part that works today; the New L1 shielded pool is where the swap is meant to settle once that network opens.

## What is in the repo

The landing page, plus a public swap rehearsal.

## Landing page

A landing page you can deploy on Vercel:

- Hero for DarkSwap on BNB, in the dark palette used on darkswap.app (near-black ground, lavender accent, Source Sans 3 and Space Mono).
- How a private swap is specified on New L1: shield → atomicCall → reshield, and what stays public.
- The agent angle: a natural-language intent, ERC-8004 identity on BSC testnet.
- Architecture, live devnet status, roadmap, links, and a Built at BNB Bangkok section.

Live status is read from `https://newl1-devnet-rpc.bnbchain.org/` (chain id, latest block, client version, and `ShieldedPool` at `0x0000000000000000000000000000000000005000`: code, `totalShielded`, Merkle root, note queue, deposit pause).

## What is real, and what is simulated

| Piece | Status |
| --- | --- |
| Devnet chain id 1105, RPC, websocket | Documented and read live |
| Shielded pool bytecode and view calls | Real. Selectors answered on devnet |
| Shield → atomicCall → reshield as a user flow | Specified from the docs. This page does not submit it |
| Privacy of a swap | Not claimed here. Circuits are unaudited. Proofs need the `newl1-shield` CLI, which has no public repo |
| Agent quote, cap, and MCP tool | Real. `swap 0.1 bnb…` is quoted and refused at 0.05 BNB. `quote_swap` answers over stdio and over HTTPS at `/api/mcp` on the deployed site |
| Agent execution | Real against the public rehearsal on a local anvil, under the cap. Not a shielded transfer |
| ERC-8004 registration | Script is ready (`bnbagent` 0.5.1, BSC testnet registry `0x8004A818BFB912233c491871b3d84c89A494BD9e`). It publishes the hosted MCP endpoint, so it needs `AGENT_PUBLIC_URL`. Not submitted: no `PRIVATE_KEY` in this environment |
| `PublicRehearsal` + `DemoAMM` | Simulated privacy. Real contracts, cleartext notes, tested in Foundry and run on a local anvil |
| Type `0x77` / `transact` spend | Not executed. Proofs need `newl1-shield` |
| BSC testnet / New L1 deploy of the rehearsal | Not done. Needs `PRIVATE_KEY`, `ORACLE_FEED`, and 0.2 tBNB. See `contracts/README.md` |
| CoinMarketCap BNB/USD check | Implemented. Live only when `CMC_API_KEY` is set. Otherwise skipped, and no request is sent |
| Atlas deviation guard | Implemented against AggregatorV3. Tested with `MockAggregator`. No BSC testnet BNB/USD feed address was published |

Local anvil addresses (chain 31337, ephemeral, not a public network):

| Contract | Address |
| --- | --- |
| DemoAMM | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| rNOTE | `0xa16E02E87b7454126E5E10d957A927A7F5B5d2be` |
| PublicRehearsal | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |

Real pool, read-only, New L1 devnet: `0x0000000000000000000000000000000000005000`.

## Run the page

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:3000`. The public rehearsal quote is at `http://localhost:3000/swap`. Optional: copy `.env.example` to `.env.local` and set `NEWL1_RPC_URL` if you need a different endpoint. No private key is required to read the devnet or to run the quote.

```bash
cd contracts
forge test
./script/probe-devnet.sh
```

`forge test` runs shield → atomic swap → reshield → withdraw on a local EVM. The probe script only reads the devnet pool. Details and the anvil broadcast commands are in `contracts/README.md`.

```bash
npm run build
npm start
```

## What is new, and what is reused

Reused from DarkSwap: the name, the dark visual language (near-black ground, lavender, Source Sans 3, Space Mono), and the product idea of a private swap plus a natural-language intent. The production app at darkswap.app, its Solana routes, and its NEAR Intents integration are not in this repository and are not modified.

New for BNB Bangkok: the landing page, the public rehearsal contracts, the capped agent, the CoinMarketCap BNB/USD check, and the AggregatorV3 deviation guard. See `docs/cmc-atlas-writeup.md` and `docs/hackquest-submission.md`.

## What is new compared with DarkSwap today

Production DarkSwap routes swaps that start on Solana, through NEAR Intents, and keeps DarkPools on Solana. This repo does not change that app. The new pieces are the New L1 shielded-pool read, the public rehearsal of atomicCall, an intent agent aimed at BSC testnet identity, a CoinMarketCap market check, and an oracle guard.

## Agent

```bash
cd agent
PYTHONPATH=. python3 -m unittest discover -s tests
PYTHONPATH=. python3 -m darkswap_agent quote "swap 0.1 bnb to rNOTE privately"
PYTHONPATH=. python3 -m darkswap_agent quote "swap 0.04 bnb to the demo token, privately"
```

The first command exits 1 after a quote: 0.1 BNB is over the 0.05 BNB cap. The second quotes about 39.72159 rNOTE and does not broadcast. `execute` broadcasts the rehearsal only when `RPC_URL`, `REHEARSAL`, and an unlocked `SENDER` are set. See `agent/README.md`.

`python3 -m darkswap_agent mcp` exposes `quote_swap` over MCP stdio. It quotes. It does not take payment.

The deployed site serves the same tool at `/api/mcp` (MCP Streamable HTTP, stateless, one JSON-RPC request per POST). It is read-only and holds no key:

```bash
curl -s https://<your-deployment>/api/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"quote_swap","arguments":{"intent":"swap 0.04 bnb to rNOTE privately"}}}'
```

ERC-8004 registration:

```bash
pip install -r agent/requirements.txt
export PRIVATE_KEY=0x...       # throwaway BSC testnet key
export WALLET_PASSWORD='...'   # SDK keystore password
export AGENT_PUBLIC_URL=https://<your-deployment>   # deploy the site first
cd agent && PYTHONPATH=. python3 -m darkswap_agent register
```

Deploy the site before registering: the registration file records `<AGENT_PUBLIC_URL>/api/mcp`, and the SDK only accepts an `http(s)` endpoint, so a stdio command cannot be registered. Running the command again reuses the existing identity instead of minting a second one. MegaFuel sponsors registration on BSC testnet, so that call does not need tBNB. No identity was minted here.

## Demo script

About three minutes.

1. **0:00.** Open the landing page. Read the receipt: chain id 1105, latest block, shielded BNB, pool `0x…5000`. Say these are live devnet reads. Say the swap on this site is a public rehearsal. There is no type `0x77` proof.
2. **0:25.** Scroll to “Shield, swap, reshield.” Name what stays public: the deposit, the call target, the amount, and a direct fee.
3. **0:45.** Open the market-check panel. If `CMC_API_KEY` is set, read the CoinMarketCap BNB/USD print, the AMM’s implied price (about 987 USD on the seed pool, because 1 rNOTE is treated as 1 USD), and the decision. If the key is unset, say no request was sent. Point at `agent/logs/cmc-requests.jsonl` when a line exists: timestamp, endpoint, status, price, response hash, and no key.
4. **1:20.** Open `/swap`. Show 0.1 BNB quoting 98.715803 rNOTE and the 0.05 cap warning. Change it to 0.04 and show the quote move.
5. **1:45.** In a terminal, with `CMC_API_KEY` set: `cd agent && PYTHONPATH=. python3 -m darkswap_agent quote "swap 0.04 bnb to rNOTE privately"`. The status is `market_refused` when the live BNB print is outside 500 bps of the seed pool. Show the new log line.
6. **2:15.** `cd contracts && forge test --match-test test_guard`. The aligned swap passes inside the existing suite. `test_guardRevertsWhenOracleDeviatesAndDoesNotSpendTheNote` and `test_guardRevertsWhenOracleIsStale` are the Atlas-shaped refusals. Say `ORACLE_FEED` is unset because the public catalog had no BNB/USD SingleFeed on BSC testnet.
7. **2:40.** Quote `swap 0.1 bnb to rNOTE privately` and show the cap refusal, status `refused`, with the market fields still attached.
8. **2:50.** Close on the roadmap: public testnet Q1 2027 and mainnet H2 2027 are BNB Chain FAQ targets dated 2 November 2026, not a launch date. No fee and no token in this build.

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

## Keys and testnet funds

Never commit a private key or seed. `.env.example` lists the names. Nothing in this environment was deployed to BSC testnet or New L1, and no ERC-8004 id was minted.

| Step | Env | Funds |
| --- | --- | --- |
| Read the devnet, quote, run `forge test` | none | none |
| Register the agent on BSC testnet | `PRIVATE_KEY`, `WALLET_PASSWORD`, `AGENT_PUBLIC_URL` | none. MegaFuel sponsors ERC-8004 registration |
| Deploy the guarded rehearsal on BSC testnet or New L1 | `PRIVATE_KEY`, `ORACLE_FEED`, `AMM_BNB_LIQUIDITY=50000000000000000`, `AMM_TOKEN_LIQUIDITY=50000000000000000000` | **0.2 tBNB** on that address |
| Local Anvil deploy | `DEPLOY_SENDER` unlocked account. `ORACLE_FEED` unset | none. The script deploys a mock feed at the pool spot |
| CoinMarketCap check | `CMC_API_KEY` | none. Proof log: `agent/logs/cmc-requests.jsonl` |

The 0.2 tBNB covers 0.05 tBNB of AMM liquidity, deploy gas (about 2.0 million gas; about 0.02 tBNB at 10 gwei, more on New L1 because the fee is on the declared gas limit), and a 0.01 tBNB demo swap. BSC testnet is chain 97: use the [BSC faucet](https://www.bnbchain.org/en/testnet-faucet). New L1 has no faucet; bridge the tBNB. Leaving `AMM_BNB_LIQUIDITY` unset tries to seed 10 tBNB and will not fit a faucet drip.
