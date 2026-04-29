from collections.abc import Iterator
from dataclasses import dataclass


@dataclass
class SpeechSegment:
    text: str
    confidence: float = 0.98
    start_time: float | None = None
    end_time: float | None = None


class SpeechToTextService:
    """Extension point for Google Speech-to-Text, Azure Speech or Whisper."""

    def transcribe_stream(self) -> Iterator[SpeechSegment]:
        raise NotImplementedError("Configure a real speech-to-text provider for production.")


class DemoSpeechToTextService(SpeechToTextService):
    demo_lines = [
        "Bom dia, turma. Hoje vamos estudar tecnologia, dados e informação.",
        "Um sistema usa entrada, processamento e saída para resolver problemas.",
        "Na matemática, a soma e a divisão ajudam a comparar números.",
        "Em ciências, energia, água, planta e animal são palavras importantes.",
        "No final da aula faremos uma atividade em grupo e revisaremos as palavras-chave.",
    ]

    def transcribe_stream(self) -> Iterator[SpeechSegment]:
        for index, text in enumerate(self.demo_lines):
            yield SpeechSegment(text=text, start_time=index * 8.0, end_time=(index + 1) * 8.0)
