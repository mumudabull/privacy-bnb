# DarkSwap agent

A small agent that takes a sentence, quotes the public rehearsal, and refuses anything over **0.05 BNB**.

It does not submit a shielded proof. When it broadcasts, it broadcasts `PublicRehearsal` on whatever RPC you point at, and the result says so.

```bash
cd agent
pip install -r requirements-dev.txt
PYTHONPATH=. python3 -m darkswap_agent quote "swap 0.1 bnb to rNOTE privately"
PYTHONPATH=. python3 -m darkswap_agent quote "swap 0.04 bnb to the demo token, privately"
PYTHONPATH=. python3 -m unittest discover -s tests
```

`0.1` is quoted and refused. `0.04` is quoted. `execute` broadcasts only when all three are set:

```bash
export RPC_URL=http://127.0.0.1:8545
export REHEARSAL=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512   # anvil address from contracts/README.md
export SENDER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266       # anvil account 0, unlocked
PYTHONPATH=. python3 -m darkswap_agent execute "swap 0.01 bnb to rNOTE privately"
```

`SENDER` must be unlocked on that node (`anvil`, or `forge` `--unlocked`). This path does not read `PRIVATE_KEY`. A remote testnet that is not unlocked needs a signer; that signer is intentionally not built here, so a key never has to land in this process for the demo. Use `contracts/script/DemoFlow.s.sol` with `PRIVATE_KEY` for BSC testnet or New L1 once the address is funded.

## HTTP

`app.py` is the Vercel Python entrypoint. It exports an ASGI object named `app` (FastAPI). `pyproject.toml` sets `tool.vercel.entrypoint` to `app:app`. `GET /health` returns `{"status": "ok", "mode": "quote-only"}`. `POST /quote` takes `{"intent": "swap 0.04 bnb to rNOTE privately"}`, and `GET /quote?intent=...` takes the same sentence. Both call `handle_intent` with execution left off, so the 0.05 BNB cap and the CoinMarketCap and Atlas guard are the ones in `service.py`. A sentence over the cap comes back as `"status": "refused"` with the quote still filled in. A pool price outside the band comes back as `"status": "market_refused"`. The body is the same object the CLI prints. HTTP status 200 means the quoter ran.

The CLI commands above are unchanged, including `execute`, `register`, and `mcp`.

### agent-bnb on Vercel

That project deploys this directory. In its project settings:

- Root Directory: `agent`
- Framework: FastAPI, or automatic detection once this directory is the root
- Install command and output directory: leave them empty so Vercel installs `requirements.txt` and serves the Python app
- Clear an override that still points the runtime at `darkswap_agent/__main__.py`

`vercel.json` in this directory sets the function timeout and leaves tests and logs out of the bundle. It applies when the project root is `agent`. The privacy-bnb site keeps its root on the repository root, so this file is not part of that Next.js build.

Optional environment variables, same names as the CLI: `CMC_API_KEY`, `CMC_MAX_DEVIATION_BPS`, `RPC_URL_BSC_TESTNET`, `ORACLE_FEED`, `ANTHROPIC_API_KEY`, `DARKSWAP_INTENT_MODEL`, `DARKSWAP_CAP_WEI`. On Vercel the market logs go to `/tmp`. An explicit `CMC_LOG_PATH` or `ATLAS_LOG_PATH` still wins.

## ERC-8004

```bash
pip install -r requirements.txt
export PRIVATE_KEY=0x...          # throwaway BSC testnet key, not committed
export WALLET_PASSWORD='...'      # encrypts the SDK keystore
export AGENT_PUBLIC_URL=https://<your-deployment>   # the deployed site
PYTHONPATH=. python3 -m darkswap_agent register
```

Registered on BSC testnet as agent id **2930**. Registry `0x8004A818BFB912233c491871b3d84c89A494BD9e`. Owner `0x57f37b891980616e76ED2f650e7e38BeAFd59084`. [Transaction](https://testnet.bscscan.com/tx/0xb1e4d02d93129995dfb26f1fed3f2c2ad9eeac997c8d0b9a2d889e1a564b6a00).

`bnbagent` 0.5.1 only accepts an `http://` or `https://` endpoint, so the script publishes `https://hack.darkswap.app/api/mcp` unless `AGENT_PUBLIC_URL` is set. The SDK default RPC `data-seed-prebsc-2-s2.binance.org:8545` is unreachable. The script sets `RPC_URL_BSC_TESTNET` to `https://bsc-testnet-dataseed.bnbchain.org` when that variable is empty. MegaFuel sponsors registration, so the call does not need tBNB. A second registration from a new wallet mints another identity.

## MCP

`python3 -m darkswap_agent mcp` speaks newline-delimited JSON-RPC (MCP stdio, 2024-11-05): `initialize`, `tools/list`, and `tools/call` for `quote_swap`. The tool quotes, calls CoinMarketCap when `CMC_API_KEY` is set, and applies the cap. It does not broadcast and it does not take an x402 payment. A quote whose implied BNB price is outside `CMC_MAX_DEVIATION_BPS` (default 500) returns `market_refused`. Each CMC call appends one line to `logs/cmc-requests.jsonl` (or `CMC_LOG_PATH`) with the price and the response sha256, and without the key. Execution only proceeds for rNOTE, and the on-chain swap uses the live pool quote as its minimum output. The contract also enforces an AggregatorV3 deviation and staleness guard. ERC-8183 escrow is the SDK’s job flow; this hackathon build stops at identity-ready registration plus the capped, market-checked quote.

## Free-form sentences

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...   # never committed
PYTHONPATH=. python3 -m darkswap_agent quote "put a twentieth of a bnb into the demo token and keep it hidden"
```

`interpreter.py` tries the fixed pattern first, so the canonical sentence never calls the model. Any other sentence is sent to Claude (`DARKSWAP_INTENT_MODEL`, default `claude-haiku-5-5`) with one forced tool call that returns a rejection code, an amount in BNB, an asset name, and a privacy flag. Each field is validated before use, and a reading that fails validation is rejected, not repaired. The model cannot set the cap, a price, or a recipient; those are decided by `service.py` after the reading. The result carries `"parser": {"kind": "pattern"}` or `{"kind": "model", "model": "..."}`. Without a key the agent behaves exactly as before.
