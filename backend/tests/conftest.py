import uuid
from collections.abc import Generator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.types import TypeDecorator

from app.db.base import Base

TEST_USER_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
OTHER_USER_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")


@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


@compiles(UUID, "sqlite")
def _compile_uuid_sqlite(type_, compiler, **kw):
    return "VARCHAR(36)"


class SqliteUUID(TypeDecorator):
    impl = UUID(as_uuid=True)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "sqlite":
            from sqlalchemy import String

            return dialect.type_descriptor(String(36))
        return dialect.type_descriptor(UUID(as_uuid=True))

    def process_bind_param(self, value, dialect):
        if value is not None:
            return str(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return uuid.UUID(str(value))
        return value


def _patch_sqlite_types() -> None:
    for table in Base.metadata.tables.values():
        for column in table.columns:
            if isinstance(column.type, UUID):
                column.type = SqliteUUID()
            elif isinstance(column.type, SqliteUUID):
                continue


import app.models  # noqa: E402, F401

_patch_sqlite_types()

from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.services.auth import get_current_user_id  # noqa: E402
from app.services.upstage import get_upstage_client  # noqa: E402


@pytest.fixture
def db_engine():
    _patch_sqlite_types()
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(db_engine) -> Generator[Session, None, None]:
    TestingSessionLocal = sessionmaker(bind=db_engine, autocommit=False, autoflush=False)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_current_user_id():
        return TEST_USER_ID

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_id] = override_get_current_user_id

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client(db_session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def mock_upstage_client(mocker):
    mock_client = mocker.Mock()
    app.dependency_overrides[get_upstage_client] = lambda: mock_client
    yield mock_client
    app.dependency_overrides.pop(get_upstage_client, None)


def make_star_entry(
    user_id: uuid.UUID = TEST_USER_ID,
    content: str = "테스트 기록",
    related_values: list | None = None,
    created_at: datetime | None = None,
) -> dict:
    return {
        "user_id": user_id,
        "content": content,
        "companion_type": "아빠",
        "life_domains": ["가족"],
        "related_values": related_values
        or [{"tag": "관계", "strength": 3, "evidence": "테스트"}],
        "sensory_tags": ["촉각"],
        "analysis_confidence": 0.9,
        "model_name": "solar-pro3",
        "prompt_version": "star_entry_v1",
        "created_at": created_at or datetime.now(UTC),
    }
