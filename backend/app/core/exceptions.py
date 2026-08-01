from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class AuthTokenMissingError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="AUTH_TOKEN_MISSING",
            message="인증 토큰이 필요합니다.",
            status_code=401,
        )


class AuthTokenInvalidError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="AUTH_TOKEN_INVALID",
            message="유효하지 않은 인증 토큰입니다.",
            status_code=401,
        )


class AuthServiceUnavailableError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="AUTH_SERVICE_UNAVAILABLE",
            message="인증 서비스를 일시적으로 사용할 수 없습니다.",
            status_code=503,
        )


class AnalysisNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="ANALYSIS_NOT_FOUND",
            message="분석 결과를 찾을 수 없습니다.",
            status_code=404,
        )


class AnalysisExpiredError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="ANALYSIS_EXPIRED",
            message="분석 결과가 만료되었습니다. 다시 분석해 주세요.",
            status_code=422,
        )


class AnalysisAlreadyUsedError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="ANALYSIS_ALREADY_USED",
            message="이미 사용된 분석 결과입니다.",
            status_code=422,
        )


class InvalidSelectionError(AppError):
    def __init__(self, message: str = "선택한 성단이 유효하지 않습니다.") -> None:
        super().__init__(
            code="INVALID_SELECTION",
            message=message,
            status_code=422,
        )


class NorthStarNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="NORTH_STAR_NOT_FOUND",
            message="등록된 북극성이 없습니다.",
            status_code=404,
        )


class StarNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="STAR_NOT_FOUND",
            message="해당 기록을 찾을 수 없습니다.",
            status_code=404,
        )


class ReportNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="REPORT_NOT_FOUND",
            message="해당 리포트를 찾을 수 없습니다.",
            status_code=404,
        )


class InsufficientRecordsError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="INSUFFICIENT_RECORDS",
            message="리포트를 생성하려면 최소 1개 이상의 기록이 필요합니다.",
            status_code=422,
        )


class AIServiceError(AppError):
    def __init__(self, message: str = "AI 서비스를 일시적으로 사용할 수 없습니다.") -> None:
        super().__init__(
            code="AI_SERVICE_ERROR",
            message=message,
            status_code=502,
        )


class AIResponseInvalidError(AppError):
    def __init__(self, message: str = "AI 분석 결과를 처리하지 못했습니다.") -> None:
        super().__init__(
            code="AI_RESPONSE_INVALID",
            message=message,
            status_code=502,
        )


class DailyRecordNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="DAILY_RECORD_NOT_FOUND",
            message="하루 기록을 찾을 수 없습니다.",
            status_code=404,
        )


class InvalidTagsError(AppError):
    def __init__(self, message: str = "태그 형식이 올바르지 않습니다.") -> None:
        super().__init__(
            code="INVALID_TAGS",
            message=message,
            status_code=422,
        )


class AnalysisNotReadyError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="ANALYSIS_NOT_READY",
            message="분석이 아직 최종 확인 단계가 아닙니다.",
            status_code=422,
        )


class InvalidCategoryError(AppError):
    def __init__(self, message: str = "허용되지 않은 상위 성단입니다.") -> None:
        super().__init__(
            code="INVALID_CATEGORY",
            message=message,
            status_code=422,
        )


class DatabaseError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="DATABASE_ERROR",
            message="데이터베이스 처리 중 오류가 발생했습니다.",
            status_code=500,
        )


class CometNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="COMET_NOT_FOUND",
            message="혜성을 찾을 수 없습니다.",
            status_code=404,
        )


class CometRecommendationNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="COMET_RECOMMENDATION_NOT_FOUND",
            message="혜성 추천을 찾을 수 없습니다.",
            status_code=404,
        )


class CometRecommendationUnavailableError(AppError):
    def __init__(self, message: str = "현재 생성 가능한 혜성 추천이 없습니다.") -> None:
        super().__init__(
            code="COMET_RECOMMENDATION_UNAVAILABLE",
            message=message,
            status_code=422,
        )


class ActiveConstellationsNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="ACTIVE_CONSTELLATIONS_NOT_FOUND",
            message="활성 북극성 성단이 없습니다.",
            status_code=422,
        )


class CometRecommendationExpiredError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="COMET_RECOMMENDATION_EXPIRED",
            message="만료된 혜성 추천입니다.",
            status_code=422,
        )


class CometRecommendationAlreadyRespondedError(AppError):
    def __init__(self, message: str = "이미 응답한 혜성 추천입니다.") -> None:
        super().__init__(
            code="COMET_RECOMMENDATION_ALREADY_RESPONDED",
            message=message,
            status_code=422,
        )


class CometInvalidStateError(AppError):
    def __init__(self, message: str = "혜성 상태가 올바르지 않습니다.") -> None:
        super().__init__(
            code="COMET_INVALID_STATE",
            message=message,
            status_code=422,
        )


class GalaxyReportNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="GALAXY_REPORT_NOT_FOUND",
            message="계절 리포트를 찾을 수 없습니다.",
            status_code=404,
        )


class InvalidSeasonError(AppError):
    def __init__(self, message: str = "유효하지 않은 계절입니다.") -> None:
        super().__init__(
            code="INVALID_SEASON",
            message=message,
            status_code=422,
        )


class FutureSeasonError(AppError):
    def __init__(self) -> None:
        super().__init__(
            code="FUTURE_SEASON",
            message="아직 시작되지 않은 계절의 리포트는 생성할 수 없습니다.",
            status_code=422,
        )


class InvalidReflectionError(AppError):
    def __init__(self, message: str = "종합 소감 형식이 올바르지 않습니다.") -> None:
        super().__init__(
            code="INVALID_REFLECTION",
            message=message,
            status_code=422,
        )


def error_detail(code: str, message: str) -> dict[str, Any]:
    return {"detail": {"code": code, "message": message}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_detail(exc.code, exc.message),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        _request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        if isinstance(exc.detail, dict) and "code" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
        return JSONResponse(
            status_code=exc.status_code,
            content=error_detail("HTTP_ERROR", str(exc.detail)),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        messages = []
        for err in exc.errors():
            loc = ".".join(str(part) for part in err.get("loc", []))
            msg = err.get("msg", "유효하지 않은 요청입니다.")
            messages.append(f"{loc}: {msg}" if loc else msg)
        return JSONResponse(
            status_code=422,
            content=error_detail("VALIDATION_ERROR", "; ".join(messages)),
        )
