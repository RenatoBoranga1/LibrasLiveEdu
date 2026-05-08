import json

from app.importers.ines_site_crawler import InesSiteCrawler
from app.importers.libras_gif_site_crawler import LibrasGifSiteCrawler
from app.importers.media_auto_fill_importer import MediaAutoFillImporter


def test_ines_site_crawler_extracts_video_and_support_image(monkeypatch):
    monkeypatch.setattr(
        "app.importers.ines_site_crawler.validate_remote_media",
        lambda url, expected, timeout, user_agent: {
            "valid": True,
            "http_status": 200,
            "content_type": "video/mp4",
            "media_type": expected,
        },
    )
    crawler = InesSiteCrawler(max_pages=5, delay_ms=0)
    html = """
    <html>
      <body>
        Palavra: aprender
        <img src="/public/media/mao/cg51a.jpg">
        <source src="/public/media/palavras/videos/aprenderSm_Prog001.mp4">
      </body>
    </html>
    """

    entry = crawler._extract_entry(html, "https://dicionario.ines.gov.br/?q=aprender")

    assert entry is not None
    assert entry["image_url"] == "https://dicionario.ines.gov.br/public/media/mao/cg51a.jpg"
    assert entry["video_url"] == "https://dicionario.ines.gov.br/public/media/palavras/videos/aprenderSm_Prog001.mp4"
    assert entry["avatar_video_url"] == entry["video_url"]
    assert entry["media_type"] == "video"
    assert entry["can_use_avatar"] is True


def test_ines_site_crawler_does_not_treat_jpg_as_avatar():
    crawler = InesSiteCrawler(max_pages=5, delay_ms=0)
    html = """
    <html>
      <body>
        Palavra: aprender
        <img src="/public/media/mao/cg51a.jpg">
      </body>
    </html>
    """

    entry = crawler._extract_entry(html, "https://dicionario.ines.gov.br/?q=aprender")

    assert entry is not None
    assert entry["image_url"] == "https://dicionario.ines.gov.br/public/media/mao/cg51a.jpg"
    assert entry["video_url"] is None
    assert entry["avatar_video_url"] is None
    assert entry["media_type"] == "image"
    assert entry["can_use_avatar"] is False


def test_ines_site_crawler_generates_manifest_and_deduplicates(monkeypatch):
    monkeypatch.setattr(
        "app.importers.ines_site_crawler.validate_remote_media",
        lambda url, expected, timeout, user_agent: {
            "valid": True,
            "http_status": 200,
            "content_type": "video/mp4",
            "media_type": expected,
        },
    )
    crawler = InesSiteCrawler(max_pages=2, delay_ms=0)
    crawler._seed_urls = lambda words: ["https://dicionario.ines.gov.br/?q=aprender", "https://dicionario.ines.gov.br/?q=aprender-2"]  # type: ignore[method-assign]

    def fake_fetch(client, url):
        crawler.visited.add(url)
        return """
        <html>
          <body>
            Palavra: aprender
            <source src="/public/media/palavras/videos/aprenderSm_Prog001.mp4">
          </body>
        </html>
        """

    monkeypatch.setattr(crawler, "_fetch", fake_fetch)

    manifest = crawler.crawl(words=["aprender"], dry_run=True)

    assert manifest["total_entries"] == 2
    assert "aprender" in manifest["entries"]
    assert manifest["duplicates"]
    assert manifest["report"]["pages_visited"] == 2


def test_libras_gif_site_crawler_extracts_gif_with_alt_text(monkeypatch):
    monkeypatch.setattr(
        "app.importers.libras_gif_site_crawler.validate_remote_media",
        lambda url, expected, timeout, user_agent: {
            "valid": True,
            "http_status": 200,
            "content_type": "image/gif",
            "media_type": expected,
        },
    )
    crawler = LibrasGifSiteCrawler(max_pages=5, delay_ms=0)
    html = """
    <html>
      <body>
        <figure>
          <img alt="Professor em Libras" src="/wp-content/uploads/professor.gif">
          <figcaption>Professor</figcaption>
        </figure>
      </body>
    </html>
    """

    entries = crawler._extract_entries(html, "https://ifpr.edu.br/umuarama/libras-gifs/")

    assert len(entries) == 1
    assert entries[0]["normalized_word"] == "professor"
    assert entries[0]["avatar_gif_url"] == "https://ifpr.edu.br/wp-content/uploads/professor.gif"
    assert entries[0]["media_type"] == "gif"
    assert entries[0]["can_use_avatar"] is True


def test_media_auto_fill_uses_manifest_before_live_lookup(tmp_path, monkeypatch):
    manifest = {
        "source_name": "Dicionário da Língua Brasileira de Sinais - INES",
        "source_url": "https://dicionario.ines.gov.br/",
        "license": "Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu",
        "license_notes": "Mídia autorizada para uso educacional.",
        "entries": {
            "professor": {
                "word": "professor",
                "normalized_word": "professor",
                "video_url": "https://dicionario.ines.gov.br/public/media/palavras/videos/professorSm_Prog001.mp4",
                "avatar_video_url": "https://dicionario.ines.gov.br/public/media/palavras/videos/professorSm_Prog001.mp4",
                "media_type": "video",
                "can_use_avatar": True,
                "detection_method": "site_crawl",
            }
        },
    }
    (tmp_path / "ines_video_manifest.generated.json").write_text(json.dumps(manifest), encoding="utf-8")
    importer = MediaAutoFillImporter(db=None)  # type: ignore[arg-type]
    old_output_dir = importer.settings.crawler_output_dir
    importer.settings.crawler_output_dir = str(tmp_path)
    monkeypatch.setattr(importer.ines, "find_ines_entry_for_word", lambda word: (_ for _ in ()).throw(AssertionError("live INES lookup should not run")))

    try:
        result = importer._find_media("professor", ["ines"])
    finally:
        importer.settings.crawler_output_dir = old_output_dir

    assert result["media_type"] == "video"
    assert result["detection_method"] == "site_crawl"
    assert result["video_url"].endswith("professorSm_Prog001.mp4")
    assert result["can_use_avatar"] is True


def test_media_auto_fill_uses_escola_manifest_url_when_probe_would_fail(tmp_path, monkeypatch):
    real_video_url = "https://dicionario.ines.gov.br/public/media/palavras/videos/escolaEntradaReal.mp4"
    manifest = {
        "source_name": "Dicionário da Língua Brasileira de Sinais - INES",
        "source_url": "https://dicionario.ines.gov.br/",
        "license": "Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu",
        "license_notes": "Mídia autorizada para uso educacional.",
        "entries": {
            "escola": {
                "word": "escola",
                "normalized_word": "escola",
                "video_url": real_video_url,
                "avatar_video_url": real_video_url,
                "image_url": "https://dicionario.ines.gov.br/public/media/mao/cg02.jpg",
                "source_reference_url": "https://dicionario.ines.gov.br/?q=escola",
                "media_type": "video",
                "can_use_avatar": True,
                "detection_method": "site_crawl",
                "validated": True,
                "http_status": 200,
                "content_type": "video/mp4",
            }
        },
    }
    (tmp_path / "ines_video_manifest.generated.json").write_text(json.dumps(manifest), encoding="utf-8")
    importer = MediaAutoFillImporter(db=None)  # type: ignore[arg-type]
    old_output_dir = importer.settings.crawler_output_dir
    importer.settings.crawler_output_dir = str(tmp_path)
    monkeypatch.setattr(importer.ines, "find_ines_entry_for_word", lambda word: (_ for _ in ()).throw(AssertionError("probing should not run when manifest has escola")))

    try:
        result = importer._find_media("escola", ["ines", "ifpr"])
    finally:
        importer.settings.crawler_output_dir = old_output_dir

    assert result["video_url"] == real_video_url
    assert result["avatar_video_url"] == real_video_url
    assert result["image_url"] == "https://dicionario.ines.gov.br/public/media/mao/cg02.jpg"
    assert result["detection_method"] == "site_crawl"
    assert result["validated"] is True
    assert result["http_status"] == 200
    assert result["content_type"] == "video/mp4"
    assert result["can_use_avatar"] is True
