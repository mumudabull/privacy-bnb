# DarkSwap agent

A small agent that takes a sentence, quotes the public rehearsal, and refuses anything over **0.05 BNB**.

It does not submit a shielded proof. When it broadcasts, it broadcasts `PublicRehearsal` on whatever RPC you point at, and the result says so.

```bash
cd agent
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

## HTTP deployment

The `agent-bnb` Vercel project uses `agent` as its Root Directory, the Python
preset, and `pip install -r requirements.txt` as its Install Command.
`app.py` exports the Flask `app` entrypoint; no custom Build Command is needed.

Run locally:

```bash
cd agent
pip install -r requirements.txt
python3 -m flask --app app run
```

- `GET /` and `GET /health` return service health without calling upstream APIs.
- `POST /quote` accepts only `{"intent":"swap 0.04 bnb to rNOTE privately"}`
  (maximum 280 characters, 8 KiB request body) and returns the existing agent result.
  Rejected/refused quotes are domain results with HTTP 200; malformed requests
  return 400, unsupported content types 415, and oversized bodies 413.

```bash
curl http://127.0.0.1:5000/quote \
  -H 'Content-Type: application/json' \
  -d '{"intent":"swap 0.04 bnb to rNOTE privately"}'
```

The HTTP wrapper always uses `execute=False`; it exposes neither broadcasting
nor registration. CLI and MCP stdio commands are unchanged. This is a quote API,
not an MCP HTTP transport: the existing Next.js site's `/api/mcp` remains the
registered MCP endpoint. Do not point the registration at this Python service.

Market/model settings are the same as for the CLI. Live quotes depend on the
configured RPC and optional API providers; health does not verify those providers.
On Vercel, default CMC and Atlas request logs go to ephemeral `/tmp` files so
quotes do not write to the read-only deployment source. Explicit `CMC_LOG_PATH`
and `ATLAS_LOG_PATH` values are respected and must also be writable.
The quote endpoint has no application-level authentication or distributed rate
limit; restrict access before exposing configured paid API providers publicly.

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
