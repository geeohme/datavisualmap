# Data Visual Map

Visual data mapping workbench for enterprise BSS/OSS system conversions. It's a **mapping record and facilitation surface** used in live meetings — not ETL. Output is documentation of intent, not executed data movement.

## Start Here

- **Problem framing and user stories:** [AI-assisted_visual_data_mapping.md](AI-assisted_visual_data_mapping.md)
- **Phase roadmap (6 sub-projects):** [docs/roadmap.md](docs/roadmap.md)
- **Current phase spec (MVP Core):** [docs/superpowers/specs/2026-04-14-mvp-core-design.md](docs/superpowers/specs/2026-04-14-mvp-core-design.md)

The project is being built in phases. Always check the roadmap to see what phase we're in and what's deferred. Each phase has its own spec in `docs/superpowers/specs/`.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Supabase (Postgres, Auth, RLS) — not Firestore
- React Flow (`@xyflow/react`) for the canvas
- TanStack Query for server state, Zustand for transient canvas UI state
- Tailwind + shadcn/ui
- Vitest + Playwright for tests
- Vercel for hosting

## Architectural Rules

- **All Supabase access goes through `lib/db/*`.** Components never import Supabase clients directly. RLS is the real security boundary; `lib/db` exists for typing and consistency.
- **`components/canvas/*` knows nothing about Supabase.** It takes props and emits events. This keeps the React Flow surface area contained and testable.
- **Explicit statuses, not derived ones.** `data_elements.status` includes `not_needed` and `blocked` as real values — do not treat "no mapping exists" as equivalent to unmapped.
- **Mappings are single rows with `uuid[]` endpoints.** Many:1 and 1:many live in one edge row. Don't denormalize into multiple rows per endpoint.
- **Audit log is written by Postgres triggers**, not app code. Don't add app-side audit writes — the triggers cover every path.
- **Tests hit real Postgres** (local Supabase via CLI), not mocks. The schema and RLS are the things we care about validating.
- **YAGNI for deferred phases.** Don't add hooks for versioning, realtime presence, LLM import, or exports until their phase. The schema is designed to extend forward without breaking changes.

## Working Style

- Superpowers skills are installed and active. Use `superpowers:brainstorming` before starting a new phase, `superpowers:writing-plans` to produce the implementation plan, `superpowers:executing-plans` to run it, and `superpowers:test-driven-development` during implementation.
- Memory MCP is available (`mcp__memory__*`) if the conversation needs durable cross-session state beyond the file-based memory system.
- Supabase MCP (`mcp__plugin_supabase_supabase__*`) is available for operating on the Supabase project once credentials are set up.
- Context7 MCP is available for fetching current library docs (React Flow, Next.js 15, Supabase, TanStack Query) — prefer it over guessing API shapes from training data.
- Serena MCP is available for semantic code navigation on larger files.

## Conventions

- TypeScript strict mode. No `any` without a justifying comment.
- Zod schemas in `lib/domain/` are the source of truth for shapes that cross the network or DB boundary.
- Folder structure is flat within each layer. Don't create `lib/db/containers/index.ts` — use `lib/db/containers.ts`.
- Don't write comments that explain what well-named code already says. Only comment the non-obvious *why*.
- Prefer editing existing files over creating new ones.
