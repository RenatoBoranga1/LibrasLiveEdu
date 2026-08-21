import logging
from http import HTTPStatus
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid4()))


def _error_payload(
    request: Request,
    *,
    code: str,
    message: str,
    field: str | None = None,
    detail: object | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "code": code,
        "message": message,
        "request_id": _request_id(request),
    }
    if field:
        payload["field"] = field
    if detail is not None:
        payload["detail"] = detail
    return payload


def install_error_handlers(app: FastAPI) -> None:
    @app.middleware("http")
    async def attach_request_id(request: Request, call_next):
        incoming_id = request.headers.get("x-request-id", "").strip()
        request.state.request_id = incoming_id[:128] if incoming_id else str(uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        return response

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(request: Request, exc: StarletteHTTPException):
        detail = exc.detail
        if isinstance(detail, dict):
            code = str(detail.get("code") or f"HTTP_{exc.status_code}")
            message = str(detail.get("message") or detail.get("detail") or HTTPStatus(exc.status_code).phrase)
            field = str(detail["field"]) if detail.get("field") else None
        else:
            code = f"HTTP_{exc.status_code}"
            message = str(detail or HTTPStatus(exc.status_code).phrase)
            field = None
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(
                request,
                code=code,
                message=message,
                field=field,
                detail=detail,
            ),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        errors = exc.errors()
        first_error = errors[0] if errors else {}
        location = [str(part) for part in first_error.get("loc", []) if part not in {"body", "query", "path"}]
        field = ".".join(location) or None
        safe_errors = [
            {
                "type": str(error.get("type", "validation_error")),
                "loc": [str(part) for part in error.get("loc", [])],
                "msg": str(error.get("msg", "Valor inválido.")),
            }
            for error in errors
        ]
        return JSONResponse(
            status_code=422,
            content=_error_payload(
                request,
                code="VALIDATION_ERROR",
                message="Dados inválidos. Revise os campos enviados.",
                field=field,
                detail=safe_errors,
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception):
        logger.error(
            "Erro não tratado request_id=%s",
            _request_id(request),
            exc_info=(type(exc), exc, exc.__traceback__),
        )
        return JSONResponse(
            status_code=500,
            content=_error_payload(
                request,
                code="INTERNAL_ERROR",
                message="Não foi possível concluir a solicitação.",
            ),
        )
