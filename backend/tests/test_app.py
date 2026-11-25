import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import app


class FakeOllamaResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"message": {"content": "El campus está en Ciudad Victoria."}}


class FakeOllamaClient:
    last_payload = None

    def __init__(self, timeout):
        self.timeout = timeout

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        return None

    async def post(self, url, json):
        FakeOllamaClient.last_payload = json
        return FakeOllamaResponse()


class FakeEdgeCommunicator:
    def __init__(self, text, voice):
        self.text = text
        self.voice = voice

    async def stream(self):
        yield {"type": "audio", "data": b"test-audio"}


class AssistantApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_chat_uses_retrieved_context_and_returns_source_files(self):
        with patch("backend.app.httpx.AsyncClient", FakeOllamaClient):
            response = self.client.post(
                "/api/chat",
                json={
                    "message": "¿Dónde está el campus de Ciudad Victoria?",
                    "model": "qwen2.5:7b",
                    "history": [],
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], "El campus está en Ciudad Victoria.")
        self.assertTrue(response.json()["sources"])
        system_message = FakeOllamaClient.last_payload["messages"][0]["content"]
        self.assertIn("<contexto>", system_message)
        self.assertTrue(any("TECNOTAM" in message["content"] for message in FakeOllamaClient.last_payload["messages"]))

    def test_speech_returns_audio_for_a_configured_voice(self):
        with patch("backend.app.edge_tts.Communicate", FakeEdgeCommunicator):
            response = self.client.post(
                "/api/speech",
                json={"text": "Hola.", "voice": "es-MX-DaliaNeural"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "audio/mpeg")
        self.assertEqual(response.content, b"test-audio")

    def test_speech_rejects_unconfigured_voice(self):
        response = self.client.post(
            "/api/speech",
            json={"text": "Hola.", "voice": "es-MX-NotConfiguredNeural"},
        )
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
