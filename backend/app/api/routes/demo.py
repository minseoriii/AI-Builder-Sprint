from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.constants import (
    CONSTELLATION_CATEGORIES,
    DAILY_RECORD_DIMENSIONS,
    DAILY_RECORD_TEXT_MAX_LENGTH,
    DIMENSION_LABELS,
    QUESTION_PRESETS,
    TAG_MAX_LENGTH,
    TAG_MIN_LENGTH,
    TAGS_PER_DIMENSION_MAX,
    TAGS_TOTAL_MAX,
)

router = APIRouter(tags=["demo"])

DEMO_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "demo"


class DemoConfigResponse(BaseModel):
    demo_enabled: bool
    supabase_url: str
    supabase_publishable_key: str
    api_v1_prefix: str
    constellation_categories: list[str]
    daily_record_dimensions: list[str]
    dimension_labels: dict[str, str]
    question_presets: dict[str, str]
    tag_min_length: int
    tag_max_length: int
    tags_per_dimension_max: int
    tags_total_max: int
    daily_record_text_max_length: int


def _demo_disabled() -> None:
    if not settings.enable_demo_ui:
        raise HTTPException(status_code=404, detail="Not Found")


@router.get("/demo", response_class=HTMLResponse)
def demo_page() -> HTMLResponse:
    _demo_disabled()
    index_path = DEMO_DIR / "index.html"
    if not index_path.is_file():
        raise HTTPException(status_code=500, detail="Demo page not found")
    return HTMLResponse(content=index_path.read_text(encoding="utf-8"))


@router.get("/demo/config", response_model=DemoConfigResponse)
def demo_config() -> DemoConfigResponse:
    _demo_disabled()
    return DemoConfigResponse(
        demo_enabled=settings.enable_demo_ui,
        supabase_url=settings.supabase_url,
        supabase_publishable_key=settings.supabase_publishable_key,
        api_v1_prefix=settings.api_v1_prefix,
        constellation_categories=list(CONSTELLATION_CATEGORIES),
        daily_record_dimensions=list(DAILY_RECORD_DIMENSIONS),
        dimension_labels=DIMENSION_LABELS,
        question_presets=QUESTION_PRESETS,
        tag_min_length=TAG_MIN_LENGTH,
        tag_max_length=TAG_MAX_LENGTH,
        tags_per_dimension_max=TAGS_PER_DIMENSION_MAX,
        tags_total_max=TAGS_TOTAL_MAX,
        daily_record_text_max_length=DAILY_RECORD_TEXT_MAX_LENGTH,
    )


@router.get("/demo/static/{file_path:path}")
def demo_static(file_path: str) -> FileResponse:
    _demo_disabled()
    static_root = (DEMO_DIR).resolve()
    requested = (static_root / file_path).resolve()
    if not str(requested).startswith(str(static_root)):
        raise HTTPException(status_code=404, detail="Not Found")
    if not requested.is_file():
        raise HTTPException(status_code=404, detail="Not Found")
    media_type = None
    if file_path.endswith(".css"):
        media_type = "text/css"
    elif file_path.endswith(".js"):
        media_type = "application/javascript"
    return FileResponse(requested, media_type=media_type)
