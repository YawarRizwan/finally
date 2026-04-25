# FinAlly Agent Team

Six specialized subagents collaborate via files in `planning/`. The source of truth is `PLAN.md`; this doc describes who owns what and how handoffs work.

## Roster

| Agent | Owns | Does NOT touch |
|---|---|---|
| `frontend-engineer` | `frontend/` — Next.js, components, SSE consumption, charts, styling, unit tests | backend, DB, LLM, Docker, E2E |
| `backend-engineer` | `backend/` FastAPI routes, trade logic, snapshot task, static mount, unit tests | DB SQL, LLM calls, frontend, Docker |
| `database-engineer` | `backend/db/` schema + repositories, seeding, unit tests | API routes, LLM, frontend, Docker |
| `llm-engineer` | LLM module (LiteLLM → OpenRouter / Cerebras), structured outputs, mock mode, fixture | API routes, DB writes, trade execution, frontend |
| `integration-tester` | `test/` — Playwright E2E, `docker-compose.test.yml`, bug reports | Any production source code |
| `devops-engineer` | `Dockerfile`, `docker-compose.yml`, `scripts/`, `.env.example`, `.gitignore`, test compose skeleton | Application code |

The market data component is already complete (`planning/MARKET_DATA_SUMMARY.md`) — no agent owns it for new work.

## Shared notes files (agents write, humans read)

- `planning/FRONTEND_NOTES.md` — open questions from frontend to backend
- `planning/BACKEND_NOTES.md` — open questions from backend (DB/LLM shape asks, contract ambiguities)
- `planning/DB_NOTES.md` — schema ambiguities
- `planning/LLM_NOTES.md` — prompt/schema ambiguities
- `planning/DEVOPS_NOTES.md` — build/runtime ambiguities
- `planning/BUGS.md` — integration tester files issues here; assigns the owning agent

Agents **stop** when they hit an ambiguity rather than guessing. A note in the relevant file is the handoff.

## Contract invariants (do not change without updating PLAN.md)

- API shapes in §8, SSE event fields in §6, DB schema in §7, LLM structured output in §9
- Color palette: `#ecad0a` accent, `#209dd7` primary, `#753991` submit
- `user_id` default `"default"` lives in repositories only — never inline in raw SQL
- Failed trades/watchlist changes stay in the response arrays with `status: "rejected"` — never stripped
- `LLM_MOCK=true` + pinned fixture at `test/fixtures/llm_mock_response.json` is the E2E determinism contract

## Typical flow

1. User (or lead) dispatches work by invoking a subagent with a specific task.
2. Agent reads `PLAN.md` + its own `*_NOTES.md` for outstanding questions.
3. Agent implements incrementally, runs its own unit tests, commits.
4. Integration Tester runs E2E on the assembled stack. Failures → `BUGS.md` with owner.
5. Owner fixes, re-runs the affected test, then the full suite.
