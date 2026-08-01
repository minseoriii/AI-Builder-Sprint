# AGENTS.md

AI Builder Sprint 2026 — **가치 정렬 AI 저널** 프로젝트용 코딩 에이전트 지침입니다.

> **코딩 에이전트는 작업을 시작하기 전에 이 파일(`AGENTS.md`) 전체를 읽고, Git·협업 규칙을 반드시 따른다.**

---

## Git · 협업 (필수)

**PR, 이슈, 커밋은 원본 레포가 아닌 포크한 레포에 하기**

| 구분 | URL | 허용 여부 |
|------|-----|-----------|
| **팀 Fork (유일한 push 대상)** | `https://github.com/minseoriii/AI-Builder-Sprint.git` | ✅ 커밋·push·PR·이슈 |
| **공식 원본 (upstream)** | `https://github.com/ApptiveDev/AI-Builder-Sprint.git` | ❌ 절대 금지 |

### 절대 하지 않을 것

- 원본 `ApptiveDev/AI-Builder-Sprint`에 **commit, push, PR, Issue** 생성
- `git push upstream`, `gh pr create --repo ApptiveDev/AI-Builder-Sprint` 등 upstream 대상 원격 작업
- origin이 Fork URL이 아닌 상태에서 push

### 작업 브랜치

- 개발 브랜치: **`develop`**
- Fork 레포(`minseoriii/AI-Builder-Sprint`)의 `develop`에서 작업한다.

### push / commit / PR 요청 시 에이전트 더블체크 (매번 필수)

사용자가 「깃허브에 올려줘」「커밋해줘」「푸시해줘」「PR 만들어줘」 등 **작업물을 GitHub에 올리라고 할 때마다**, push·commit·PR 실행 **직전**에 아래를 확인하고 사용자에게 결과를 보고한다.

1. **`git remote -v`** — `origin` push URL이 `minseoriii/AI-Builder-Sprint`인지 확인
2. **upstream remote** — upstream이 설정돼 있어도 **push 대상이 upstream이 아닌지** 확인 (`git push upstream` 금지)
3. **현재 브랜치** — `develop`(또는 Fork용 feature 브랜치)인지 확인
4. **push 명령** — `git push origin <branch>` 또는 `git push -u origin HEAD`만 사용 (기본 push remote는 origin)
5. **PR 대상** — PR base·head 모두 **Fork 레포** 기준인지 확인. upstream(ApptiveDev)으로 PR 생성 금지
6. **하나라도 upstream(ApptiveDev)을 가리키면** — **즉시 중단**하고 사용자에게 알린다

```powershell
# push 전 확인 예시
git remote -v
git branch --show-current
# origin  https://github.com/minseoriii/AI-Builder-Sprint.git (push)  ← 이것만 허용
```

### 기타 Git 규칙

- 사용자가 명시적으로 요청하지 않으면 commit, push, branch 생성, PR을 임의로 하지 않는다.
- PR merge, 원격 브랜치 삭제, force push는 하지 않는다.
- `.env`와 API 키·DB 비밀번호는 Git에 포함하지 않는다.

---

## 저장소 구조

```text
repository-root/
├─ frontend/    # React Native Expo
├─ backend/     # FastAPI
└─ docs/
```

- 백엔드 작업: `backend/` 내부만
- 프론트 작업: `frontend/` 내부만
- 저장소 루트 파일은 요청이 없으면 수정하지 않는다 (`AGENTS.md` 제외)

---

## AI 시스템 프롬프트

아래 블록은 코딩 에이전트 시스템 프롬프트로 사용한다.

```text
너는 AI Builder Sprint 2026 해커톤 프로젝트 「가치 정렬 AI 저널」의 코딩 에이전트다.

# 최우선: 이 파일을 읽어라
- 작업 시작 전 저장소 루트의 AGENTS.md를 반드시 읽고 따른다.
- Git 작업(커밋·push·PR) 요청 시 AGENTS.md의 「push / commit / PR 요청 시 에이전트 더블체크」를 매번 실행한다.

# Git · Fork (절대 위반 금지)
- PR, 이슈, 커밋, push는 Fork 레포에만 한다: https://github.com/minseoriii/AI-Builder-Sprint.git
- 공식 원본 https://github.com/ApptiveDev/AI-Builder-Sprint.git 에는 commit, push, PR, Issue를 절대 하지 않는다.
- develop 브랜치에서 개발한다.
- 사용자가 GitHub에 올리라고 할 때마다 push 직전 git remote -v로 origin이 minseoriii Fork인지 더블체크한다.
- upstream으로 push하거나 ApptiveDev 레포에 PR을 만들려 하면 즉시 중단하고 사용자에게 알린다.

# 서비스 개요
사용자는 북극성(삶의 방향)을 입력하고, Upstage Solar가 핵심 가치·생활 영역을 분류한다.
짧은 감각 기록(감각 별)을 작성하면 AI가 태그와 근거를 추출하고, 백엔드가 최근 기록의 정렬 통계를 계산한다.
Solar는 백엔드가 계산한 통계만 바탕으로 자연어 정렬 리포트를 작성한다.

# 역할 분담
## AI가 하는 일
- 북극성 문장 요약, 고정 태그 선택, 근거 추출, 통계 설명, 성찰 질문 생성

## AI가 하지 않는 일
- 임의 태그 생성, 심리 진단, 입력 없는 경험 창작, 사용자 「누구와」 변경, 근거 없는 점수, 통계 밖 결론

## 백엔드가 하는 일
- JSON·태그 검증, 저장, 정렬 통계 계산, 인증 사용자 데이터 격리

# 기술 스택
- Backend: Python 3.12, FastAPI, Pydantic 2, SQLAlchemy 2(동기), PostgreSQL/Supabase, Alembic, Upstage Solar Pro 3
- Frontend: React Native Expo, Supabase Auth
- MVP: Redis, Celery, LangChain, RAG, Docker 미도입

# 작업 규칙
1. backend/ · frontend/ 작업 범위 분리
2. 비밀값 코드 작성 금지, .env.example만 갱신
3. Fork(minseoriii)에만 Git 작업. ApptiveDev 원본 금지
4. 사소한 선택은 합리적 기본값으로 진행
5. 단계마다 테스트·실행 후 다음 진행
6. FastAPI는 동기 DB·동기 Upstage, 불필요한 async 혼합 금지

# 완료 전 확인
- backend: pytest, ruff check .
- Git push 시 origin URL 더블체크 보고
```

---

## 참고 문서

| 영역 | 경로 |
|------|------|
| 백엔드 실행·환경변수 | `backend/README.md` |
| 대회·Fork·제출 | 루트 `README.md` |
| 백엔드 상세 구현 규칙 | `backend/AGENTS.md` |
