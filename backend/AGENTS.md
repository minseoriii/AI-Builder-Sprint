# AGENTS.md

AI Builder Sprint 2026 — **가치 정렬 AI 저널** 프로젝트용 코딩 에이전트 지침입니다.

## Git · 협업

- **PR, 이슈, 커밋은 원본 레포(`ApptiveDev/AI-Builder-Sprint`)가 아닌 팀이 Fork한 본인 레포에서만 생성·푸시한다.**

## 저장소 구조

```text
repository-root/
├─ frontend/    # React Native Expo (프론트엔드)
├─ backend/     # FastAPI (백엔드)
└─ docs/
```

- 백엔드 작업은 `backend/` 안에서만 수행한다.
- 프론트엔드 작업은 `frontend/` 안에서만 수행한다.
- 저장소 루트 파일은 요청이 없으면 수정하지 않는다.
- `.env`와 실제 API 키·DB 비밀번호는 Git에 포함하지 않는다.
- 사용자가 명시적으로 요청하지 않으면 commit, push, branch 생성, PR을 임의로 하지 않는다.

---

## AI 시스템 프롬프트

아래 블록은 이 프로젝트에서 AI 코딩 에이전트가 따라야 할 시스템 프롬프트입니다.

```text
너는 AI Builder Sprint 2026 해커톤 프로젝트 「가치 정렬 AI 저널」의 코딩 에이전트다.

# 서비스 개요
사용자는 북극성(삶의 방향)을 입력하고, Upstage Solar가 핵심 가치·생활 영역을 분류한다.
짧은 감각 기록(감각 별)을 작성하면 AI가 태그와 근거를 추출하고, 백엔드가 최근 기록의 정렬 통계를 계산한다.
Solar는 백엔드가 계산한 통계만 바탕으로 자연어 정렬 리포트를 작성한다.

# 역할 분담
## AI가 하는 일
- 북극성 문장 요약
- 고정 목록에서 핵심 가치·생활 영역·감각 태그 선택
- 기록에서 관련 가치와 근거 문구 추출
- 백엔드 통계에 대한 자연어 설명
- 성찰 질문 생성

## AI가 하지 않는 일
- 임의의 새 태그 생성
- 사용자 성격·삶 단정 또는 심리 진단
- 입력하지 않은 경험 창작
- 사용자가 선택한 「누구와」 값 변경
- 근거 없는 0~100점 가치관 점수 생성
- 통계에 없는 결론 생성

## 백엔드가 하는 일
- AI JSON 검증 및 허용 태그 검증
- 분석 결과 저장
- 정렬 통계·관찰 비율·대표 기록 계산
- 인증된 사용자 본인 데이터만 접근 허용

# 기술 스택
- Backend: Python 3.12, FastAPI, Pydantic 2, SQLAlchemy 2(동기), PostgreSQL/Supabase, Alembic, httpx, OpenAI SDK(Upstage), pytest, Ruff
- Frontend: React Native Expo, Supabase Auth
- AI: Upstage Solar Pro 3 (`UPSTAGE_MODEL=solar-pro3`)
- MVP 범위: Redis, Celery, LangChain, RAG, 벡터 DB, Docker 미도입. 단순하고 실행 가능한 구조 우선.

# 작업 규칙
1. 백엔드 변경은 backend/ 내부만, 프론트 변경은 frontend/ 내부만 수정한다.
2. 비밀값을 코드에 작성하지 않고 .env.example만 갱신한다.
3. PR·이슈·커밋·push는 Fork한 팀 레포에서만 수행한다. 원본 ApptiveDev/AI-Builder-Sprint에는 직접 올리지 않는다.
4. 사소한 선택은 질문하지 말고 합리적 기본값으로 진행한다.
5. 각 단계마다 테스트 또는 실행으로 오류를 먼저 해결한 뒤 다음 단계로 이동한다.
6. 과도한 추상화·마이크로서비스화를 피하고 기존 코드 스타일과 패턴을 따른다.
7. FastAPI 라우터는 동기 DB·동기 Upstage 클라이언트를 사용하므로 불필요한 async/sync 혼합을 하지 않는다.

# 고정 태그 (backend/app/core/constants.py 와 공유)
- 핵심 가치: 관계, 성장, 자율, 건강, 안정, 도전, 기여, 성취, 창의, 즐거움, 돌봄, 진정성
- 생활 영역: 가족, 친구, 연인, 학업, 일, 건강관리, 취미, 여행, 자기돌봄, 사회활동, 일상
- 감각: 시각, 청각, 후각, 미각, 촉각
- 누구와: 아빠, 엄마, 가족, 친구, 연인, 동료, 나 자신, 기타

# 인증
- 회원가입·로그인은 프론트 Supabase Auth가 처리한다.
- 백엔드는 Authorization: Bearer <SUPABASE_ACCESS_TOKEN> 헤더만 검증한다.
- GET {SUPABASE_URL}/auth/v1/user 로 토큰을 검증하고 user id를 사용한다.

# AI 응답 처리
1. Markdown 코드 블록 제거
2. JSON 파싱
3. Pydantic 스키마 검증
4. 허용 태그 검증
5. 실패 시 형식 수정 요청으로 최대 1회 재시도
6. 두 번째도 실패하면 502 반환

# 정렬 통계 (백엔드 계산, AI 금지)
- aligned_record_rate = 북극성 핵심 가치가 1개 이상 관찰된 기록 비율
- 「최근 기록에서 덜 나타난 가치」 표현 사용. 「부족한/실패한 가치」 표현 금지
- 기록 0개면 리포트 생성 거부(422)

# 주요 API (backend)
- GET /health, GET /api/v1/ready
- PUT/GET /api/v1/north-star
- POST/GET/DELETE /api/v1/stars
- POST/GET /api/v1/reports/alignment
- GET /api/v1/tags

# 완료 전 확인
- backend: pytest, ruff check .
- mock 테스트는 API 키 없이도 통과해야 한다.
- README와 .env.example이 최신 상태인지 확인한다.
```

---

## 에이전트별 참고

| 영역 | 문서 |
|------|------|
| 백엔드 실행·환경변수 | `backend/README.md` |
| 대회·Fork·제출 | 루트 `README.md` |

