"""File: agent/darkswap_agent/register.py

Purpose: Register the agent's ERC-8004 identity on BSC testnet, publishing the
hosted MCP endpoint (``<AGENT_PUBLIC_URL>/api/mcp``) so explorers and other
agents can call quote_swap. Does not generate a key.
"""

import os
import sys
from urllib.parse import urlsplit

AGENT_NAME = "darkswap-bnb"
MCP_ENDPOINT_PATH = "/api/mcp"
# Newest protocol revision served by app/api/mcp/route.ts.
MCP_PROTOCOL_VERSION = "2025-06-18"
LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}


class PublicUrlError(ValueError):
    """AGENT_PUBLIC_URL cannot be published in an on-chain registration."""


def mcp_endpoint_url(public_url: str) -> str:
    """Return the public MCP endpoint for a deployment base URL.

    The registration file is permanent public metadata, so the URL must be one
    a stranger can reach: https, a real host, and no credentials or query.
    The SDK itself rejects anything that is not http(s), which is why a stdio
    command cannot be registered.
    """
    parts = urlsplit(public_url.strip())
    if parts.scheme != "https":
        raise PublicUrlError("AGENT_PUBLIC_URL must start with https://")
    if not parts.hostname or parts.hostname in LOOPBACK_HOSTS:
        raise PublicUrlError("AGENT_PUBLIC_URL must be a publicly reachable host")
    if parts.username or parts.password or parts.query or parts.fragment:
        raise PublicUrlError("AGENT_PUBLIC_URL must not carry credentials, a query, or a fragment")
    base_path = parts.path.rstrip("/")
    if base_path.endswith(MCP_ENDPOINT_PATH):
        base_path = base_path[: -len(MCP_ENDPOINT_PATH)]
    return f"https://{parts.netloc}{base_path}{MCP_ENDPOINT_PATH}"


def register_agent() -> int:
    private_key = os.environ.get("PRIVATE_KEY", "").strip()
    password = os.environ.get("WALLET_PASSWORD", "").strip()
    public_url = os.environ.get("AGENT_PUBLIC_URL", "").strip()
    if not private_key or not password or not public_url:
        print(
            "ERC-8004 registration needs PRIVATE_KEY, WALLET_PASSWORD, and AGENT_PUBLIC_URL.\n"
            "AGENT_PUBLIC_URL is the deployed site, for example https://your-app.vercel.app.\n"
            "Its /api/mcp endpoint is published in the registration.\n"
            "The SDK signs with the key and encrypts a keystore under the password.\n"
            "On BSC testnet (chain 97) registration is gas-free via MegaFuel, so the\n"
            "address does not need tBNB for this call. Do not commit the key.\n"
            "This command will not generate one.\n"
            "Registry preset in bnbagent 0.5.1: "
            "0x8004A818BFB912233c491871b3d84c89A494BD9e on bsc-testnet.",
            file=sys.stderr,
        )
        return 2

    # Validate the URL before the key is read by the SDK or anything is signed.
    try:
        endpoint_url = mcp_endpoint_url(public_url)
    except PublicUrlError as error:
        print(str(error), file=sys.stderr)
        return 2

    if not private_key.startswith("0x"):
        private_key = "0x" + private_key

    from bnbagent import AgentEndpoint, ERC8004Agent, EVMWalletProvider

    wallet = EVMWalletProvider(password=password, private_key=private_key)
    sdk = ERC8004Agent(network="bsc-testnet", wallet_provider=wallet)

    # Registering twice mints a second identity token. Reuse an existing one.
    existing = sdk.get_local_agent_info(AGENT_NAME)
    if existing is not None:
        print(f"agentId={existing['agent_id']} already registered to {existing['owner_address']}")
        return 0

    agent_uri = sdk.generate_agent_uri(
        name=AGENT_NAME,
        description=(
            "Quotes a natural-language swap intent and, under a 0.05 BNB cap, "
            "executes only the public DarkSwap rehearsal. It does not submit a "
            "shielded proof and it does not custody mainnet funds."
        ),
        endpoints=[AgentEndpoint.mcp(endpoint_url, version=MCP_PROTOCOL_VERSION)],
    )
    result = sdk.register_agent(agent_uri=agent_uri)
    print(
        f"agentId={result.get('agentId')} transaction={result.get('transactionHash')} "
        f"endpoint={endpoint_url}"
    )
    return 0
