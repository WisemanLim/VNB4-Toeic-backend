# VNB4-Toeic-backend

> 🌐 **Language / 언어**: **English** · [한국어](README.md)

NestJS API + BullMQ worker + shared types.

## Why NestJS (not FastAPI per PRD §5.3.1)

Satisfies the user requirement of a "unified development language" → every component except the app is TypeScript.
Tradeoffs of adopting NestJS:
- ✅ Same language as frontend/database/ops → full-stack single-language operation
- ✅ Automatic OpenAPI generation (`/docs`) → instant client SDK generation for RN/Next
- ✅ Supports both TypeORM and Prisma
- ⚠ Machine learning / audio processing has a weaker library ecosystem than Python → compensated by the worker calling the Azure SDK directly

## Structure

```
backend/
├── api/         # NestJS HTTP API (REST + Swagger)
├── worker/      # BullMQ TTS/media worker
└── shared/      # cross-package TS types
```

## PRD module mapping

| PRD area | Location |
|---|---|
| §1.3 Authentication (Google/Apple/Kakao/Email+OTP) | `api/src/modules/auth` |
| §1.3 Word cards / example sentences / images | `api/src/modules/words` + `lessons` |
| §1.3 SRS review queue / progress | `api/src/modules/progress` (SM-2) |
| §1.3 TTS batch | `api/src/modules/tts` + `worker/src/jobs/tts.job.ts` |
| §1.3 Word CRUD / statistics | `api/src/modules/words` + Roles guard |
| 문장쓰기 (sentence writing — pick the word) · shadowing | `api/src/modules/sentences` — `GET /sentences` (+`/stats`, `/:id`), Part 1–4 |
| Lesson list / detail | `api/src/modules/lessons` — `GET /lessons` (+`/:id`), `POST` (admin/editor) |
| TTS batch + job status | `POST /tts/batch` (creates Job record + BullMQ enqueue), `GET /tts/jobs` (recent batches + queue count) |
| User management | `GET /users` (admin list · search · role filter), `GET /users/stats`, `GET /users/me` |
| 취약유형 (weak-type, LC/RC) analysis | `GET /me/analysis` (jwt) — aggregates progress → `{avgScore,targetScore,tested,segments,detail}`. segments = LC/RC **correct/incorrect 4-way split** (value>0 only). When unlearned, tested:false · segments:[]. App home donut chart |
| Admin dashboard statistics | `GET /words/stats` · `/sentences/stats` · `/users/stats` → `{ total, byPart\|byRole }` |

> **Route order**: `@Get("stats")` must always be declared before `@Get(":id")` (words/sentences/users) — otherwise `stats` gets matched as `:id`.

## 기본 관리자 계정 (default admin)

At boot, `AuthService.onApplicationBootstrap()` guarantees an env-based default admin (create-if-absent, role=admin).
Configuration lives in **ops/env** (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME`).
The password of an existing account is not overwritten (preserving operator changes). Leaving `SEED_ADMIN_PASSWORD` empty disables it.

> **JWT boot bug fix**: `JwtModule.register({secret: process.env.JWT_SECRET})` is evaluated at import time and
> signs with a fallback secret before ConfigModule loads `.env*` → mismatch with the strategy (validated against the real secret at DI time),
> causing all tokens to return 401. Switched to `registerAsync({useFactory})` so both sides use the same secret.

## Commands

```bash
pnpm install                # workspace install
cd api && pnpm start:dev    # HTTP API on :4000, /docs Swagger
cd worker && pnpm start:dev # background worker
```

DATABASE_URL, REDIS_*, OAuth/TTS keys → `.env` (see `.env.example`).

## Integrated components (PRD §4)

| Consumer | Endpoints used | Notes |
|---|---|---|
| `app/` (RN) | `/auth/signup\|login/email`, `/users/me`, `/words?part=N` (all words of a part, paginated), `/sentences`, `/progress/due` · `/grade` · `/stats`, `/me/analysis` | **Guest = offline mock** (`src/core/mocks.ts` + bundled seed of all words), **logged in = real-server sync**. `/auth/*` is always served by the server |
| `frontend/` (admin) | `/words` · `/sentences` · `/lessons` · `/users` lists, `/tts/batch` · `/tts/jobs`, each `/stats` | Roles guard (admin/editor) |
| `database/` | Prisma schema + `seeds/parts/*.json` | Source data for the app's offline bundle |

> When the API contract changes, the app's `src/core/schemas.ts` (Zod) must be kept in sync.

## Open-source fork strategy

Used only as a dependency. No separate fork repo → no license trigger.
All npm dependencies are MIT / Apache-2.0 / BSD. Argon2 (LGPL-3.0) is dynamically linked → no impact. Details in [LICENSES.md](../LICENSES.md).
