import re
import unicodedata


class TextNormalizerService:
    accent_fallbacks = str.maketrans({"ç": "c", "Ç": "c"})

    def normalize(self, text: str) -> str:
        text = text.strip().lower()
        text = re.sub(r"\s+", " ", text)
        return text

    def normalize_word(self, word: str) -> str:
        normalized = unicodedata.normalize("NFKD", word.strip().translate(self.accent_fallbacks).lower())
        normalized = "".join(char for char in normalized if not unicodedata.combining(char))
        normalized = re.sub(r"[^a-z0-9]+", "", normalized)
        return normalized

    def split_long_sentences(self, text: str, max_words: int = 12) -> list[str]:
        raw_sentences = [part.strip() for part in re.split(r"(?<=[.!?;])\s+", text) if part.strip()]
        blocks: list[str] = []
        for sentence in raw_sentences or [text]:
            words = sentence.split()
            if len(words) <= max_words:
                blocks.append(sentence)
                continue
            for index in range(0, len(words), max_words):
                blocks.append(" ".join(words[index : index + max_words]))
        return blocks
