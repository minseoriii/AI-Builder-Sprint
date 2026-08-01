# 가치 정렬 AI 저널 API (Backend)

FastAPI 기반 백엔드 서버입니다. Supabase Auth·PostgreSQL과 Upstage Solar Pro 3를 사용합니다.

## Python 확인

```powershell
py --version
```

Python 3.12 이상이 필요합니다. 3.12가 없으면 [python.org](https://www.python.org/downloads/)에서 Python 3.12를 설치하세요.

```powershell
py -3.12 --version
```

## 가상환경

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
```

PowerShell 실행 정책 오류가 나면 현재 프로세스에만 허용합니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
```

## 패키지 설치

```powershell
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
```

## 환경변수

```powershell
Copy-Item .env.example .env
```

`.env`에 직접 입력해야 하는 값:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
UPSTAGE_API_KEY
```

### DATABASE_URL 설정

Supabase Dashboard → **Connect** → **Session Pooler** → 포트 **5432** 연결 문자열을 복사합니다.

형식 예시:

```text
postgresql+psycopg://postgres.PROJECT_REF:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

DB 비밀번호에 `@`, `#`, `%` 등 특수문자가 있으면 URL encoding이 필요합니다.  
예: `p@ss#word` → `p%40ss%23word`

## Supabase Dashboard 수동 설정

1. 새 Supabase 프로젝트를 생성합니다.
2. **Authentication → Providers**에서 이메일·비밀번호 방식을 사용합니다.
3. 해커톤 데모에서는 **Confirm Email** 비활성화를 고려합니다.
4. **Connect** 메뉴에서 Session Pooler 5432 URL을 복사합니다.
5. **Project Settings → API**에서 Project URL과 **Publishable (anon) key**를 확인합니다.
6. **Service Role Key**는 이번 백엔드에 사용하지 않습니다.
7. Service Role Key를 프론트엔드에 넣으면 안 됩니다.

## DB migration

```powershell
alembic upgrade head
```

## 개발 서버

```powershell
fastapi dev app/main.py
```

또는:

```powershell
uvicorn app.main:app --reload
```

## 확인 주소

```text
http://127.0.0.1:8000/health
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/api/v1/ready
```

## Android Emulator 연결

React Native Expo 프론트에서 Android Emulator를 사용할 때 백엔드 주소:

```text
http://10.0.2.2:8000
```

실제 Android 기기는 PC와 같은 Wi-Fi 네트워크에서 PC의 사설 IP(예: `http://192.168.0.10:8000`)를 사용해야 합니다.

## 테스트

```powershell
pytest
ruff check .
```

## API 개요

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 |
| GET | `/api/v1/ready` | 설정 상태 |
| GET | `/api/v1/profile` | 프로필 조회 |
| PUT | `/api/v1/north-star` | 북극성 등록/갱신 |
| GET | `/api/v1/north-star` | 북극성 조회 |
| POST | `/api/v1/stars` | 감각 별 기록 |
| GET | `/api/v1/stars` | 기록 목록 |
| GET | `/api/v1/stars/{id}` | 기록 상세 |
| DELETE | `/api/v1/stars/{id}` | 기록 삭제 |
| POST | `/api/v1/reports/alignment` | 정렬 리포트 생성 |
| GET | `/api/v1/reports/alignment/latest` | 최신 리포트 |
| GET | `/api/v1/reports/alignment` | 리포트 목록 |
| GET | `/api/v1/reports/alignment/{id}` | 리포트 상세 |
| GET | `/api/v1/tags` | 고정 태그 목록 |

인증이 필요한 API는 헤더에 `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`을 포함합니다.
