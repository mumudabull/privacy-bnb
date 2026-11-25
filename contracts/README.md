# Public rehearsal

A Foundry demo of shield → swap → reshield. It is public on purpose.

| Piece | What it is |
| --- | --- |
| `IShieldedPool` | Interface whose selectors match the live New L1 devnet pool at `0x0000000000000000000000000000000000005000` |
| `DemoAMM` + `DemoToken` (`rNOTE`) | Constant-product pool, 0.30% fee. Not `$DARK` |
| `PublicRehearsal` | Cleartext notes. No proof, no type `0x77`, not the system pool |
| `script/probe-devnet.sh` | Read-only `cast` calls against the real pool |

`atomicSwap` spends a BNB note, swaps to rNOTE, and records an open note. New L1 can reshield native BNB only, so that token note cannot exist inside ShieldedPool. `reshieldBnb` is the native-only step the real pool can do, still stored in the clear here.

## Test

```bash
forge test
```

The 0.1 BNB quote against 10 BNB / 10,000 rNOTE is `98715803439706129885` wei of rNOTE (`98.715…`). The Next.js quote uses the same integer math.

## Probe the real pool

```bash
./script/probe-devnet.sh
```

Requires `cast`. Sends nothing.

## Run the rehearsal on a local anvil

Anvil account 0 is unlocked. This uses the address only. Do not paste a private key into the repo.

```bash
anvil
# another shell, from contracts/
export DEPLOY_SENDER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --unlocked --sender $DEPLOY_SENDER
export REHEARSAL=<PublicRehearsal address from the log>
export DEMO_AMOUNT_WEI=10000000000000000
forge script script/DemoFlow.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --unlocked --sender $DEPLOY_SENDER
```

## Deploy on BSC testnet or New L1 devnet

Stop here unless you already have a throwaway key and testnet funds.

```bash
export PRIVATE_KEY=0x...   # not committed
export AMM_BNB_LIQUIDITY=10000000000000000
forge script script/Deploy.s.sol --rpc-url bsc_testnet --broadcast
```

- `PRIVATE_KEY`: hex key of a throwaway deployer.
- BSC testnet is chain id 97. Fund that address with tBNB from the [BSC faucet](https://www.bnbchain.org/en/testnet-faucet). RPC name in `foundry.toml`: `bsc_testnet`.
- New L1 devnet (chain id 1105) has no faucet. Bridge tBNB from BSC testnet, then point `--rpc-url newl1_devnet` at the same key. The devnet may reset. The pool and the bridge are unaudited.

This environment did not have `PRIVATE_KEY` or a funded deployer, so nothing was deployed to BSC testnet or New L1.

A local anvil run of the scripts above (chain id 31337, ephemeral) produced:

| Contract | Address |
| --- | --- |
| DemoAMM | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| DemoToken (rNOTE) | `0xa16E02E87b7454126E5E10d957A927A7F5B5d2be` |
| PublicRehearsal | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |

`DemoFlow` then shielded 0.01 BNB, swapped, and withdrew `9960069810399032164` wei of rNOTE (about 9.960 rNOTE). Those addresses are Anvil’s first-deploy nonce sequence. They are not on BSC testnet or New L1, and they vanish when the node stops.
