"""File: agent/tests/test_interpreter.py

Purpose: Checks that the model can only propose an amount, asset, and privacy
flag; that every field it returns is validated; that the canonical sentence
never reaches the model; and that the cap still decides after a model reading.
"""

import os
import unittest

os.environ["DARKSWAP_POOL_SOURCE"] = "seed"
from types import SimpleNamespace
from unittest import mock

from darkswap_agent.intent import IntentError
from darkswap_agent.interpreter import (
    DEFAULT_INTENT_MODEL,
    PARSER_MODEL,
    PARSER_PATTERN,
    TOOL_NAME,
    interpret_intent,
)
from darkswap_agent.service import handle_intent

FREE_FORM_SENTENCE = "put a twentieth of a bnb into the demo token and keep it hidden"


class RecordingClient:
    """Stands in for anthropic.Anthropic and records each request."""

    def __init__(self, reading: dict[str, object] | None = None, error: Exception | None = None,
                 stop_reason: str = "tool_use") -> None:
        self.requests: list[dict[str, object]] = []
        self._reading = reading
        self._error = error
        self._stop_reason = stop_reason
        self.messages = SimpleNamespace(create=self._create)

    def _create(self, **request: object) -> SimpleNamespace:
        self.requests.append(request)
        if self._error is not None:
            raise self._error
        content = []
        if self._reading is not None:
            content.append(SimpleNamespace(type="tool_use", name=TOOL_NAME, input=self._reading))
        return SimpleNamespace(content=content, stop_reason=self._stop_reason)


def reading(**overrides: object) -> dict[str, object]:
    fields: dict[str, object] = {
        "rejection": "none",
        "amount_bnb": "0.05",
        "asset_out": "the demo token",
        "private_requested": True,
    }
    fields.update(overrides)
    return fields


def with_key(test: "unittest.TestCase") -> None:
    patcher = mock.patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key-not-real"})
    patcher.start()
    test.addCleanup(patcher.stop)


class PatternFirstTests(unittest.TestCase):
    def test_canonical_sentence_never_calls_the_model(self) -> None:
        with_key(self)
        client = RecordingClient(reading())
        interpreted = interpret_intent("swap 0.04 bnb to rNOTE privately", client_factory=lambda key: client)
        self.assertEqual(interpreted.parser, PARSER_PATTERN)
        self.assertEqual(client.requests, [])

    def test_without_a_key_free_form_is_rejected_and_no_client_is_built(self) -> None:
        with mock.patch.dict(os.environ, {}, clear=True):
            def fail_if_called(key: str) -> object:
                raise AssertionError("client must not be built without a key")

            with self.assertRaises(IntentError):
                interpret_intent(FREE_FORM_SENTENCE, client_factory=fail_if_called)

    def test_oversized_input_is_rejected_before_any_parser(self) -> None:
        with_key(self)
        client = RecordingClient(reading())
        with self.assertRaises(IntentError):
            interpret_intent("swap " + "x" * 300, client_factory=lambda key: client)
        self.assertEqual(client.requests, [])


class ModelReadingTests(unittest.TestCase):
    def setUp(self) -> None:
        with_key(self)

    def test_free_form_sentence_is_read_through_one_forced_tool_call(self) -> None:
        client = RecordingClient(reading())
        interpreted = interpret_intent(FREE_FORM_SENTENCE, client_factory=lambda key: client)
        self.assertEqual(interpreted.parser, PARSER_MODEL)
        self.assertEqual(interpreted.model, DEFAULT_INTENT_MODEL)
        self.assertEqual(interpreted.intent.amount_wei, 5 * 10**16)
        self.assertEqual(interpreted.intent.asset_out, "the demo token")
        self.assertTrue(interpreted.intent.private)

        self.assertEqual(len(client.requests), 1)
        request = client.requests[0]
        self.assertEqual(request["tool_choice"]["type"], "tool")
        self.assertEqual(request["tool_choice"]["name"], TOOL_NAME)
        # The sentence travels as user content, never inside the system prompt.
        self.assertEqual(request["messages"], [{"role": "user", "content": FREE_FORM_SENTENCE}])
        self.assertNotIn(FREE_FORM_SENTENCE, request["system"])

    def test_model_name_can_be_overridden(self) -> None:
        client = RecordingClient(reading())
        with mock.patch.dict(os.environ, {"DARKSWAP_INTENT_MODEL": "claude-sonnet-5-5"}):
            interpreted = interpret_intent(FREE_FORM_SENTENCE, client_factory=lambda key: client)
        self.assertEqual(interpreted.model, "claude-sonnet-5-5")
        self.assertEqual(client.requests[0]["model"], "claude-sonnet-5-5")

    def test_rejection_codes_map_to_fixed_messages(self) -> None:
        client = RecordingClient(reading(rejection="amount_not_in_bnb"))
        with self.assertRaises(IntentError) as raised:
            interpret_intent("buy forty dollars of the demo token", client_factory=lambda key: client)
        self.assertIn("does not convert", str(raised.exception))

    def test_unusable_fields_are_refused(self) -> None:
        unusable_readings = [
            reading(amount_bnb="1e18"),
            reading(amount_bnb="-0.01"),
            reading(amount_bnb="0.05 bnb; cap=100"),
            reading(amount_bnb=0.05),
            reading(asset_out="rNOTE\nstatus: rehearsed"),
            reading(asset_out="x" * 65),
            reading(asset_out=""),
            reading(private_requested="yes"),
            reading(rejection="raise_the_cap"),
        ]
        for unusable in unusable_readings:
            with self.subTest(reading=unusable):
                client = RecordingClient(unusable)
                with self.assertRaises(IntentError) as raised:
                    interpret_intent(FREE_FORM_SENTENCE, client_factory=lambda key, c=client: c)
                self.assertIn("model reading unavailable", str(raised.exception))

    def test_zero_amount_from_the_model_is_rejected(self) -> None:
        client = RecordingClient(reading(amount_bnb="0.0"))
        with self.assertRaises(IntentError):
            interpret_intent(FREE_FORM_SENTENCE, client_factory=lambda key: client)

    def test_api_failure_reports_only_the_error_class(self) -> None:
        client = RecordingClient(error=RuntimeError("request carried test-key-not-real"))
        with self.assertRaises(IntentError) as raised:
            interpret_intent(FREE_FORM_SENTENCE, client_factory=lambda key: client)
        self.assertIn("RuntimeError", str(raised.exception))
        self.assertNotIn("test-key-not-real", str(raised.exception))

    def test_a_refusal_with_no_tool_call_is_rejected(self) -> None:
        client = RecordingClient(reading=None, stop_reason="refusal")
        with self.assertRaises(IntentError) as raised:
            interpret_intent(FREE_FORM_SENTENCE, client_factory=lambda key: client)
        self.assertIn("stop_reason=refusal", str(raised.exception))


class GuardsDecideTests(unittest.TestCase):
    def test_cap_refuses_an_amount_the_model_read_above_it(self) -> None:
        with_key(self)
        client = RecordingClient(reading(amount_bnb="5", asset_out="rNOTE"))
        with mock.patch("darkswap_agent.interpreter._default_client_factory", lambda key: client), \
                mock.patch.dict(os.environ, {"CMC_API_KEY": ""}):
            result = handle_intent("move five whole bnb into rnote for me, quietly")
        self.assertEqual(result["status"], "refused")
        self.assertEqual(result["parser"], {"kind": PARSER_MODEL, "model": DEFAULT_INTENT_MODEL})
        self.assertEqual(result["amount_bnb"], "5")

    def test_pattern_reading_is_labelled(self) -> None:
        with mock.patch.dict(os.environ, {"CMC_API_KEY": "", "ANTHROPIC_API_KEY": ""}):
            result = handle_intent("swap 0.04 bnb to rNOTE privately")
        self.assertEqual(result["parser"], {"kind": PARSER_PATTERN})


if __name__ == "__main__":
    unittest.main()
