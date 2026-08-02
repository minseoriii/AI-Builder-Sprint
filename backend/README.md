# Polaris API (가치 정렬 AI 저널) — Backend

FastAPI 기반 백엔드 서버입니다. Supabase Auth·PostgreSQL과 Upstage Solar Pro 3를 사용합니다.

처음 클론한 사람도 아래 순서대로 진행하면 로컬에서 서버를 기동하고 API·데모 UI까지 확인할 수 있습니다.

---

## 목차

1. [사전 준비 (설치 항목)](#1-사전-준비-설치-항목)
2. [로컬 기동 실행 가이드](#2-로컬-기동-실행-가이드)
3. [실행 / 배포 환경 정보](#3-실행--배포-환경-정보)
4. [환경변수 정보](#4-환경변수-정보)
5. [팀에서 별도 전달받아야 하는 값](#5-팀에서-별도-전달받아야-하는-값)
6. [Supabase 초기 설정 (1회)](#6-supabase-초기-설정-1회)
7. [프론트엔드 연동](#7-프론트엔드-연동)
8. [데모 UI (브라우저 테스트)](#8-데모-ui-브라우저-테스트)
9. [테스트 · API 문서](#9-테스트--api-문서)

---

## 1. 사전 준비 (설치 항목)

| 구분 | 버전 / 도구 | 용도 |
|------|-------------|------|
| **Python** | 3.12 이상 | 백엔드 런타임 |
| **pip** | 최신 권장 | Python 패키지 설치 |
| **Git** | — | 저장소 클론 |
| **Supabase 프로젝트** | 클라우드 | PostgreSQL + Auth |
| **Upstage API Key** | — | Solar Pro 3 AI 호출 |

### Python 설치 확인

```powershell
py --version
# 또는
py -3.12 --version
```

3.12가 없으면 [python.org](https://www.python.org/downloads/)에서 **Python 3.12**를 설치합니다.

### Python 패키지 (requirements)

`pip install -r requirements-dev.txt`로 아래가 함께 설치됩니다.

| 패키지 | 용도 |
|--------|------|
| `fastapi[standard]` | API 프레임워크, Uvicorn 포함 |
| `pydantic-settings` | `.env` 환경변수 로드 |
| `sqlalchemy` | ORM |
| `psycopg[binary]` | PostgreSQL 드라이버 |
| `alembic` | DB 마이그레이션 |
| `openai` | Upstage API 클라이언트 (OpenAI 호환) |
| `httpx` | Supabase Auth 토큰 검증 |
| `pytest`, `pytest-mock`, `ruff` | 테스트·린트 (개발용) |

---

## 2. 로컬 기동 실행 가이드

저장소 루트에서 `backend` 폴더로 이동한 뒤 아래를 순서대로 실행합니다.

### 2-1. 가상환경 생성 및 활성화

**Windows (PowerShell)**

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
```

PowerShell 실행 정책 오류 시:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
```

**macOS / Linux**

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
```

### 2-2. 패키지 설치

```powershell
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
```

### 2-3. 환경변수 파일 생성

```powershell
# Windows
Copy-Item .env.example .env

# macOS / Linux
# cp .env.example .env
```

`.env`의 **[별도 입력]** 항목 4개를 팀 리드에게 받은 값으로 채웁니다.  
(자세한 내용은 [5. 팀에서 별도 전달받아야 하는 값](#5-팀에서-별도-전달받아야-하는-값) 참고)

### 2-4. DB 마이그레이션

Supabase `DATABASE_URL`을 `.env`에 넣은 뒤:

```powershell
alembic upgrade head
```

### 2-5. 개발 서버 실행

```powershell
fastapi dev app/main.py
```

또는:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2-6. 동작 확인

| URL | 기대 결과 |
|-----|-----------|
| http://127.0.0.1:8000/health | `{"status":"ok", ...}` |
| http://127.0.0.1:8000/api/v1/ready | `database_configured`, `upstage_configured`, `supabase_auth_configured`가 모두 `true` |
| http://127.0.0.1:8000/docs | Swagger API 문서 |
| http://127.0.0.1:8000/demo | `ENABLE_DEMO_UI=true`일 때 브라우저 데모 UI |

> `/health`는 환경변수 없이도 응답합니다.  
> 실제 API·DB·AI 기능을 쓰려면 `.env`의 필수 4항목을 모두 채우고 `alembic upgrade head`까지 완료해야 합니다.

---

## 3. 실행 / 배포 환경 정보

### 로컬 개발 (현재 MVP 기본)

| 항목 | 값 |
|------|-----|
| 호스트 | `127.0.0.1` (로컬) |
| 포트 | `8000` |
| 실행 명령 | `fastapi dev app/main.py` |
| API prefix | `/api/v1` |
| DB | Supabase PostgreSQL (Session Pooler, port **5432**) |
| Auth | Supabase JWT (`Authorization: Bearer <token>`) |
| AI | Upstage Solar Pro 3 (`solar-pro3`) |

### Android Emulator에서 백엔드 접속

React Native Expo Android Emulator는 PC localhost 대신 아래 주소를 사용합니다.

```text
http://10.0.2.2:8000
```

실제 Android 기기는 PC와 같은 Wi-Fi에서 PC 사설 IP를 사용합니다. (예: `http://192.168.0.10:8000`)

### 배포 (해커톤 MVP 범위)

현재 MVP는 **로컬 FastAPI + Supabase/Upstage 클라우드** 조합을 전제로 합니다.

- Docker / Redis / Celery / LangChain / RAG는 **미도입**
- 프로덕션 배포 시에도 동일하게 Uvicorn + 환경변수 주입 방식을 사용할 수 있습니다
- 배포 플랫폼(Render, Railway 등)을 쓸 경우 `DATABASE_URL`, `SUPABASE_*`, `UPSTAGE_API_KEY`, `CORS_ORIGINS`(프론트 실제 origin)를 배포 환경 변수로 설정합니다

---

## 4. 환경변수 정보

`.env.example`을 복사해 `.env`를 만듭니다. `.env`는 **절대 Git에 커밋하지 않습니다.**

### 전체 목록

| 변수 | 필수 | 기본값 | 설명 |
|------|:----:|--------|------|
| `APP_NAME` | | `Polaris API` | OpenAPI 문서·헬스 응답에 표시되는 서비스명 |
| `APP_ENV` | | `development` | 실행 환경 (`development` / `production` 등) |
| `DEBUG` | | `true` | 디버그 모드 |
| `API_V1_PREFIX` | | `/api/v1` | REST API 경로 prefix |
| `DATABASE_URL` | **예** | — | Supabase PostgreSQL 연결 문자열 (`postgresql+psycopg://...`) |
| `SUPABASE_URL` | **예** | — | Supabase 프로젝트 URL |
| `SUPABASE_PUBLISHABLE_KEY` | **예** | — | Supabase **anon (publishable) key** — 백엔드 JWT 검증·프론트 Auth 공용 |
| `UPSTAGE_API_KEY` | **예** | — | Upstage API Key (AI 분석) |
| `UPSTAGE_BASE_URL` | | `https://api.upstage.ai/v1` | Upstage API Base URL |
| `UPSTAGE_MODEL` | | `solar-pro3` | 사용 LLM 모델 |
| `AI_TIMEOUT_SECONDS` | | `30` | Upstage API 타임아웃(초) |
| `SUPABASE_AUTH_TIMEOUT_SECONDS` | | `10` | Supabase Auth 검증 타임아웃(초) |
| `NORTH_STAR_ANALYSIS_TTL_HOURS` | | `24` | 북극성 AI 분석 캐시 TTL |
| `DAILY_RECORD_ANALYSIS_TTL_HOURS` | | `24` | 일일 기록 AI 분석 캐시 TTL |
| `COMET_RECOMMENDATION_TTL_HOURS` | | `24` | 혜성 추천 AI 캐시 TTL |
| `DEFAULT_TIMEZONE` | | `Asia/Seoul` | 기록·리포트 기준 타임존 |
| `CORS_ORIGINS` | | Expo 로컬 포트 | 쉼표로 구분된 허용 origin |
| `ENABLE_DEMO_UI` | | `.env.example`에서 `true` | `true`면 `/demo` 브라우저 UI 활성화 |

### 필수 4항목과 `/api/v1/ready` 관계

`GET /api/v1/ready` 응답:

```json
{
  "database_configured": true,
  "upstage_configured": true,
  "supabase_auth_configured": true
}
```

세 값이 모두 `true`여야 DB·인증·AI API를 정상 사용할 수 있습니다.

| 미설정 시 증상 |
|----------------|
| `DATABASE_URL` 없음 | DB 접근 API 500 / 연결 실패 |
| `SUPABASE_*` 없음 | 인증 API **503** (`AUTH_SERVICE_UNAVAILABLE`) |
| `UPSTAGE_API_KEY` 없음 | AI 분석 API 실패 |

### DATABASE_URL 작성 예시

Supabase Dashboard → **Connect** → **Session Pooler** → port **5432** URI:

```text
postgresql+psycopg://postgres.PROJECT_REF:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

DB 비밀번호에 `@`, `#`, `%` 등 특수문자가 있으면 URL encoding이 필요합니다.  
예: `p@ss#word` → `p%40ss%23word`

---

## 5. 팀에서 별도 전달받아야 하는 값

아래 **4개 키**는 외부 서비스 비밀값이므로 `.env.example`에는 placeholder만 두고,  
**팀 리드가 안전한 채널(카카오톡·노션·1Password 등)로 각 개발자에게 따로 전달**합니다.

| `.env` 키 | 어디서 발급 | 용도 | 전달 시 주의 |
|-----------|-------------|------|--------------|
| `DATABASE_URL` | Supabase Dashboard → Connect → Session Pooler (5432) | PostgreSQL 접속 | DB 비밀번호 포함 — Git·스크린샷 공유 금지 |
| `SUPABASE_URL` | Supabase → Project Settings → API | Auth 토큰 검증 | 프로젝트 URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → **anon public** key | JWT 검증 + 프론트/데모 Auth | **Service Role Key 아님** — anon key만 사용 |
| `UPSTAGE_API_KEY` | [Upstage Console](https://console.upstage.ai/) → API Keys | Solar Pro 3 호출 | 팀 공용 키 — 외부 유출 금지 |

### 팀 리드 전달 템플릿 (복사용)

팀 채팅 등에 아래 형식으로 공유하면 새 합류자가 `.env`를 바로 채울 수 있습니다.

```text
[Polaris Backend .env — 로컬 개발용]

DATABASE_URL=postgresql+psycopg://postgres.xxxxx:비밀번호@....pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
UPSTAGE_API_KEY=up_...

※ .env 파일은 Git에 올리지 마세요.
※ Service Role Key는 사용하지 않습니다.
```

### 프론트엔드에서도 필요한 값

프론트(Expo)는 백엔드와 **동일한 Supabase 프로젝트**를 사용합니다.  
프론트 `.env`(또는 Expo `app.config`)에도 아래가 필요합니다.

| 프론트 변수 (예시) | 백엔드 `.env` 대응 |
|--------------------|---------------------|
| `EXPO_PUBLIC_SUPABASE_URL` | `SUPABASE_URL` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `SUPABASE_PUBLISHABLE_KEY` |
| `EXPO_PUBLIC_API_URL` | `http://127.0.0.1:8000` (로컬) |

프론트는 Supabase `signInAnonymously()`로 access token을 발급받고, API 호출 시 `Authorization: Bearer <token>`을 붙입니다.

---

## 6. Supabase 초기 설정 (1회)

팀 Supabase 프로젝트를 처음 세팅할 때 아래를 확인합니다.

1. Supabase 프로젝트 생성
2. **Authentication → Providers → Anonymous sign-ins** → **Enabled** (익명 로그인 필수)
3. **Connect** → Session Pooler **5432** URI → `DATABASE_URL`
4. **Project Settings → API** → Project URL, anon key → `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
5. **Service Role Key**는 백엔드·프론트 모두 **사용하지 않음**
6. 로컬에서 `alembic upgrade head` 실행

---

## 7. 프론트엔드 연동

| 환경 | 백엔드 Base URL |
|------|-----------------|
| iOS Simulator / 웹 | `http://127.0.0.1:8000` |
| Android Emulator | `http://10.0.2.2:8000` |
| 실제 기기 (같은 Wi-Fi) | `http://<PC 사설 IP>:8000` |

프론트 origin이 Expo 기본 포트(`8081`, `19006`)가 아니면 `.env`의 `CORS_ORIGINS`에 해당 origin을 추가합니다.

---

## 8. 데모 UI (브라우저 테스트)

모바일 앱 없이 백엔드·Supabase·Upstage 연동을 검증하려면:

1. `.env`에서 `ENABLE_DEMO_UI=true` (`.env.example` 기본값)
2. 필수 4환경변수 + `alembic upgrade head` 완료
3. 서버 실행 후 http://127.0.0.1:8000/demo 접속
4. 「익명 로그인」 버튼 → 온보딩·일일 기록·혜성·은하 API 순서로 테스트

---

## 9. 테스트 · API 문서

### 자동 테스트

```powershell
pytest
ruff check .
```

`pytest`는 SQLite in-memory DB와 mock Upstage를 사용하므로 **실제 API Key 없이** 통과합니다.

### API 문서 · Postman

| 리소스 | 경로 |
|--------|------|
| Swagger | http://127.0.0.1:8000/docs |
| ReDoc | http://127.0.0.1:8000/redoc |
| Postman Collection | `../docs/postman/POLARIS_API.postman_collection.json` |

### 주요 API (prefix: `/api/v1`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/ready` | 환경변수 설정 상태 |
| GET | `/me/onboarding` | 온보딩 상태 |
| POST | `/onboarding/north-star/analyze` | 북극성 AI 분석 |
| PUT | `/onboarding/north-star` | 북극성 선택 저장 |
| GET | `/home` | 홈 화면 데이터 |
| POST | `/daily-records/analyze` | 일일 기록 AI 분석 |
| PUT | `/daily-records/{id}/details` | 기록 상세 보완 |
| POST | `/daily-records/{id}/confirm` | 기록 확정 |
| GET | `/comet-recommendations/current` | 현재 혜성 추천 |
| POST | `/comet-recommendations/generate` | 혜성 추천 생성 |
| GET/POST/PUT/DELETE | `/comets/...` | 혜성(행동) CRUD |
| GET | `/stars/...` | 별(기록) 조회 |
| GET | `/galaxy/overview` | 은하 개요 |
| POST/GET | `/galaxy/reports/...` | 계절 리포트 |

인증이 필요한 API는 헤더에 `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`을 포함합니다.
