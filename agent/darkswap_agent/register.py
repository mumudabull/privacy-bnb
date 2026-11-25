"""Register an ERC-8004 identity on BSC testnet. Does not generate a key."""

import os
import sys


def register_agent() -> int:
    private_key = os.environ.get("PRIVATE_KEY", "").strip()
    password = os.environ.get("WALLET_PASSWORD", "").strip()
    if not private_key or not password:
        print(
            "ERC-8004 registration needs PRIVATE_KEY and WALLET_PASSWORD.\n"
            "The SDK signs with that key and encrypts a keystore under the password.\n"
            "On BSC testnet (chain 97) registration is gas-free via MegaFuel, so the\n"
            "address does not need tBNB for this call. Do not commit the key.\n"
            "This command will not generate one.\n"
            "Registry preset in bnbagent 0.5.1: "
            "0x8004A818BFB912233c491871b3d84c89A494BD9e on bsc-testnet.",
            file=sys.stderr,
        )
        return 2
    if not private_key.startswith("0x"):
        private_key = "0x" + private_key

    from bnbagent import AgentEndpoint, ERC8004Agent, EVMWalletProvider

    wallet = EVMWalletProvider(password=password, private_key=private_key)
    sdk = ERC8004Agent(network="bsc-testnet", wallet_provider=wallet)
    agent_uri = sdk.generate_agent_uri(
        name="darkswap-bnb",
        description=(
            "Quotes a natural-language swap intent and, under a 0.05 BNB cap, "
            "executes only the public DarkSwap rehearsal. It does not submit a "
            "shielded proof and it does not custody mainnet funds."
        ),
        endpoints=[
            AgentEndpoint(name="quote", endpoint="stdio:python -m darkswap_agent quote", version="0.1.0"),
        ],
    )
    result = sdk.register_agent(agent_uri=agent_uri)
    print(f"agentId={result.get('agentId')} transaction={result.get('transactionHash')}")
    return 0
