import argparse
import json
import sys

from darkswap_agent.mcp_stdio import serve
from darkswap_agent.register import register_agent
from darkswap_agent.service import handle_intent


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="darkswap-agent", description="Quote a capped DarkSwap intent.")
    sub = parser.add_subparsers(dest="command", required=True)

    quote = sub.add_parser("quote", help="Parse and quote. Never broadcasts.")
    quote.add_argument("intent")

    execute = sub.add_parser("execute", help="Quote and, under the cap, run the public rehearsal.")
    execute.add_argument("intent")

    sub.add_parser("register", help="ERC-8004 registration on BSC testnet. Requires env keys.")
    sub.add_parser("mcp", help="Serve quote_swap over MCP stdio.")

    args = parser.parse_args(argv)
    if args.command == "register":
        return register_agent()
    if args.command == "mcp":
        return serve()
    payload = handle_intent(args.intent, execute=args.command == "execute")
    json.dump(payload, sys.stdout, indent=2)
    sys.stdout.write("\n")
    if payload["status"] in {"rejected", "refused", "broadcast_failed"}:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
