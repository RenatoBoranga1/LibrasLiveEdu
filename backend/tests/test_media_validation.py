from app.services.media_validation import is_static_support_image_url, validate_remote_media_url


class FakeResponse:
    def __init__(self, status_code: int, content_type: str, url: str = "https://example.com/media.mp4", headers: dict[str, str] | None = None):
        self.status_code = status_code
        self.url = url
        self.headers = {"content-type": content_type}
        if headers:
            self.headers.update(headers)


class FakeClient:
    def __init__(self, head_response: FakeResponse, get_response: FakeResponse | None = None):
        self.head_response = head_response
        self.get_response = get_response or head_response

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def head(self, *args, **kwargs):
        return self.head_response

    def get(self, *args, **kwargs):
        return self.get_response


def test_validate_remote_media_url_accepts_mp4_200(monkeypatch):
    monkeypatch.setattr(
        "app.services.media_validation.httpx.Client",
        lambda *args, **kwargs: FakeClient(FakeResponse(200, "video/mp4", headers={"content-length": "123456"})),
    )

    result = validate_remote_media_url("https://example.com/media.mp4", "video")

    assert result["valid"] is True
    assert result["status_code"] == 200
    assert result["content_type"] == "video/mp4"
    assert result["content_length"] == 123456


def test_validate_remote_media_url_accepts_mp4_206(monkeypatch):
    monkeypatch.setattr(
        "app.services.media_validation.httpx.Client",
        lambda *args, **kwargs: FakeClient(FakeResponse(206, "video/mp4", headers={"content-range": "bytes 0-0/999"})),
    )

    result = validate_remote_media_url("https://example.com/media.mp4", "video")

    assert result["valid"] is True
    assert result["status_code"] == 206
    assert result["content_length"] == 999


def test_validate_remote_media_url_rejects_mp4_returning_html(monkeypatch):
    monkeypatch.setattr(
        "app.services.media_validation.httpx.Client",
        lambda *args, **kwargs: FakeClient(FakeResponse(200, "text/html")),
    )

    result = validate_remote_media_url("https://example.com/media.mp4", "video")

    assert result["valid"] is False
    assert result["content_type"] == "text/html"


def test_validate_remote_media_url_rejects_404(monkeypatch):
    monkeypatch.setattr(
        "app.services.media_validation.httpx.Client",
        lambda *args, **kwargs: FakeClient(FakeResponse(404, "text/html")),
    )

    result = validate_remote_media_url("https://example.com/missing.mp4", "video")

    assert result["valid"] is False
    assert result["status_code"] == 404


def test_validate_remote_media_url_accepts_gif(monkeypatch):
    monkeypatch.setattr(
        "app.services.media_validation.httpx.Client",
        lambda *args, **kwargs: FakeClient(FakeResponse(200, "image/gif", url="https://example.com/sinal.gif")),
    )

    result = validate_remote_media_url("https://example.com/sinal.gif", "gif")

    assert result["valid"] is True
    assert result["media_type"] == "gif"


def test_validate_remote_media_url_rejects_gif_returning_png(monkeypatch):
    monkeypatch.setattr(
        "app.services.media_validation.httpx.Client",
        lambda *args, **kwargs: FakeClient(FakeResponse(200, "image/png", url="https://example.com/sinal.gif")),
    )

    result = validate_remote_media_url("https://example.com/sinal.gif", "gif")

    assert result["valid"] is False
    assert result["content_type"] == "image/png"


def test_static_support_image_url_is_never_avatar():
    assert is_static_support_image_url("https://dicionario.ines.gov.br/public/media/mao/cg51a.jpg") is True
    result = validate_remote_media_url("https://dicionario.ines.gov.br/public/media/mao/cg51a.jpg", "video")
    assert result["valid"] is False
    assert "apoio visual" in result["reason"]
