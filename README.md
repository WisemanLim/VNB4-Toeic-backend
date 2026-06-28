# VNB4-Toeic-backend

> 🌐 **언어 / Language**: **한국어** · [English](README.en.md)

NestJS API + BullMQ worker + shared types.

## Why NestJS (not FastAPI per PRD §5.3.1)

사용자 요구 "통일된 개발언어" 충족 → app 외 전 컴포넌트 TypeScript.
NestJS 채택 트레이드오프:
- ✅ frontend/database/ops와 동일 언어 → 풀스택 single-language 운영
- ✅ OpenAPI 자동 생성 (`/docs`) → RN/Next 클라이언트 SDK 즉시 생성
- ✅ TypeORM/Prisma 모두 지원
- ⚠ 머신러닝/오디오 처리는 Python 생태계 대비 라이브러리 빈약 → worker가 Azure SDK 직접 호출로 보완

## Structure

```
backend/
├── api/         # NestJS HTTP API (REST + Swagger)
├── worker/      # BullMQ TTS/media worker
└── shared/      # cross-package TS types
```

## PRD module mapping

| PRD 영역 | 위치 |
|---|---|
| §1.3 인증 (Google/Apple/Kakao/Email+OTP) | `api/src/modules/auth` — 현재 구현: **Email(비밀번호)** + **Google OAuth**. Apple/Kakao/OTP 미구현(deps만 존재) |
| §1.3 단어카드/예문/이미지 | `api/src/modules/words` + `lessons` |
| §1.3 SRS 복습큐/진도 | `api/src/modules/progress` (SM-2) |
| §1.3 TTS 배치 | `api/src/modules/tts` + `worker/src/jobs/tts.job.ts` |
| §1.3 단어 CRUD/통계 | `api/src/modules/words` + Roles 가드 |
| 문장쓰기(단어 고르기)·쉐도잉 | `api/src/modules/sentences` — `GET /sentences`(+`/stats`, `/:id`), Part 1–4 |
| 레슨 목록/상세 | `api/src/modules/lessons` — `GET /lessons`(+`/:id`), `POST` (admin/editor) |
| TTS 배치 + 작업현황 | `POST /tts/batch`(Job 레코드 생성 + BullMQ enqueue), `GET /tts/jobs`(최근 배치 + 큐 카운트) |
| 사용자 관리 | `GET /users`(admin 목록·검색·역할필터), `GET /users/stats`, `GET /users/me` |
| 취약유형(LC/RC) 분석 | `GET /me/analysis`(jwt) — progress 집계 → `{avgScore,targetScore,tested,segments,detail}`. segments = LC/RC **정답·오답 4분할**(value>0만). 미학습 시 tested:false·segments:[]. 앱 홈 도넛 |
| 관리자 대시보드 통계 | `GET /words/stats`·`/sentences/stats`·`/users/stats` → `{ total, byPart\|byRole }` |

> **라우트 순서**: `@Get("stats")` 는 항상 `@Get(":id")` 보다 먼저 선언(words/sentences/users) — 안 그러면 `stats` 가 `:id` 로 잡힘.

## 기본 관리자 계정 (default admin)

부팅 시 `AuthService.onApplicationBootstrap()` 가 env 기반 기본 관리자를 보장(create-if-absent, role=admin).
설정은 **ops/env** (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME`).
기존 계정 비밀번호는 덮어쓰지 않음(운영자 변경 보존). `SEED_ADMIN_PASSWORD` 비우면 비활성.

> **JWT 부트 버그 수정**: `JwtModule.register({secret: process.env.JWT_SECRET})` 는 import 시점에 평가돼
> ConfigModule이 `.env*` 를 로드하기 전 fallback 시크릿으로 서명 → strategy(DI 시점, 실시크릿 검증)와 불일치로
> 모든 토큰 401. `registerAsync({useFactory})` 로 전환해 양쪽이 동일 시크릿 사용.

## Commands

```bash
pnpm install                # workspace install
cd api && pnpm start:dev    # HTTP API on :4000, /docs Swagger
cd worker && pnpm start:dev # background worker
```

DATABASE_URL, REDIS_*, OAuth/TTS keys → `.env` (see `.env.example`).

## 연계 컴포넌트 (PRD §4)

| 소비자 | 사용 엔드포인트 | 비고 |
|---|---|---|
| `app/` (RN) | `/auth/signup\|login/email`, `/users/me`, `/words?part=N`(파트 전체 단어, 페이지네이션), `/sentences`, `/progress/due`·`/grade`·`/stats`, `/me/analysis` | **게스트=오프라인 mock**(`src/core/mocks.ts`+번들 시드 전체 단어), **로그인=실서버 동기화**. `/auth/*` 는 항상 서버 |
| `frontend/` (admin) | `/words`·`/sentences`·`/lessons`·`/users` 목록, `/tts/batch`·`/tts/jobs`, 각 `/stats` | Roles 가드(admin/editor) |
| `database/` | Prisma 스키마 + `seeds/parts/*.json` | 앱 오프라인 번들의 원천 데이터 |

> API 계약 변경 시 앱 `src/core/schemas.ts` (Zod) 동기화 필요.

## Open-source fork strategy

Dependency 형태로만 사용. 별도 fork repo 없음 → 라이선스 트리거 없음.
모든 npm 의존성 MIT / Apache-2.0 / BSD. Argon2 (LGPL-3.0)는 동적링크 → 영향 없음. 상세 [LICENSES.md](../VNB4-Toeic-ops/LICENSES.md).
