from collections import Counter

from app.services.text_normalizer import TextNormalizerService


class KeywordExtractorService:
    technical_terms = {
        "algoritmo",
        "biologia",
        "celula",
        "dados",
        "divisao",
        "energia",
        "equacao",
        "fisica",
        "internet",
        "multiplicacao",
        "quimica",
        "sistema",
        "tecnologia",
    }

    stopwords = {
        "a",
        "o",
        "as",
        "os",
        "um",
        "uma",
        "de",
        "da",
        "do",
        "das",
        "dos",
        "e",
        "em",
        "no",
        "na",
        "nos",
        "nas",
        "para",
        "por",
        "com",
        "que",
        "quando",
        "como",
        "mais",
        "menos",
        "muito",
        "vamos",
        "hoje",
        "sobre",
    }

    def __init__(self) -> None:
        self.normalizer = TextNormalizerService()

    def extract(self, text: str, limit: int = 8) -> list[dict[str, float | str]]:
        words = []
        for raw_word in text.replace(".", " ").replace(",", " ").split():
            normalized = self.normalizer.normalize_word(raw_word)
            if len(normalized) < 3 or normalized in self.stopwords:
                continue
            words.append(normalized)

        scored = Counter(words)
        for term in self.technical_terms.intersection(scored):
            scored[term] += 2

        return [
            {"word": word, "confidence": min(0.99, 0.55 + (score * 0.12))}
            for word, score in scored.most_common(limit)
        ]
