from app.services.keyword_extractor import KeywordExtractorService
from app.services.text_normalizer import TextNormalizerService


def test_normalize_word_removes_accents_and_punctuation():
    normalizer = TextNormalizerService()
    assert normalizer.normalize_word("Informação!") == "informacao"
    assert normalizer.normalize_word("sala de informática") == "saladeinformatica"


def test_split_long_sentence_creates_short_blocks():
    normalizer = TextNormalizerService()
    blocks = normalizer.split_long_sentences(
        "Hoje vamos estudar tecnologia dados informacao sistema entrada processamento saida problema resultado.",
        max_words=5,
    )
    assert len(blocks) >= 2
    assert all(len(block.split()) <= 5 for block in blocks)


def test_keyword_extractor_prioritizes_technical_terms():
    extractor = KeywordExtractorService()
    keywords = extractor.extract("Tecnologia, dados e sistema ajudam na aula de tecnologia.")
    words = [item["word"] for item in keywords]
    assert "tecnologia" in words
    assert "dados" in words
