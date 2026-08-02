"""혜성·은하 API smoke test (SQLite + mock Upstage).

실행:
    cd backend
    .venv\\Scripts\\python.exe scripts/smoke_comet_galaxy.py
"""

from __future__ import annotations

import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.models  # noqa: E402, F401
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.north_star import NorthStar  # noqa: E402
from app.models.selected_constellation import SelectedConstellation  # noqa: E402
from app.models.user_profile import UserProfile  # noqa: E402
from app.schemas.comet import CometRecommendationAIResponse  # noqa: E402
from app.schemas.galaxy import (  # noqa: E402
    GalaxyOverviewSummaryAIResponse,
    SeasonalGalaxyReportAIResponse,
)
from app.services.auth import get_current_user_id  # noqa: E402
from app.services.upstage import get_upstage_client  # noqa: E402
from tests.conftest import _patch_sqlite_types  # noqa: E402

TEST_USER = uuid.UUID("11111111-1111-1111-1111-111111111111")

COMET_AI = CometRecommendationAIResponse(
    target_category="가족",
    title="저녁에 20분 산책하기",
    description="오늘 저녁 가까운 곳을 20분 정도 걸어보세요.",
    reason="가족 성단의 별이 상대적으로 적습니다.",
    estimated_minutes=20,
)

SUMMARY_AI = GalaxyOverviewSummaryAIResponse(
    lines=[
        "북극성은 가족과 건강을 가리키고 있습니다.",
        "이번 여름에는 가족 성단에 별이 모이기 시작했습니다.",
        "앞으로 더 많은 기록을 남겨 볼 수 있습니다.",
    ]
)

REPORT_AI = SeasonalGalaxyReportAIResponse(
    title="관계와 성장이 함께 빛난 여름",
    north_star_alignment="북극성과 기록이 함께 흐르고 있습니다.",
    dominant_category_analysis="가족 성단 기록이 두드러집니다.",
    record_trend_analysis="편안함 태그가 자주 등장했습니다.",
    monthly_change_analysis="7월에 가족 성단이 커졌습니다.",
    unobserved_area_analysis="건강 성단은 아직 적습니다.",
    closing_observation="균형을 찾아가는 계절이었습니다.",
)


def _ok(label: str, response) -> None:
    status = "PASS" if response.status_code < 400 else "FAIL"
    print(f"[{status}] {label}: {response.status_code}")
    if response.status_code >= 400:
        print(f"       body: {response.text[:300]}")
        raise SystemExit(1)


def main() -> None:
    _patch_sqlite_types()
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _pragma(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = SessionLocal()

    def override_db():
        try:
            yield session
        finally:
            pass

    class MockUpstage:
        def complete_json(self, _system, _user, schema):
            if schema is CometRecommendationAIResponse:
                return COMET_AI
            if schema is GalaxyOverviewSummaryAIResponse:
                return SUMMARY_AI
            if schema is SeasonalGalaxyReportAIResponse:
                return REPORT_AI
            raise ValueError(f"unexpected schema: {schema}")

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user_id] = lambda: TEST_USER
    app.dependency_overrides[get_upstage_client] = lambda: MockUpstage()

    session.add(UserProfile(id=TEST_USER, onboarding_completed=True))
    north_star = NorthStar(
        user_id=TEST_USER,
        original_text="가족과 건강을 지키면서 배우고 싶다.",
        is_active=True,
    )
    session.add(north_star)
    session.flush()
    for index, category in enumerate(["가족", "건강", "성장·배움"]):
        session.add(
            SelectedConstellation(
                north_star_id=north_star.id,
                category=category,
                sort_order=index,
                ai_recommended=True,
                ai_score=0.9,
            )
        )
    session.commit()

    client = TestClient(app)
    print("=== 혜성·은하 API smoke test ===")

    _ok("GET /health", client.get("/health"))
    _ok("GET /api/v1/ready", client.get("/api/v1/ready"))
    _ok(
        "GET /api/v1/comet-recommendations/current",
        client.get("/api/v1/comet-recommendations/current"),
    )

    generate = client.post("/api/v1/comet-recommendations/generate")
    _ok("POST /api/v1/comet-recommendations/generate", generate)
    recommendation_id = generate.json()["recommendation"]["id"]

    accept = client.post(f"/api/v1/comet-recommendations/{recommendation_id}/accept")
    _ok(f"POST /api/v1/comet-recommendations/{recommendation_id}/accept", accept)
    accepted_comet_id = accept.json()["id"]

    reject_accepted = client.post(
        f"/api/v1/comet-recommendations/{recommendation_id}/reject"
    )
    print(
        f"[{'PASS' if reject_accepted.status_code == 422 else 'FAIL'}] "
        f"POST reject on accepted recommendation: {reject_accepted.status_code}"
    )
    if reject_accepted.status_code != 422:
        raise SystemExit(1)

    user_comet = client.post(
        "/api/v1/comets",
        json={"title": "부모님께 안부 전화", "target_category": "가족"},
    )
    _ok("POST /api/v1/comets", user_comet)
    comet_id = user_comet.json()["id"]

    _ok("GET /api/v1/comets", client.get("/api/v1/comets"))
    _ok(
        f"POST /api/v1/comets/{accepted_comet_id}/complete",
        client.post(
            f"/api/v1/comets/{accepted_comet_id}/complete",
            json={"completed_on": "2026-07-31"},
        ),
    )

    overview = client.get("/api/v1/galaxy/overview", params={"year": 2026, "season": "SUMMER"})
    _ok("GET /api/v1/galaxy/overview", overview)
    assert len(overview.json()["summary"]["lines"]) == 3

    report = client.post("/api/v1/galaxy/reports/2026/SUMMER/generate")
    _ok("POST /api/v1/galaxy/reports/2026/SUMMER/generate", report)
    report_id = report.json()["id"]

    _ok("GET /api/v1/galaxy/reports", client.get("/api/v1/galaxy/reports"))
    _ok("GET /api/v1/galaxy/reports/{id}", client.get(f"/api/v1/galaxy/reports/{report_id}"))
    _ok(
        f"PUT /api/v1/galaxy/reports/{report_id}/reflection",
        client.put(
            f"/api/v1/galaxy/reports/{report_id}/reflection",
            json={"reflection": "가족과 함께한 여름이었다."},
        ),
    )

    home = client.get("/api/v1/home")
    _ok("GET /api/v1/home (comet_recommendation field)", home)
    assert "comet_recommendation" in home.json()

    app.dependency_overrides.clear()
    session.close()
    print("=== all smoke checks passed ===")


if __name__ == "__main__":
    main()
