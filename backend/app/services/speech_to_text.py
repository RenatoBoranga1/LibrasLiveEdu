from collections.abc import Iterator
from dataclasses import dataclass


@dataclass
class SpeechSegment:
    text: str
    confidence: float = 0.98
    start_time: float | None = None
    end_time: float | None = None


class SpeechToTextService:
    """Extension point for real speech-to-text providers.

    Production providers should send text only by default. Raw audio storage
    must require explicit consent and a separate retention policy.
    """

    def transcribe_stream(self) -> Iterator[SpeechSegment]:
        raise NotImplementedError("Configure a real speech-to-text provider for production.")


class DemoSpeechToTextProvider(SpeechToTextService):
    demo_lines = [
        "Bom dia, turma. Hoje vamos estudar tecnologia, dados e informacao.",
        "Um sistema usa entrada, processamento e saida para resolver problemas.",
        "Na matematica, a soma e a divisao ajudam a comparar numeros.",
        "Em ciencias, energia, agua, planta e animal sao palavras importantes.",
        "No final da aula faremos uma atividade em grupo e revisaremos as palavras-chave.",
    ]

    def transcribe_stream(self) -> Iterator[SpeechSegment]:
        for index, text in enumerate(self.demo_lines):
            yield SpeechSegment(text=text, start_time=index * 8.0, end_time=(index + 1) * 8.0)


class DemoSpeechToTextService(DemoSpeechToTextProvider):
    """Backward-compatible name used by the demo endpoints."""


class GoogleSpeechToTextProvider(SpeechToTextService):
    def transcribe_stream(self) -> Iterator[SpeechSegment]:
        raise NotImplementedError("Conecte o SDK oficial do Google Speech-to-Text aqui.")


class AzureSpeechProvider(SpeechToTextService):
    def transcribe_stream(self) -> Iterator[SpeechSegment]:
        raise NotImplementedError("Conecte o SDK oficial do Azure Speech aqui.")


class WhisperProvider(SpeechToTextService):
    def transcribe_stream(self) -> Iterator[SpeechSegment]:
        raise NotImplementedError("Conecte o servico Whisper aprovado pela instituicao aqui.")
