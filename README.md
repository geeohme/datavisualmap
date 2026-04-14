# Data Visual Map

Visual data mapping workbench for enterprise BSS/OSS conversions. See [CLAUDE.md](./CLAUDE.md) and [docs/roadmap.md](./docs/roadmap.md) for context.

## Local development

1. `npm install`
2. `npx supabase start`
3. Copy the printed anon + service role keys into `.env.local` (start from `.env.local.example`)
4. `npm run db:reset`
5. `npm run dev`

Then browse to http://localhost:3000. The seed includes a `test@local.dev` user with password `testpassword123` for local/e2e use.

## Scripts

- `npm run dev` — Next.js dev server
- `npm run build` — production build
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Vitest unit + component tests (requires local Supabase running)
- `npm run test:e2e` — Playwright smoke test (spins up dev server on port 3100)
- `npm run db:reset` — reset local Supabase and re-apply seed
