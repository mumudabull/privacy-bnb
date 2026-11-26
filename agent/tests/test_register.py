"""File: agent/tests/test_register.py

Purpose: Checks that registration only ever publishes a reachable https MCP
endpoint, and that it stops before touching the key when the URL is unusable.
"""

import os
import unittest
from unittest import mock

from darkswap_agent.register import PublicUrlError, mcp_endpoint_url, register_agent


class EndpointUrlTests(unittest.TestCase):
    def test_appends_the_mcp_path_once(self) -> None:
        expected = "https://darkswap-bnb.vercel.app/api/mcp"
        self.assertEqual(mcp_endpoint_url("https://darkswap-bnb.vercel.app"), expected)
        self.assertEqual(mcp_endpoint_url("https://darkswap-bnb.vercel.app/"), expected)
        self.assertEqual(mcp_endpoint_url("https://darkswap-bnb.vercel.app/api/mcp"), expected)

    def test_rejects_urls_a_stranger_cannot_reach(self) -> None:
        for unusable in (
            "http://darkswap-bnb.vercel.app",
            "https://localhost:3000",
            "https://127.0.0.1",
            "stdio:python -m darkswap_agent quote",
            "https://user:secret@example.org",
            "https://example.org/?token=abc",
            "",
        ):
            with self.subTest(url=unusable), self.assertRaises(PublicUrlError):
                mcp_endpoint_url(unusable)

    def test_sdk_accepts_the_endpoint_and_rejects_stdio(self) -> None:
        try:
            from bnbagent import AgentEndpoint
        except ImportError:
            self.skipTest("bnbagent is not installed")
        endpoint = AgentEndpoint.mcp(mcp_endpoint_url("https://example.org"), version="2025-06-18")
        self.assertEqual(endpoint.name, "MCP")
        self.assertEqual(endpoint.endpoint, "https://example.org/api/mcp")
        with self.assertRaises(ValueError):
            AgentEndpoint(name="quote", endpoint="stdio:python -m darkswap_agent quote")


class RegisterGuardTests(unittest.TestCase):
    def test_missing_configuration_exits_before_the_sdk_is_imported(self) -> None:
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(register_agent(), 2)

    def test_bad_public_url_exits_without_signing(self) -> None:
        environment = {
            "PRIVATE_KEY": "0x" + "11" * 32,
            "WALLET_PASSWORD": "test-password",
            "AGENT_PUBLIC_URL": "http://insecure.example.org",
        }
        with mock.patch.dict(os.environ, environment, clear=True):
            self.assertEqual(register_agent(), 2)


if __name__ == "__main__":
    unittest.main()
