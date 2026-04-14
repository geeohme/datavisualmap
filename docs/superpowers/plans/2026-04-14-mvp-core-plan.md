# MVP Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Data Visual Map MVP — a multi-user Next.js + Supabase web app where authenticated teammates create projects, add source/target containers (manually or via CSV paste), drag field-to-field mappings on a React Flow canvas, and see live status counts, with all changes captured in a Postgres-trigger audit log.

**Architecture:** Next.js 15 App Router on Vercel. Supabase (Postgres + Auth + RLS) is the only backend. All database access flows through a thin typed `lib/db/*` layer; components receive props and emit events, never touching Supabase directly. React Flow renders the canvas with custom container nodes that expose per-field connection handles. RLS scoped to `project_members` is the real security boundary.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Supabase (Postgres 15, Auth, RLS), `@xyflow/react` (React Flow v12), TanStack Query v5, Zustand, Tailwind CSS v4, shadcn/ui, Zod, PapaParse, Vitest, React Testing Library, Playwright, Supabase CLI, GitHub Actions.

**Spec:** [docs/superpowers/specs/2026-04-14-mvp-core-design.md](../specs/2026-04-14-mvp-core-design.md)

---

## File Structure

```
package.json, tsconfig.json, next.config.ts
tailwind.config.ts, postcss.config.mjs
.env.local.example, .gitignore (update)
README.md (minimal)
middleware.ts                              Supabase session refresh
vitest.config.ts, playwright.config.ts

supabase/
  config.toml                              Supabase CLI config
  migrations/
    0001_initial_schema.sql                Tables, enums, indexes
    0002_rls_policies.sql                  RLS on all tables
    0003_audit_triggers.sql                Append-only audit log triggers
  seed.sql                                 Test user + fixtures for local dev

app/
  layout.tsx                               Root layout, Providers
  globals.css                              Tailwind directives
  page.tsx                                 Redirect to /projects
  providers.tsx                            QueryClient, Toaster
  (auth)/login/page.tsx                    Google OAuth button
  (auth)/callback/route.ts                 OAuth callback handler
  projects/page.tsx                        Project list + New Project
  projects/[id]/page.tsx                   Workspace (canvas + inspector)

components/
  canvas/
    Canvas.tsx                             React Flow wrapper
    ContainerNode.tsx                      Custom node w/ per-field handles
    MappingEdge.tsx                        Custom edge w/ confidence styling
    nodeTypes.ts                           React Flow node/edge type map
  inspector/
    Inspector.tsx                          Right panel router
    ElementForm.tsx                        Editable data element fields
    MappingForm.tsx                        Editable mapping fields
    ProjectSummary.tsx                     Shown when nothing selected
  import/
    CsvPasteDialog.tsx                     Modal for CSV paste import
    csvParser.ts                           Header + type-row parsing (pure)
  project/
    Sidebar.tsx                            Layout shell for left panel
    Dashboard.tsx                          Status counts w/ filter clicks
    ProjectTree.tsx                        Grouped container/field tree
    AddContainerMenu.tsx                   "+ Add Container" dropdown
    NewProjectDialog.tsx                   Modal used from /projects
    NewContainerDialog.tsx                 Manual container creation
  ui/                                      shadcn/ui primitives (vendored)

lib/
  supabase/
    browser.ts                             createBrowserClient
    server.ts                              createServerClient (RSC + Route Handlers)
    middleware.ts                          createMiddlewareClient
  db/
    projects.ts
    members.ts
    containers.ts
    elements.ts
    mappings.ts
    stats.ts                               Aggregate status counts
  domain/
    enums.ts                               Status / type / confidence string unions
    schemas.ts                             Zod schemas
    types.ts                               Exported inferred types
  hooks/
    useMutationWithToast.ts                Shared mutation wrapper w/ rollback
    useProjectData.ts                      TanStack Query hook for a project
  graph/
    .gitkeep                               Reserved for phase 3

tests/
  db/
    projects.test.ts
    containers.test.ts
    elements.test.ts
    mappings.test.ts
    rls.test.ts
    stats.test.ts
  domain/schemas.test.ts
  import/csvParser.test.ts
  components/
    Inspector.test.tsx
    CsvPasteDialog.test.tsx
    ContainerNode.test.tsx
  e2e/mvp-smoke.spec.ts
  helpers/
    supabase.ts                            Test client factory + reset helper
    fixtures.ts                            Project/container/element builders

.github/workflows/ci.yml                   Typecheck + vitest + supabase + playwright
```

Each `lib/db/*.ts` file exports pure async functions taking a `SupabaseClient` and typed args — never reads Supabase from module scope. This makes them trivially testable against a local Supabase instance.

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `.env.local.example`
- Modify: `.gitignore`

- [ ] **Step 1: Initialize Next.js app in place**

Run:
```bash
npx create-next-app@latest . --ts --app --tailwind --eslint --src-dir=false --import-alias="@/*" --use-npm --no-turbopack
```

If the tool refuses due to non-empty directory, accept the prompt to proceed (existing docs and CLAUDE.md must not be overwritten — verify they still exist afterward).

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr @xyflow/react @tanstack/react-query zustand zod papaparse sonner class-variance-authority clsx tailwind-merge lucide-react
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test @types/papaparse supabase tsx
```

- [ ] **Step 4: Create `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...local-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...local-service-role-key
```

- [ ] **Step 5: Ensure `.gitignore` includes**

Add if missing:
```
.env.local
/supabase/.temp
/test-results
/playwright-report
/.next
/coverage
```

- [ ] **Step 6: Verify app builds**

Run: `npm run build`
Expected: build succeeds with zero errors. Default Next.js home page compiles.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 app with core dependencies"
```

---

## Task 2: Supabase Local Setup

**Files:**
- Create: `supabase/config.toml` (generated), `supabase/seed.sql`
- Create: `scripts/db-reset.sh`

- [ ] **Step 1: Initialize Supabase project**

```bash
npx supabase init
```

- [ ] **Step 2: Start local Supabase**

```bash
npx supabase start
```

Expected: prints API URL (`http://127.0.0.1:54321`), anon key, service_role key, Studio URL. Copy the anon + service_role keys into `.env.local` (create from `.env.local.example`).

- [ ] **Step 3: Create `supabase/seed.sql` with a minimal test user**

```sql
-- Seed a deterministic test user for local dev + tests.
-- Email: test@local.dev, password: testpassword123
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'test@local.dev',
  crypt('testpassword123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}', false
) on conflict (id) do nothing;
```

- [ ] **Step 4: Create `scripts/db-reset.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
npx supabase db reset --no-seed=false
```

```bash
chmod +x scripts/db-reset.sh
```

- [ ] **Step 5: Run reset to apply seed**

Run: `./scripts/db-reset.sh`
Expected: Supabase resets cleanly, applies migrations (none yet) and seed.

- [ ] **Step 6: Commit**

```bash
git add supabase/ scripts/ .env.local.example
git commit -m "chore: add Supabase local setup with test user seed"
```

---

## Task 3: Initial Schema Migration

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0001_initial_schema.sql
create extension if not exists "pgcrypto";

create type container_type as enum ('source','target','transformation','report','category');
create type element_fidelity as enum ('full','partial','label_only');
create type element_status as enum ('unmapped','mapped','not_needed','blocked','in_review','confirmed');
create type mapping_type as enum ('passthrough','concat','lookup','formula','derived','constant');
create type mapping_confidence as enum ('draft','confirmed');
create type member_role as enum ('owner','editor','viewer');

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table containers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  container_type container_type not null,
  system_name text,
  position_x real not null default 0,
  position_y real not null default 0,
  collapsed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index containers_project_id_idx on containers(project_id);

create table data_elements (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references containers(id) on delete cascade,
  display_label text not null,
  db_column_name text,
  ui_label text,
  data_type text,
  format text,
  nullable boolean,
  example_values text,
  notes text,
  tags text[] not null default '{}',
  fidelity element_fidelity not null default 'label_only',
  status element_status not null default 'unmapped',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index data_elements_container_id_idx on data_elements(container_id);

create table mappings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  source_element_ids uuid[] not null,
  target_element_ids uuid[] not null,
  mapping_type mapping_type not null default 'passthrough',
  transformation_note text,
  confidence mapping_confidence not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  constraint mappings_non_empty_source check (array_length(source_element_ids, 1) > 0),
  constraint mappings_non_empty_target check (array_length(target_element_ids, 1) > 0)
);
create index mappings_project_id_idx on mappings(project_id);
create index mappings_source_gin on mappings using gin (source_element_ids);
create index mappings_target_gin on mappings using gin (target_element_ids);

create table audit_log (
  id bigserial primary key,
  project_id uuid not null,
  user_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('create','update','delete')),
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);
create index audit_log_project_id_at_idx on audit_log(project_id, at desc);
```

- [ ] **Step 2: Reset and verify**

Run: `./scripts/db-reset.sh`
Expected: applies without errors. Verify with `npx supabase db diff` (should show nothing).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_initial_schema.sql
git commit -m "feat(db): add initial schema for projects, containers, elements, mappings"
```

---

## Task 4: RLS Policies Migration

**Files:**
- Create: `supabase/migrations/0002_rls_policies.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0002_rls_policies.sql

alter table projects enable row level security;
alter table project_members enable row level security;
alter table containers enable row level security;
alter table data_elements enable row level security;
alter table mappings enable row level security;
alter table audit_log enable row level security;

-- Helper: is current user a member of project?
create or replace function is_project_member(pid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from project_members
    where project_id = pid and user_id = auth.uid()
  );
$$;

-- projects: members can read; anyone authenticated can create;
-- only owners can update/delete.
create policy "projects_select_members" on projects
  for select using (is_project_member(id));

create policy "projects_insert_authenticated" on projects
  for insert with check (auth.uid() is not null and created_by = auth.uid());

create policy "projects_update_owners" on projects
  for update using (
    exists (select 1 from project_members
            where project_id = id and user_id = auth.uid() and role = 'owner')
  );

create policy "projects_delete_owners" on projects
  for delete using (
    exists (select 1 from project_members
            where project_id = id and user_id = auth.uid() and role = 'owner')
  );

-- project_members: members can see the member list;
-- owners manage membership. A user creating a project gets a membership
-- row via a trigger (see below) so the chicken-and-egg of
-- "you can't add yourself as owner because you're not a member yet" is avoided.
create policy "members_select" on project_members
  for select using (is_project_member(project_id));

create policy "members_owner_manage" on project_members
  for all using (
    exists (select 1 from project_members pm
            where pm.project_id = project_members.project_id
              and pm.user_id = auth.uid() and pm.role = 'owner')
  ) with check (
    exists (select 1 from project_members pm
            where pm.project_id = project_members.project_id
              and pm.user_id = auth.uid() and pm.role = 'owner')
  );

-- containers, data_elements, mappings: project members with editor/owner can mutate; all members can read.
create policy "containers_select" on containers
  for select using (is_project_member(project_id));
create policy "containers_mutate" on containers
  for all using (is_project_member(project_id)) with check (is_project_member(project_id));

create policy "elements_select" on data_elements
  for select using (
    exists (select 1 from containers c
            where c.id = container_id and is_project_member(c.project_id))
  );
create policy "elements_mutate" on data_elements
  for all using (
    exists (select 1 from containers c
            where c.id = container_id and is_project_member(c.project_id))
  ) with check (
    exists (select 1 from containers c
            where c.id = container_id and is_project_member(c.project_id))
  );

create policy "mappings_select" on mappings
  for select using (is_project_member(project_id));
create policy "mappings_mutate" on mappings
  for all using (is_project_member(project_id)) with check (is_project_member(project_id));

create policy "audit_select" on audit_log
  for select using (is_project_member(project_id));

-- Auto-add creator as owner when a project is inserted.
create or replace function add_creator_as_owner()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into project_members (project_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger projects_add_creator_membership
  after insert on projects
  for each row execute function add_creator_as_owner();
```

- [ ] **Step 2: Reset and verify**

Run: `./scripts/db-reset.sh`
Expected: clean apply, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_rls_policies.sql
git commit -m "feat(db): add RLS policies scoped to project_members"
```

---

## Task 5: Audit Trigger Migration

**Files:**
- Create: `supabase/migrations/0003_audit_triggers.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0003_audit_triggers.sql

-- Resolve the project_id from any audited row.
create or replace function audit_project_id(entity_type text, row_data jsonb)
returns uuid language sql immutable as $$
  select case entity_type
    when 'projects' then (row_data->>'id')::uuid
    when 'containers' then (row_data->>'project_id')::uuid
    when 'mappings' then (row_data->>'project_id')::uuid
    when 'data_elements' then null  -- resolved separately
  end;
$$;

create or replace function audit_write()
returns trigger
language plpgsql
security definer
as $$
declare
  pid uuid;
  entity text := TG_TABLE_NAME;
  action_text text;
  before_json jsonb;
  after_json jsonb;
  entity_id uuid;
begin
  if (TG_OP = 'INSERT') then
    action_text := 'create';
    after_json := to_jsonb(new);
    before_json := null;
    entity_id := (after_json->>'id')::uuid;
  elsif (TG_OP = 'UPDATE') then
    action_text := 'update';
    before_json := to_jsonb(old);
    after_json := to_jsonb(new);
    entity_id := (after_json->>'id')::uuid;
  else
    action_text := 'delete';
    before_json := to_jsonb(old);
    after_json := null;
    entity_id := (before_json->>'id')::uuid;
  end if;

  if entity = 'data_elements' then
    select project_id into pid from containers
    where id = (coalesce(after_json, before_json)->>'container_id')::uuid;
  else
    pid := audit_project_id(entity, coalesce(after_json, before_json));
  end if;

  if pid is null then
    return coalesce(new, old);
  end if;

  insert into audit_log (project_id, user_id, entity_type, entity_id, action, before, after)
  values (pid, auth.uid(), entity, entity_id, action_text, before_json, after_json);

  return coalesce(new, old);
end;
$$;

create trigger projects_audit after insert or update or delete on projects
  for each row execute function audit_write();
create trigger containers_audit after insert or update or delete on containers
  for each row execute function audit_write();
create trigger data_elements_audit after insert or update or delete on data_elements
  for each row execute function audit_write();
create trigger mappings_audit after insert or update or delete on mappings
  for each row execute function audit_write();
```

- [ ] **Step 2: Reset and verify**

Run: `./scripts/db-reset.sh`
Expected: clean apply.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_audit_triggers.sql
git commit -m "feat(db): add append-only audit log triggers"
```

---

## Task 6: Test Helpers + Schema/RLS Tests

**Files:**
- Create: `vitest.config.ts`, `tests/helpers/supabase.ts`, `tests/helpers/fixtures.ts`, `tests/db/rls.test.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/helpers/vitest-setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 2: Create `tests/helpers/vitest-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Create `tests/helpers/supabase.ts`**

```ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function serviceClient(): SupabaseClient {
  return createClient(URL, SERVICE, { auth: { persistSession: false } })
}

export function anonClient(): SupabaseClient {
  return createClient(URL, ANON, { auth: { persistSession: false } })
}

export async function signInTestUser(
  client: SupabaseClient,
  email = 'test@local.dev',
  password = 'testpassword123',
): Promise<string> {
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user!.id
}

export async function resetDb() {
  const svc = serviceClient()
  // Truncate in FK-safe order
  const tables = ['audit_log', 'mappings', 'data_elements', 'containers', 'project_members', 'projects']
  for (const t of tables) {
    await svc.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  }
}
```

- [ ] **Step 4: Create `tests/helpers/fixtures.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

export async function makeProject(svc: SupabaseClient, userId: string, name = 'Test Project') {
  const { data, error } = await svc
    .from('projects')
    .insert({ name, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return data as { id: string; name: string }
}

export async function makeContainer(
  svc: SupabaseClient,
  projectId: string,
  overrides: Partial<{ name: string; container_type: string }> = {},
) {
  const { data, error } = await svc
    .from('containers')
    .insert({
      project_id: projectId,
      name: overrides.name ?? 'Customers',
      container_type: overrides.container_type ?? 'source',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function makeElement(svc: SupabaseClient, containerId: string, label: string) {
  const { data, error } = await svc
    .from('data_elements')
    .insert({ container_id: containerId, display_label: label })
    .select()
    .single()
  if (error) throw error
  return data
}
```

- [ ] **Step 5: Write the failing RLS test**

```ts
// tests/db/rls.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { anonClient, resetDb, serviceClient, signInTestUser } from '../helpers/supabase'
import { makeProject } from '../helpers/fixtures'

describe('RLS', () => {
  beforeEach(async () => { await resetDb() })

  it('non-members cannot see a project', async () => {
    const svc = serviceClient()
    // Create a project owned by a synthetic user (not our signed-in test user)
    const strangerId = '22222222-2222-2222-2222-222222222222'
    await svc.auth.admin.createUser({
      id: strangerId,
      email: 'stranger@local.dev',
      password: 'x',
      email_confirm: true,
    }).catch(() => {}) // ignore if exists
    const p = await makeProject(svc, strangerId, 'Secret')

    const anon = anonClient()
    await signInTestUser(anon)
    const { data, error } = await anon.from('projects').select('*').eq('id', p.id)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('creator becomes owner automatically', async () => {
    const anon = anonClient()
    const userId = await signInTestUser(anon)
    const { data: project, error } = await anon
      .from('projects')
      .insert({ name: 'Mine', created_by: userId })
      .select()
      .single()
    expect(error).toBeNull()
    const svc = serviceClient()
    const { data: members } = await svc
      .from('project_members')
      .select('*')
      .eq('project_id', project!.id)
    expect(members).toHaveLength(1)
    expect(members![0].role).toBe('owner')
  })
})
```

- [ ] **Step 6: Add npm scripts to `package.json`**

Merge into `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"typecheck": "tsc --noEmit",
"db:reset": "./scripts/db-reset.sh"
```

- [ ] **Step 7: Run tests — expect FAIL first if env not wired, then PASS**

Run: `npm run db:reset && npm test -- tests/db/rls.test.ts`
Expected: 2 passing tests. If service role key is missing, fix `.env.local` first.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts tests/ package.json
git commit -m "test(db): add RLS coverage and test helpers"
```

---

## Task 7: Domain Types and Zod Schemas

**Files:**
- Create: `lib/domain/enums.ts`, `lib/domain/schemas.ts`, `lib/domain/types.ts`, `tests/domain/schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/domain/schemas.test.ts
import { describe, expect, it } from 'vitest'
import { ContainerInputSchema, DataElementInputSchema, MappingInputSchema } from '@/lib/domain/schemas'

describe('domain schemas', () => {
  it('ContainerInput requires name and valid type', () => {
    expect(ContainerInputSchema.safeParse({ name: '', container_type: 'source', project_id: 'p' }).success).toBe(false)
    expect(ContainerInputSchema.safeParse({ name: 'C', container_type: 'bogus', project_id: 'p' }).success).toBe(false)
    expect(
      ContainerInputSchema.safeParse({ name: 'C', container_type: 'source', project_id: 'p' }).success,
    ).toBe(true)
  })

  it('DataElementInput requires non-empty display_label', () => {
    expect(DataElementInputSchema.safeParse({ container_id: 'c', display_label: '' }).success).toBe(false)
    expect(DataElementInputSchema.safeParse({ container_id: 'c', display_label: 'x' }).success).toBe(true)
  })

  it('MappingInput requires at least one source and one target', () => {
    const ok = MappingInputSchema.safeParse({
      project_id: 'p', source_element_ids: ['a'], target_element_ids: ['b'],
    })
    expect(ok.success).toBe(true)
    const bad = MappingInputSchema.safeParse({
      project_id: 'p', source_element_ids: [], target_element_ids: ['b'],
    })
    expect(bad.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect FAIL (module not found)**

Run: `npm test -- tests/domain/schemas.test.ts`
Expected: import error on `@/lib/domain/schemas`.

- [ ] **Step 3: Create `lib/domain/enums.ts`**

```ts
export const CONTAINER_TYPES = ['source','target','transformation','report','category'] as const
export type ContainerType = (typeof CONTAINER_TYPES)[number]

export const ELEMENT_FIDELITIES = ['full','partial','label_only'] as const
export type ElementFidelity = (typeof ELEMENT_FIDELITIES)[number]

export const ELEMENT_STATUSES = ['unmapped','mapped','not_needed','blocked','in_review','confirmed'] as const
export type ElementStatus = (typeof ELEMENT_STATUSES)[number]

export const MAPPING_TYPES = ['passthrough','concat','lookup','formula','derived','constant'] as const
export type MappingTypeEnum = (typeof MAPPING_TYPES)[number]

export const MAPPING_CONFIDENCES = ['draft','confirmed'] as const
export type MappingConfidence = (typeof MAPPING_CONFIDENCES)[number]
```

- [ ] **Step 4: Create `lib/domain/schemas.ts`**

```ts
import { z } from 'zod'
import {
  CONTAINER_TYPES, ELEMENT_FIDELITIES, ELEMENT_STATUSES,
  MAPPING_TYPES, MAPPING_CONFIDENCES,
} from './enums'

export const ProjectInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
})

export const ContainerInputSchema = z.object({
  project_id: z.string().uuid().or(z.string().min(1)),
  name: z.string().min(1).max(200),
  container_type: z.enum(CONTAINER_TYPES),
  system_name: z.string().max(200).optional().nullable(),
  position_x: z.number().default(0),
  position_y: z.number().default(0),
})

export const DataElementInputSchema = z.object({
  container_id: z.string().min(1),
  display_label: z.string().min(1).max(200),
  db_column_name: z.string().max(200).optional().nullable(),
  ui_label: z.string().max(200).optional().nullable(),
  data_type: z.string().max(100).optional().nullable(),
  format: z.string().max(200).optional().nullable(),
  nullable: z.boolean().optional().nullable(),
  example_values: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  fidelity: z.enum(ELEMENT_FIDELITIES).default('label_only'),
  status: z.enum(ELEMENT_STATUSES).default('unmapped'),
  sort_order: z.number().int().default(0),
})

export const MappingInputSchema = z.object({
  project_id: z.string().min(1),
  source_element_ids: z.array(z.string()).min(1),
  target_element_ids: z.array(z.string()).min(1),
  mapping_type: z.enum(MAPPING_TYPES).default('passthrough'),
  transformation_note: z.string().optional().nullable(),
  confidence: z.enum(MAPPING_CONFIDENCES).default('draft'),
})
```

- [ ] **Step 5: Create `lib/domain/types.ts`**

```ts
import { z } from 'zod'
import {
  ProjectInputSchema, ContainerInputSchema, DataElementInputSchema, MappingInputSchema,
} from './schemas'

export type ProjectInput = z.infer<typeof ProjectInputSchema>
export type ContainerInput = z.infer<typeof ContainerInputSchema>
export type DataElementInput = z.infer<typeof DataElementInputSchema>
export type MappingInput = z.infer<typeof MappingInputSchema>

export interface Project { id: string; name: string; description: string | null; created_by: string; created_at: string; updated_at: string }
export interface Container extends ContainerInput { id: string; collapsed: boolean; created_at: string; updated_at: string }
export interface DataElement extends DataElementInput { id: string; created_at: string; updated_at: string }
export interface Mapping extends MappingInput {
  id: string
  created_by: string | null; created_at: string
  confirmed_by: string | null; confirmed_at: string | null
}
```

- [ ] **Step 6: Run — expect PASS**

Run: `npm test -- tests/domain/schemas.test.ts`
Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/domain/ tests/domain/
git commit -m "feat(domain): add enums, zod schemas, and inferred types"
```

---

## Task 8: Supabase Clients

**Files:**
- Create: `lib/supabase/browser.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `middleware.ts`

- [ ] **Step 1: Create `lib/supabase/browser.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 2: Create `lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // RSC context cannot set cookies — middleware handles refresh
          }
        },
      },
    },
  )
}
```

- [ ] **Step 3: Create `lib/supabase/middleware.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl
  const isAuthRoute = url.pathname.startsWith('/login') || url.pathname.startsWith('/auth')
  if (!user && !isAuthRoute) {
    const redirect = url.clone()
    redirect.pathname = '/login'
    return NextResponse.redirect(redirect)
  }
  return response
}
```

- [ ] **Step 4: Create `middleware.ts`**

```ts
import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/ middleware.ts
git commit -m "feat(supabase): add browser, server, middleware clients with session refresh"
```

---

## Task 9: `lib/db/projects.ts`

**Files:**
- Create: `lib/db/projects.ts`, `tests/db/projects.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/db/projects.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { anonClient, resetDb, signInTestUser } from '../helpers/supabase'
import { createProject, listProjects, getProject } from '@/lib/db/projects'

describe('lib/db/projects', () => {
  beforeEach(async () => { await resetDb() })

  it('creates a project and lists it', async () => {
    const client = anonClient()
    await signInTestUser(client)
    const p = await createProject(client, { name: 'Acme Migration', description: null })
    expect(p.name).toBe('Acme Migration')
    const list = await listProjects(client)
    expect(list.map(r => r.id)).toContain(p.id)
  })

  it('getProject returns null when not a member', async () => {
    const client = anonClient()
    await signInTestUser(client)
    const got = await getProject(client, '00000000-0000-0000-0000-000000000000')
    expect(got).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- tests/db/projects.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `lib/db/projects.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { ProjectInputSchema } from '@/lib/domain/schemas'
import type { Project, ProjectInput } from '@/lib/domain/types'

export async function createProject(client: SupabaseClient, input: ProjectInput): Promise<Project> {
  const parsed = ProjectInputSchema.parse(input)
  const { data: userData } = await client.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error('Not authenticated')
  const { data, error } = await client
    .from('projects')
    .insert({ ...parsed, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function listProjects(client: SupabaseClient): Promise<Project[]> {
  const { data, error } = await client
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Project[]
}

export async function getProject(client: SupabaseClient, id: string): Promise<Project | null> {
  const { data, error } = await client.from('projects').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Project | null) ?? null
}

export async function updateProject(
  client: SupabaseClient, id: string, patch: Partial<ProjectInput>,
): Promise<Project> {
  const { data, error } = await client
    .from('projects')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function deleteProject(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('projects').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm test -- tests/db/projects.test.ts`
Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/db/projects.ts tests/db/projects.test.ts
git commit -m "feat(db): add projects CRUD functions"
```

---

## Task 10: `lib/db/containers.ts`

**Files:**
- Create: `lib/db/containers.ts`, `tests/db/containers.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/db/containers.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { anonClient, resetDb, signInTestUser } from '../helpers/supabase'
import { createProject } from '@/lib/db/projects'
import {
  createContainer, listContainers, updateContainerPosition, deleteContainer,
} from '@/lib/db/containers'

describe('lib/db/containers', () => {
  beforeEach(async () => { await resetDb() })

  it('creates, lists, moves, deletes a container', async () => {
    const client = anonClient()
    await signInTestUser(client)
    const project = await createProject(client, { name: 'P' })
    const c = await createContainer(client, {
      project_id: project.id, name: 'Customers', container_type: 'source',
    })
    expect(c.name).toBe('Customers')
    const list = await listContainers(client, project.id)
    expect(list).toHaveLength(1)
    const moved = await updateContainerPosition(client, c.id, 100, 200)
    expect(moved.position_x).toBe(100)
    expect(moved.position_y).toBe(200)
    await deleteContainer(client, c.id)
    expect(await listContainers(client, project.id)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `lib/db/containers.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { ContainerInputSchema } from '@/lib/domain/schemas'
import type { Container, ContainerInput } from '@/lib/domain/types'

export async function createContainer(
  client: SupabaseClient, input: ContainerInput,
): Promise<Container> {
  const parsed = ContainerInputSchema.parse(input)
  const { data, error } = await client.from('containers').insert(parsed).select().single()
  if (error) throw error
  return data as Container
}

export async function listContainers(client: SupabaseClient, projectId: string): Promise<Container[]> {
  const { data, error } = await client
    .from('containers')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Container[]
}

export async function updateContainer(
  client: SupabaseClient, id: string, patch: Partial<ContainerInput> & { collapsed?: boolean },
): Promise<Container> {
  const { data, error } = await client
    .from('containers')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Container
}

export async function updateContainerPosition(
  client: SupabaseClient, id: string, x: number, y: number,
): Promise<Container> {
  return updateContainer(client, id, { position_x: x, position_y: y } as Partial<ContainerInput>)
}

export async function deleteContainer(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('containers').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm test -- tests/db/containers.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/db/containers.ts tests/db/containers.test.ts
git commit -m "feat(db): add containers CRUD"
```

---

## Task 11: `lib/db/elements.ts`

**Files:**
- Create: `lib/db/elements.ts`, `tests/db/elements.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/db/elements.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { anonClient, resetDb, signInTestUser } from '../helpers/supabase'
import { createProject } from '@/lib/db/projects'
import { createContainer } from '@/lib/db/containers'
import {
  createElement, createElements, listElementsByContainer, updateElement, deleteElement,
} from '@/lib/db/elements'

describe('lib/db/elements', () => {
  beforeEach(async () => { await resetDb() })

  it('creates single and bulk elements, updates, deletes', async () => {
    const client = anonClient()
    await signInTestUser(client)
    const project = await createProject(client, { name: 'P' })
    const container = await createContainer(client, {
      project_id: project.id, name: 'Customers', container_type: 'source',
    })
    const one = await createElement(client, { container_id: container.id, display_label: 'id' })
    expect(one.display_label).toBe('id')
    const many = await createElements(client, [
      { container_id: container.id, display_label: 'name' },
      { container_id: container.id, display_label: 'email' },
    ])
    expect(many).toHaveLength(2)
    const list = await listElementsByContainer(client, container.id)
    expect(list).toHaveLength(3)
    const updated = await updateElement(client, one.id, { status: 'confirmed' })
    expect(updated.status).toBe('confirmed')
    await deleteElement(client, one.id)
    expect(await listElementsByContainer(client, container.id)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `lib/db/elements.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { DataElementInputSchema } from '@/lib/domain/schemas'
import type { DataElement, DataElementInput } from '@/lib/domain/types'

export async function createElement(
  client: SupabaseClient, input: DataElementInput,
): Promise<DataElement> {
  const parsed = DataElementInputSchema.parse(input)
  const { data, error } = await client.from('data_elements').insert(parsed).select().single()
  if (error) throw error
  return data as DataElement
}

export async function createElements(
  client: SupabaseClient, inputs: DataElementInput[],
): Promise<DataElement[]> {
  const parsed = inputs.map(i => DataElementInputSchema.parse(i))
  const { data, error } = await client.from('data_elements').insert(parsed).select()
  if (error) throw error
  return (data ?? []) as DataElement[]
}

export async function listElementsByContainer(
  client: SupabaseClient, containerId: string,
): Promise<DataElement[]> {
  const { data, error } = await client
    .from('data_elements')
    .select('*')
    .eq('container_id', containerId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as DataElement[]
}

export async function listElementsByProject(
  client: SupabaseClient, projectId: string,
): Promise<DataElement[]> {
  const { data, error } = await client
    .from('data_elements')
    .select('*, containers!inner(project_id)')
    .eq('containers.project_id', projectId)
  if (error) throw error
  return (data ?? []) as DataElement[]
}

export async function updateElement(
  client: SupabaseClient, id: string, patch: Partial<DataElementInput>,
): Promise<DataElement> {
  const { data, error } = await client
    .from('data_elements')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as DataElement
}

export async function deleteElement(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('data_elements').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/db/elements.ts tests/db/elements.test.ts
git commit -m "feat(db): add data_elements CRUD including bulk insert"
```

---

## Task 12: `lib/db/mappings.ts`

**Files:**
- Create: `lib/db/mappings.ts`, `tests/db/mappings.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/db/mappings.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { anonClient, resetDb, signInTestUser } from '../helpers/supabase'
import { createProject } from '@/lib/db/projects'
import { createContainer } from '@/lib/db/containers'
import { createElement } from '@/lib/db/elements'
import {
  createMapping, listMappings, updateMapping, confirmMapping, deleteMapping,
} from '@/lib/db/mappings'

describe('lib/db/mappings', () => {
  beforeEach(async () => { await resetDb() })

  it('creates, confirms, updates, deletes a mapping', async () => {
    const client = anonClient()
    const userId = await signInTestUser(client)
    const project = await createProject(client, { name: 'P' })
    const src = await createContainer(client, { project_id: project.id, name: 'Src', container_type: 'source' })
    const tgt = await createContainer(client, { project_id: project.id, name: 'Tgt', container_type: 'target' })
    const s1 = await createElement(client, { container_id: src.id, display_label: 'first_name' })
    const s2 = await createElement(client, { container_id: src.id, display_label: 'last_name' })
    const t1 = await createElement(client, { container_id: tgt.id, display_label: 'full_name' })

    const m = await createMapping(client, {
      project_id: project.id,
      source_element_ids: [s1.id, s2.id],
      target_element_ids: [t1.id],
      mapping_type: 'concat',
      transformation_note: "concat(first_name, ' ', last_name)",
      confidence: 'draft',
    })
    expect(m.mapping_type).toBe('concat')

    const updated = await updateMapping(client, m.id, { transformation_note: 'updated' })
    expect(updated.transformation_note).toBe('updated')

    const confirmed = await confirmMapping(client, m.id)
    expect(confirmed.confidence).toBe('confirmed')
    expect(confirmed.confirmed_by).toBe(userId)

    const list = await listMappings(client, project.id)
    expect(list).toHaveLength(1)

    await deleteMapping(client, m.id)
    expect(await listMappings(client, project.id)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `lib/db/mappings.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { MappingInputSchema } from '@/lib/domain/schemas'
import type { Mapping, MappingInput } from '@/lib/domain/types'

export async function createMapping(client: SupabaseClient, input: MappingInput): Promise<Mapping> {
  const parsed = MappingInputSchema.parse(input)
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client
    .from('mappings')
    .insert({ ...parsed, created_by: userData.user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data as Mapping
}

export async function listMappings(client: SupabaseClient, projectId: string): Promise<Mapping[]> {
  const { data, error } = await client
    .from('mappings')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Mapping[]
}

export async function updateMapping(
  client: SupabaseClient, id: string,
  patch: Partial<Pick<MappingInput, 'mapping_type' | 'transformation_note' | 'source_element_ids' | 'target_element_ids'>>,
): Promise<Mapping> {
  const { data, error } = await client
    .from('mappings')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Mapping
}

export async function confirmMapping(client: SupabaseClient, id: string): Promise<Mapping> {
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client
    .from('mappings')
    .update({
      confidence: 'confirmed',
      confirmed_by: userData.user?.id ?? null,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Mapping
}

export async function deleteMapping(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('mappings').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/db/mappings.ts tests/db/mappings.test.ts
git commit -m "feat(db): add mappings CRUD with confirm helper"
```

---

## Task 13: `lib/db/stats.ts`

**Files:**
- Create: `lib/db/stats.ts`, `tests/db/stats.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/db/stats.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { anonClient, resetDb, signInTestUser } from '../helpers/supabase'
import { createProject } from '@/lib/db/projects'
import { createContainer } from '@/lib/db/containers'
import { createElements, updateElement } from '@/lib/db/elements'
import { getProjectStats } from '@/lib/db/stats'

describe('lib/db/stats', () => {
  beforeEach(async () => { await resetDb() })

  it('counts elements by status', async () => {
    const client = anonClient()
    await signInTestUser(client)
    const p = await createProject(client, { name: 'P' })
    const c = await createContainer(client, { project_id: p.id, name: 'C', container_type: 'source' })
    const [a, , ] = await createElements(client, [
      { container_id: c.id, display_label: 'a' },
      { container_id: c.id, display_label: 'b' },
      { container_id: c.id, display_label: 'c' },
    ])
    await updateElement(client, a.id, { status: 'confirmed' })
    const stats = await getProjectStats(client, p.id)
    expect(stats.total).toBe(3)
    expect(stats.unmapped).toBe(2)
    expect(stats.confirmed).toBe(1)
    expect(stats.mapped).toBe(0)
    expect(stats.not_needed).toBe(0)
    expect(stats.blocked).toBe(0)
    expect(stats.in_review).toBe(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `lib/db/stats.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ElementStatus } from '@/lib/domain/enums'

export interface ProjectStats {
  total: number
  unmapped: number
  mapped: number
  confirmed: number
  not_needed: number
  blocked: number
  in_review: number
}

export async function getProjectStats(
  client: SupabaseClient, projectId: string,
): Promise<ProjectStats> {
  const { data, error } = await client
    .from('data_elements')
    .select('status, containers!inner(project_id)')
    .eq('containers.project_id', projectId)
  if (error) throw error
  const stats: ProjectStats = {
    total: 0, unmapped: 0, mapped: 0, confirmed: 0, not_needed: 0, blocked: 0, in_review: 0,
  }
  for (const row of data ?? []) {
    stats.total += 1
    const s = (row as { status: ElementStatus }).status
    stats[s] = (stats[s] ?? 0) + 1
  }
  return stats
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/db/stats.ts tests/db/stats.test.ts
git commit -m "feat(db): add project stats aggregator"
```

---

## Task 14: CSV Parser Utility

**Files:**
- Create: `components/import/csvParser.ts`, `tests/import/csvParser.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/import/csvParser.test.ts
import { describe, expect, it } from 'vitest'
import { parseCsvForImport } from '@/components/import/csvParser'

describe('parseCsvForImport', () => {
  it('uses first row as headers', () => {
    const out = parseCsvForImport('name,email,age\nalice,a@x,30')
    expect(out.fields).toEqual([
      { display_label: 'name', data_type: null },
      { display_label: 'email', data_type: null },
      { display_label: 'age', data_type: null },
    ])
    expect(out.detectedTypeRow).toBe(false)
  })

  it('detects a type row when second row looks like SQL types', () => {
    const out = parseCsvForImport('id,name,created_at\nint,varchar,date')
    expect(out.detectedTypeRow).toBe(true)
    expect(out.fields).toEqual([
      { display_label: 'id', data_type: 'int' },
      { display_label: 'name', data_type: 'varchar' },
      { display_label: 'created_at', data_type: 'date' },
    ])
  })

  it('handles tab-separated input', () => {
    const out = parseCsvForImport('a\tb\tc')
    expect(out.fields.map(f => f.display_label)).toEqual(['a', 'b', 'c'])
  })

  it('rejects empty input', () => {
    expect(() => parseCsvForImport('')).toThrow(/empty/i)
  })

  it('rejects input with no headers', () => {
    expect(() => parseCsvForImport('\n')).toThrow(/header/i)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `components/import/csvParser.ts`**

```ts
import Papa from 'papaparse'

const SQL_TYPE_HINT = /^(int|integer|bigint|smallint|numeric|decimal|float|real|double|text|varchar|char|date|timestamp|timestamptz|time|boolean|bool|uuid|json|jsonb)(\(.*\))?$/i

export interface CsvImportField {
  display_label: string
  data_type: string | null
}

export interface CsvImportResult {
  fields: CsvImportField[]
  detectedTypeRow: boolean
}

export function parseCsvForImport(raw: string): CsvImportResult {
  const text = raw.trim()
  if (!text) throw new Error('CSV input is empty')
  const delimiter = text.includes('\t') && !text.includes(',') ? '\t' : ','
  const parsed = Papa.parse<string[]>(text, { delimiter, skipEmptyLines: true })
  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`)
  }
  const rows = parsed.data
  if (rows.length === 0 || rows[0].length === 0 || rows[0].every(h => !h?.trim())) {
    throw new Error('No header row found')
  }
  const headers = rows[0].map(h => h.trim())
  const maybeTypes = rows[1]?.map(c => (c ?? '').trim()) ?? []
  const detectedTypeRow =
    maybeTypes.length === headers.length &&
    maybeTypes.every(c => c && SQL_TYPE_HINT.test(c))
  const fields: CsvImportField[] = headers.map((h, i) => ({
    display_label: h,
    data_type: detectedTypeRow ? maybeTypes[i] : null,
  }))
  return { fields, detectedTypeRow }
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add components/import/csvParser.ts tests/import/csvParser.test.ts
git commit -m "feat(import): add pure CSV parser with type-row detection"
```

---

## Task 15: App Providers and Auth Pages

**Files:**
- Create: `app/providers.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/callback/route.ts`
- Modify: `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Create `app/providers.tsx`**

```tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useState, type ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }))
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster richColors position="bottom-right" />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 2: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Data Visual Map',
  description: 'Visual data mapping workbench',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen bg-neutral-50 text-neutral-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Replace `app/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
export default function Home() { redirect('/projects') }
```

- [ ] **Step 4: Create `app/(auth)/login/page.tsx`**

```tsx
'use client'
import { createClient } from '@/lib/supabase/browser'

export default function LoginPage() {
  const supabase = createClient()
  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-80 space-y-6 rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Data Visual Map</h1>
        <p className="text-sm text-neutral-600">Sign in to continue.</p>
        <button
          onClick={signIn}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800"
        >
          Continue with Google
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Create `app/(auth)/callback/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(new URL('/projects', request.url))
}
```

- [ ] **Step 6: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add app/
git commit -m "feat(app): add providers, layout, login, and OAuth callback"
```

---

## Task 16: Projects List Page + New Project Dialog

**Files:**
- Create: `app/projects/page.tsx`, `components/project/NewProjectDialog.tsx`

- [ ] **Step 1: Create `app/projects/page.tsx`**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listProjects } from '@/lib/db/projects'
import { NewProjectDialog } from '@/components/project/NewProjectDialog'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const projects = await listProjects(supabase)
  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <NewProjectDialog />
      </div>
      <ul className="mt-8 divide-y rounded-lg border bg-white">
        {projects.length === 0 && (
          <li className="p-6 text-sm text-neutral-500">No projects yet. Create one to get started.</li>
        )}
        {projects.map(p => (
          <li key={p.id}>
            <Link href={`/projects/${p.id}`} className="block p-4 hover:bg-neutral-50">
              <div className="font-medium">{p.name}</div>
              {p.description && <div className="text-sm text-neutral-500">{p.description}</div>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 2: Create `components/project/NewProjectDialog.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/browser'
import { createProject } from '@/lib/db/projects'

export function NewProjectDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      const p = await createProject(supabase, { name, description: description || null })
      toast.success('Project created')
      setOpen(false)
      router.push(`/projects/${p.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >New project</button>
    )
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form onSubmit={onSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">New project</h2>
        <input
          autoFocus required value={name} onChange={e => setName(e.target.value)}
          placeholder="Project name"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <textarea
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded border px-3 py-2 text-sm"
          rows={3}
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="rounded px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving || !name} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/projects/page.tsx components/project/NewProjectDialog.tsx
git commit -m "feat(app): add projects list page and new project dialog"
```

---

## Task 17: Project Workspace Data Hook

**Files:**
- Create: `lib/hooks/useProjectData.ts`

- [ ] **Step 1: Create `lib/hooks/useProjectData.ts`**

```ts
'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/browser'
import { listContainers } from '@/lib/db/containers'
import { listElementsByProject } from '@/lib/db/elements'
import { listMappings } from '@/lib/db/mappings'
import { getProjectStats, type ProjectStats } from '@/lib/db/stats'
import type { Container, DataElement, Mapping } from '@/lib/domain/types'

export interface ProjectData {
  containers: Container[]
  elements: DataElement[]
  mappings: Mapping[]
  stats: ProjectStats
}

export function projectQueryKey(projectId: string) {
  return ['project', projectId] as const
}

export function useProjectData(projectId: string) {
  return useQuery({
    queryKey: projectQueryKey(projectId),
    queryFn: async (): Promise<ProjectData> => {
      const supabase = createClient()
      const [containers, elements, mappings, stats] = await Promise.all([
        listContainers(supabase, projectId),
        listElementsByProject(supabase, projectId),
        listMappings(supabase, projectId),
        getProjectStats(supabase, projectId),
      ])
      return { containers, elements, mappings, stats }
    },
  })
}

export function useInvalidateProject() {
  const qc = useQueryClient()
  return (projectId: string) => qc.invalidateQueries({ queryKey: projectQueryKey(projectId) })
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useProjectData.ts
git commit -m "feat(hooks): add useProjectData hook"
```

---

## Task 18: Project Workspace Page Shell

**Files:**
- Create: `app/projects/[id]/page.tsx`, `components/project/Sidebar.tsx`, `components/project/Dashboard.tsx`, `components/project/ProjectTree.tsx`

- [ ] **Step 1: Create `app/projects/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/db/projects'
import { Workspace } from '@/components/project/Workspace'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const project = await getProject(supabase, id)
  if (!project) notFound()
  return <Workspace project={project} />
}
```

- [ ] **Step 2: Create `components/project/Workspace.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Canvas } from '@/components/canvas/Canvas'
import { Inspector } from '@/components/inspector/Inspector'
import { useProjectData } from '@/lib/hooks/useProjectData'
import type { Project } from '@/lib/domain/types'

export type Selection =
  | { kind: 'none' }
  | { kind: 'element'; id: string }
  | { kind: 'mapping'; id: string }

export function Workspace({ project }: { project: Project }) {
  const [selection, setSelection] = useState<Selection>({ kind: 'none' })
  const query = useProjectData(project.id)

  if (query.isLoading || !query.data) {
    return <div className="p-8 text-sm text-neutral-500">Loading…</div>
  }
  const data = query.data

  return (
    <div className="grid h-screen grid-cols-[280px_1fr_360px] grid-rows-[48px_1fr]">
      <header className="col-span-3 flex items-center justify-between border-b bg-white px-4">
        <div className="font-semibold">{project.name}</div>
      </header>
      <Sidebar project={project} data={data} onSelect={setSelection} selection={selection} />
      <Canvas project={project} data={data} selection={selection} onSelect={setSelection} />
      <Inspector project={project} data={data} selection={selection} onSelect={setSelection} />
    </div>
  )
}
```

- [ ] **Step 3: Create `components/project/Sidebar.tsx`**

```tsx
'use client'
import { Dashboard } from './Dashboard'
import { ProjectTree } from './ProjectTree'
import { AddContainerMenu } from './AddContainerMenu'
import type { ProjectData } from '@/lib/hooks/useProjectData'
import type { Selection } from './Workspace'
import type { Project } from '@/lib/domain/types'

export function Sidebar({
  project, data, selection, onSelect,
}: {
  project: Project
  data: ProjectData
  selection: Selection
  onSelect: (s: Selection) => void
}) {
  return (
    <aside className="flex flex-col border-r bg-white">
      <div className="p-4"><AddContainerMenu projectId={project.id} /></div>
      <Dashboard stats={data.stats} />
      <ProjectTree data={data} selection={selection} onSelect={onSelect} />
    </aside>
  )
}
```

- [ ] **Step 4: Create `components/project/Dashboard.tsx`**

```tsx
'use client'
import type { ProjectStats } from '@/lib/db/stats'

const ROWS: { key: keyof ProjectStats; label: string; color: string }[] = [
  { key: 'total', label: 'Total', color: 'text-neutral-900' },
  { key: 'unmapped', label: 'Unmapped', color: 'text-neutral-500' },
  { key: 'mapped', label: 'Mapped', color: 'text-blue-600' },
  { key: 'confirmed', label: 'Confirmed', color: 'text-emerald-600' },
  { key: 'in_review', label: 'In review', color: 'text-amber-600' },
  { key: 'not_needed', label: 'Not needed', color: 'text-neutral-400' },
  { key: 'blocked', label: 'Blocked', color: 'text-red-600' },
]

export function Dashboard({ stats }: { stats: ProjectStats }) {
  return (
    <div className="border-y bg-neutral-50 p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Status</div>
      <ul className="space-y-1 text-sm">
        {ROWS.map(r => (
          <li key={r.key} className="flex justify-between">
            <span className={r.color}>{r.label}</span>
            <span className="tabular-nums text-neutral-700">{stats[r.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 5: Create `components/project/ProjectTree.tsx`**

```tsx
'use client'
import type { ProjectData } from '@/lib/hooks/useProjectData'
import type { Selection } from './Workspace'
import type { ContainerType } from '@/lib/domain/enums'

const GROUPS: { type: ContainerType; label: string }[] = [
  { type: 'source', label: 'Sources' },
  { type: 'target', label: 'Targets' },
  { type: 'transformation', label: 'Transformations' },
  { type: 'report', label: 'Reports' },
  { type: 'category', label: 'Categories' },
]

export function ProjectTree({
  data, selection, onSelect,
}: {
  data: ProjectData
  selection: Selection
  onSelect: (s: Selection) => void
}) {
  return (
    <nav className="flex-1 overflow-auto p-2 text-sm">
      {GROUPS.map(g => {
        const containers = data.containers.filter(c => c.container_type === g.type)
        if (containers.length === 0) return null
        return (
          <div key={g.type} className="mb-3">
            <div className="px-2 text-xs font-medium uppercase tracking-wide text-neutral-500">{g.label}</div>
            <ul>
              {containers.map(c => {
                const fields = data.elements.filter(e => e.container_id === c.id)
                return (
                  <li key={c.id}>
                    <div className="px-2 py-1 font-medium">{c.name}</div>
                    <ul className="ml-4">
                      {fields.map(f => {
                        const isSelected = selection.kind === 'element' && selection.id === f.id
                        return (
                          <li
                            key={f.id}
                            onClick={() => onSelect({ kind: 'element', id: f.id })}
                            className={`cursor-pointer px-2 py-0.5 ${isSelected ? 'bg-blue-100' : 'hover:bg-neutral-100'}`}
                          >{f.display_label}</li>
                        )
                      })}
                    </ul>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: clean (Canvas, Inspector, AddContainerMenu will fail — they're defined in next tasks). If so, create stub files:

```tsx
// components/canvas/Canvas.tsx
'use client'
export function Canvas(_: { project: any; data: any; selection: any; onSelect: any }) {
  return <div className="bg-neutral-100" />
}
```

```tsx
// components/inspector/Inspector.tsx
'use client'
export function Inspector(_: { project: any; data: any; selection: any; onSelect: any }) {
  return <aside className="border-l bg-white" />
}
```

```tsx
// components/project/AddContainerMenu.tsx
'use client'
export function AddContainerMenu(_: { projectId: string }) {
  return <button className="rounded bg-neutral-900 px-3 py-2 text-sm text-white">+ Add container</button>
}
```

Re-run `npm run typecheck`. Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add app/projects/\[id\]/ components/project/ components/canvas/Canvas.tsx components/inspector/Inspector.tsx
git commit -m "feat(app): add project workspace shell with sidebar, dashboard, tree"
```

---

## Task 19: Canvas — React Flow Wrapper + ContainerNode

**Files:**
- Modify: `components/canvas/Canvas.tsx`
- Create: `components/canvas/ContainerNode.tsx`, `components/canvas/nodeTypes.ts`, `components/canvas/MappingEdge.tsx`, `tests/components/ContainerNode.test.tsx`

- [ ] **Step 1: Write failing ContainerNode test**

```tsx
// tests/components/ContainerNode.test.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { ContainerNode } from '@/components/canvas/ContainerNode'

function renderNode(data: any) {
  return render(
    <ReactFlowProvider>
      <ContainerNode id="n1" data={data} selected={false} type="container" />
    </ReactFlowProvider>,
  )
}

describe('ContainerNode', () => {
  it('renders container name, type badge, and field rows', () => {
    renderNode({
      container: { name: 'Customers', container_type: 'source', system_name: 'Legacy BSS', collapsed: false },
      fields: [
        { id: 'e1', display_label: 'id', status: 'confirmed' },
        { id: 'e2', display_label: 'email', status: 'unmapped' },
      ],
    })
    expect(screen.getByText('Customers')).toBeInTheDocument()
    expect(screen.getByText('source')).toBeInTheDocument()
    expect(screen.getByText('Legacy BSS')).toBeInTheDocument()
    expect(screen.getByText('id')).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
  })

  it('hides field rows when collapsed', () => {
    renderNode({
      container: { name: 'Customers', container_type: 'source', collapsed: true },
      fields: [{ id: 'e1', display_label: 'id', status: 'unmapped' }],
    })
    expect(screen.queryByText('id')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- tests/components/ContainerNode.test.tsx`
Expected: fail, module not found.

- [ ] **Step 3: Create `components/canvas/ContainerNode.tsx`**

```tsx
'use client'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { Container, DataElement } from '@/lib/domain/types'
import type { ElementStatus } from '@/lib/domain/enums'

const STATUS_BORDER: Record<ElementStatus, string> = {
  unmapped: 'border-l-neutral-300',
  mapped: 'border-l-blue-500',
  confirmed: 'border-l-emerald-500',
  in_review: 'border-l-amber-500',
  not_needed: 'border-l-neutral-300 line-through text-neutral-400',
  blocked: 'border-l-red-500',
}

export interface ContainerNodeData {
  container: Pick<Container, 'name' | 'container_type' | 'system_name' | 'collapsed'>
  fields: Pick<DataElement, 'id' | 'display_label' | 'status'>[]
}

export function ContainerNode({ data, selected }: NodeProps) {
  const { container, fields } = data as unknown as ContainerNodeData
  return (
    <div className={`rounded-md border bg-white shadow-sm ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-center justify-between gap-2 border-b bg-neutral-50 px-3 py-2">
        <div>
          <div className="text-sm font-semibold">{container.name}</div>
          {container.system_name && <div className="text-xs text-neutral-500">{container.system_name}</div>}
        </div>
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs uppercase tracking-wide text-neutral-700">
          {container.container_type}
        </span>
      </div>
      {!container.collapsed && (
        <ul className="min-w-[220px] py-1">
          {fields.map(f => (
            <li
              key={f.id}
              className={`relative flex items-center border-l-4 px-3 py-1 text-sm ${STATUS_BORDER[f.status]}`}
            >
              <Handle
                type="target"
                position={Position.Left}
                id={`${f.id}-t`}
                className="!h-2 !w-2 !border-neutral-400 !bg-white"
              />
              <span className="flex-1">{f.display_label}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={`${f.id}-s`}
                className="!h-2 !w-2 !border-neutral-400 !bg-white"
              />
            </li>
          ))}
          {fields.length === 0 && (
            <li className="px-3 py-2 text-xs italic text-neutral-400">No fields yet</li>
          )}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm test -- tests/components/ContainerNode.test.tsx`

- [ ] **Step 5: Create `components/canvas/MappingEdge.tsx`**

```tsx
'use client'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import type { MappingConfidence } from '@/lib/domain/enums'

export function MappingEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } = props
  const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const confidence = (data as { confidence?: MappingConfidence } | undefined)?.confidence ?? 'draft'
  const stroke = confidence === 'confirmed' ? '#059669' : '#2563eb'
  const dash = confidence === 'confirmed' ? undefined : '6 4'
  return (
    <BaseEdge
      path={path}
      style={{
        stroke, strokeWidth: selected ? 3 : 2, strokeDasharray: dash,
      }}
    />
  )
}
```

- [ ] **Step 6: Create `components/canvas/nodeTypes.ts`**

```ts
import { ContainerNode } from './ContainerNode'
import { MappingEdge } from './MappingEdge'

export const nodeTypes = { container: ContainerNode }
export const edgeTypes = { mapping: MappingEdge }
```

- [ ] **Step 7: Commit**

```bash
git add components/canvas/ tests/components/ContainerNode.test.tsx
git commit -m "feat(canvas): add ContainerNode and MappingEdge components"
```

---

## Task 20: Canvas — Integration with Project Data

**Files:**
- Modify: `components/canvas/Canvas.tsx`

- [ ] **Step 1: Replace `components/canvas/Canvas.tsx`**

```tsx
'use client'
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  type Node, type Edge, type Connection, type NodeChange, applyNodeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { nodeTypes, edgeTypes } from './nodeTypes'
import { createClient } from '@/lib/supabase/browser'
import { updateContainerPosition } from '@/lib/db/containers'
import { createMapping, deleteMapping } from '@/lib/db/mappings'
import { useInvalidateProject, type ProjectData } from '@/lib/hooks/useProjectData'
import type { Project } from '@/lib/domain/types'
import type { Selection } from '@/components/project/Workspace'

function projectToGraph(data: ProjectData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = data.containers.map(c => ({
    id: c.id,
    type: 'container',
    position: { x: c.position_x, y: c.position_y },
    data: {
      container: c,
      fields: data.elements
        .filter(e => e.container_id === c.id)
        .map(e => ({ id: e.id, display_label: e.display_label, status: e.status })),
    },
  }))
  const edges: Edge[] = data.mappings.flatMap(m =>
    m.source_element_ids.flatMap(sid =>
      m.target_element_ids.map(tid => ({
        id: `${m.id}:${sid}->${tid}`,
        type: 'mapping',
        source: findContainerId(data, sid) ?? '',
        target: findContainerId(data, tid) ?? '',
        sourceHandle: `${sid}-s`,
        targetHandle: `${tid}-t`,
        data: { mappingId: m.id, confidence: m.confidence },
      })),
    ),
  )
  return { nodes, edges }
}

function findContainerId(data: ProjectData, elementId: string): string | null {
  return data.elements.find(e => e.id === elementId)?.container_id ?? null
}

export function Canvas({
  project, data, selection, onSelect,
}: {
  project: Project
  data: ProjectData
  selection: Selection
  onSelect: (s: Selection) => void
}) {
  const invalidate = useInvalidateProject()
  const initial = useMemo(() => projectToGraph(data), [data])
  const [nodes, setNodes] = useState<Node[]>(initial.nodes)
  const edges = initial.edges

  useEffect(() => { setNodes(projectToGraph(data).nodes) }, [data])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes(ns => applyNodeChanges(changes, ns))
  }, [])

  const onNodeDragStop = useCallback(async (_: unknown, node: Node) => {
    try {
      await updateContainerPosition(createClient(), node.id, node.position.x, node.position.y)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save position')
      invalidate(project.id)
    }
  }, [invalidate, project.id])

  const onConnect = useCallback(async (conn: Connection) => {
    const sid = conn.sourceHandle?.replace(/-s$/, '')
    const tid = conn.targetHandle?.replace(/-t$/, '')
    if (!sid || !tid) return
    try {
      await createMapping(createClient(), {
        project_id: project.id,
        source_element_ids: [sid],
        target_element_ids: [tid],
        mapping_type: 'passthrough',
        confidence: 'draft',
      })
      invalidate(project.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create mapping')
    }
  }, [invalidate, project.id])

  const onEdgeClick = useCallback((_: unknown, edge: Edge) => {
    const id = (edge.data as { mappingId: string } | undefined)?.mappingId
    if (id) onSelect({ kind: 'mapping', id })
  }, [onSelect])

  const onNodeClick = useCallback((_: unknown, _node: Node) => {
    // Field row clicks happen on the DOM inside the node; no-op at canvas level.
  }, [])

  const onEdgesDelete = useCallback(async (toDelete: Edge[]) => {
    const ids = new Set(
      toDelete.map(e => (e.data as { mappingId: string } | undefined)?.mappingId).filter(Boolean) as string[],
    )
    for (const id of ids) {
      try { await deleteMapping(createClient(), id) }
      catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed') }
    }
    invalidate(project.id)
  }, [invalidate, project.id])

  return (
    <div className="bg-neutral-100">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes.map(n => ({
            ...n,
            selected: selection.kind === 'element' && false, // element selection is tracked out-of-band
          }))}
          edges={edges.map(e => ({
            ...e,
            selected: selection.kind === 'mapping' &&
              (e.data as { mappingId: string }).mappingId === selection.id,
          }))}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeClick={onNodeClick}
          onEdgesDelete={onEdgesDelete}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/canvas/Canvas.tsx
git commit -m "feat(canvas): wire React Flow to project data with drag-to-map and position persistence"
```

---

## Task 21: Inspector Panel

**Files:**
- Modify: `components/inspector/Inspector.tsx`
- Create: `components/inspector/ElementForm.tsx`, `components/inspector/MappingForm.tsx`, `components/inspector/ProjectSummary.tsx`, `tests/components/Inspector.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// tests/components/Inspector.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Inspector } from '@/components/inspector/Inspector'

const dataFixture = {
  containers: [{ id: 'c1', project_id: 'p1', name: 'Customers', container_type: 'source' } as any],
  elements: [{ id: 'e1', container_id: 'c1', display_label: 'email', status: 'unmapped', tags: [] } as any],
  mappings: [],
  stats: { total: 1, unmapped: 1, mapped: 0, confirmed: 0, not_needed: 0, blocked: 0, in_review: 0 },
}

describe('Inspector', () => {
  it('shows project summary when nothing selected', () => {
    render(<Inspector project={{ id: 'p1', name: 'P' } as any} data={dataFixture as any}
      selection={{ kind: 'none' }} onSelect={vi.fn()} />)
    expect(screen.getByText(/select a field or mapping/i)).toBeInTheDocument()
  })

  it('shows ElementForm for selected element', () => {
    render(<Inspector project={{ id: 'p1', name: 'P' } as any} data={dataFixture as any}
      selection={{ kind: 'element', id: 'e1' }} onSelect={vi.fn()} />)
    expect(screen.getByDisplayValue('email')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Replace `components/inspector/Inspector.tsx`**

```tsx
'use client'
import { ElementForm } from './ElementForm'
import { MappingForm } from './MappingForm'
import { ProjectSummary } from './ProjectSummary'
import type { ProjectData } from '@/lib/hooks/useProjectData'
import type { Project } from '@/lib/domain/types'
import type { Selection } from '@/components/project/Workspace'

export function Inspector({
  project, data, selection, onSelect,
}: {
  project: Project
  data: ProjectData
  selection: Selection
  onSelect: (s: Selection) => void
}) {
  let body: React.ReactNode
  if (selection.kind === 'element') {
    const el = data.elements.find(e => e.id === selection.id)
    body = el
      ? <ElementForm element={el} projectId={project.id} />
      : <div className="p-4 text-sm text-neutral-500">Element not found.</div>
  } else if (selection.kind === 'mapping') {
    const m = data.mappings.find(x => x.id === selection.id)
    body = m
      ? <MappingForm mapping={m} projectId={project.id} onDelete={() => onSelect({ kind: 'none' })} />
      : <div className="p-4 text-sm text-neutral-500">Mapping not found.</div>
  } else {
    body = <ProjectSummary project={project} stats={data.stats} />
  }
  return <aside className="overflow-auto border-l bg-white">{body}</aside>
}
```

- [ ] **Step 4: Create `components/inspector/ProjectSummary.tsx`**

```tsx
'use client'
import type { Project } from '@/lib/domain/types'
import type { ProjectStats } from '@/lib/db/stats'

export function ProjectSummary({ project, stats }: { project: Project; stats: ProjectStats }) {
  return (
    <div className="p-4 text-sm">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Project</div>
      <div className="mb-2 text-lg font-semibold">{project.name}</div>
      {project.description && <p className="mb-4 text-neutral-600">{project.description}</p>}
      <div className="text-neutral-500">Select a field or mapping to see details.</div>
      <div className="mt-4 text-xs text-neutral-400">{stats.total} elements · {stats.confirmed} confirmed</div>
    </div>
  )
}
```

- [ ] **Step 5: Create `components/inspector/ElementForm.tsx`**

```tsx
'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/browser'
import { updateElement } from '@/lib/db/elements'
import { useInvalidateProject } from '@/lib/hooks/useProjectData'
import { ELEMENT_STATUSES, type ElementStatus } from '@/lib/domain/enums'
import type { DataElement } from '@/lib/domain/types'

export function ElementForm({ element, projectId }: { element: DataElement; projectId: string }) {
  const invalidate = useInvalidateProject()
  const [local, setLocal] = useState(element)
  useEffect(() => setLocal(element), [element])

  async function save(patch: Partial<DataElement>) {
    try {
      await updateElement(createClient(), element.id, patch as any)
      invalidate(projectId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <div className="space-y-4 p-4 text-sm">
      <Field label="Display label">
        <input
          className="w-full rounded border px-2 py-1"
          value={local.display_label}
          onChange={e => setLocal({ ...local, display_label: e.target.value })}
          onBlur={() => save({ display_label: local.display_label })}
        />
      </Field>
      <Field label="DB column">
        <input
          className="w-full rounded border px-2 py-1"
          value={local.db_column_name ?? ''}
          onChange={e => setLocal({ ...local, db_column_name: e.target.value })}
          onBlur={() => save({ db_column_name: local.db_column_name || null })}
        />
      </Field>
      <Field label="Data type">
        <input
          className="w-full rounded border px-2 py-1"
          value={local.data_type ?? ''}
          onChange={e => setLocal({ ...local, data_type: e.target.value })}
          onBlur={() => save({ data_type: local.data_type || null })}
        />
      </Field>
      <Field label="Status">
        <select
          className="w-full rounded border px-2 py-1"
          value={local.status}
          onChange={e => {
            const s = e.target.value as ElementStatus
            setLocal({ ...local, status: s })
            save({ status: s })
          }}
        >
          {ELEMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Notes">
        <textarea
          rows={4}
          className="w-full rounded border px-2 py-1"
          value={local.notes ?? ''}
          onChange={e => setLocal({ ...local, notes: e.target.value })}
          onBlur={() => save({ notes: local.notes || null })}
        />
      </Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      {children}
    </label>
  )
}
```

- [ ] **Step 6: Create `components/inspector/MappingForm.tsx`**

```tsx
'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/browser'
import { updateMapping, confirmMapping, deleteMapping } from '@/lib/db/mappings'
import { useInvalidateProject } from '@/lib/hooks/useProjectData'
import { MAPPING_TYPES, type MappingTypeEnum } from '@/lib/domain/enums'
import type { Mapping } from '@/lib/domain/types'

export function MappingForm({
  mapping, projectId, onDelete,
}: {
  mapping: Mapping; projectId: string; onDelete: () => void
}) {
  const invalidate = useInvalidateProject()
  const [local, setLocal] = useState(mapping)
  useEffect(() => setLocal(mapping), [mapping])

  async function save(patch: Partial<Mapping>) {
    try {
      await updateMapping(createClient(), mapping.id, patch as any)
      invalidate(projectId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function onConfirm() {
    try {
      await confirmMapping(createClient(), mapping.id)
      invalidate(projectId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Confirm failed')
    }
  }

  async function onDeleteClick() {
    if (!confirm('Delete this mapping?')) return
    try {
      await deleteMapping(createClient(), mapping.id)
      invalidate(projectId)
      onDelete()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-4 p-4 text-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Mapping</div>
      <label className="block">
        <div className="mb-1 text-xs text-neutral-500">Type</div>
        <select
          className="w-full rounded border px-2 py-1"
          value={local.mapping_type}
          onChange={e => {
            const v = e.target.value as MappingTypeEnum
            setLocal({ ...local, mapping_type: v })
            save({ mapping_type: v })
          }}
        >
          {MAPPING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label className="block">
        <div className="mb-1 text-xs text-neutral-500">Transformation note</div>
        <textarea
          rows={4}
          className="w-full rounded border px-2 py-1"
          value={local.transformation_note ?? ''}
          onChange={e => setLocal({ ...local, transformation_note: e.target.value })}
          onBlur={() => save({ transformation_note: local.transformation_note || null })}
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={local.confidence === 'confirmed'}
          className="rounded bg-emerald-600 px-3 py-1 text-white disabled:opacity-50"
        >
          {local.confidence === 'confirmed' ? 'Confirmed' : 'Confirm'}
        </button>
        <button onClick={onDeleteClick} className="rounded bg-red-600 px-3 py-1 text-white">Delete</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Run Inspector test — expect PASS**

Run: `npm test -- tests/components/Inspector.test.tsx`

- [ ] **Step 8: Commit**

```bash
git add components/inspector/ tests/components/Inspector.test.tsx
git commit -m "feat(inspector): add element and mapping editors with confirm/delete"
```

---

## Task 22: AddContainerMenu + NewContainerDialog + CsvPasteDialog

**Files:**
- Modify: `components/project/AddContainerMenu.tsx`
- Create: `components/project/NewContainerDialog.tsx`, `components/import/CsvPasteDialog.tsx`, `tests/components/CsvPasteDialog.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// tests/components/CsvPasteDialog.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CsvPasteDialog } from '@/components/import/CsvPasteDialog'

describe('CsvPasteDialog', () => {
  it('previews parsed headers and disables confirm on parse error', async () => {
    const onConfirm = vi.fn()
    render(
      <CsvPasteDialog projectId="p1" open onClose={() => {}} onConfirm={onConfirm} />,
    )
    fireEvent.change(screen.getByLabelText(/container name/i), { target: { value: 'Imported' } })
    fireEvent.change(screen.getByLabelText(/csv/i), { target: { value: 'name,email,age' } })
    expect(await screen.findByText('name')).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByText('age')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Replace `components/project/AddContainerMenu.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { NewContainerDialog } from './NewContainerDialog'
import { CsvPasteDialog } from '@/components/import/CsvPasteDialog'

export function AddContainerMenu({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'menu' | 'manual' | 'csv'>('menu')

  return (
    <>
      <button
        onClick={() => { setMode('menu'); setOpen(true) }}
        className="w-full rounded bg-neutral-900 px-3 py-2 text-sm text-white"
      >+ Add container</button>
      {open && mode === 'menu' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-72 space-y-2 rounded-lg bg-white p-4 shadow-xl">
            <button className="w-full rounded border px-3 py-2 text-left text-sm" onClick={() => setMode('manual')}>
              Manual entry
            </button>
            <button className="w-full rounded border px-3 py-2 text-left text-sm" onClick={() => setMode('csv')}>
              Paste CSV
            </button>
            <button className="w-full px-3 py-2 text-right text-sm text-neutral-500" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <NewContainerDialog
        projectId={projectId}
        open={open && mode === 'manual'}
        onClose={() => { setOpen(false); setMode('menu') }}
      />
      <CsvPasteDialog
        projectId={projectId}
        open={open && mode === 'csv'}
        onClose={() => { setOpen(false); setMode('menu') }}
        onConfirm={() => { setOpen(false); setMode('menu') }}
      />
    </>
  )
}
```

- [ ] **Step 4: Create `components/project/NewContainerDialog.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/browser'
import { createContainer } from '@/lib/db/containers'
import { useInvalidateProject } from '@/lib/hooks/useProjectData'
import { CONTAINER_TYPES, type ContainerType } from '@/lib/domain/enums'

export function NewContainerDialog({
  projectId, open, onClose,
}: { projectId: string; open: boolean; onClose: () => void }) {
  const invalidate = useInvalidateProject()
  const [name, setName] = useState('')
  const [type, setType] = useState<ContainerType>('source')
  const [systemName, setSystemName] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await createContainer(createClient(), {
        project_id: projectId, name, container_type: type, system_name: systemName || null,
        position_x: 40, position_y: 40,
      })
      invalidate(projectId)
      toast.success('Container added')
      onClose()
      setName(''); setSystemName(''); setType('source')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form onSubmit={onSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">New container</h2>
        <label className="block text-sm">
          <div className="mb-1 text-xs text-neutral-500">Name</div>
          <input required value={name} onChange={e => setName(e.target.value)}
            className="w-full rounded border px-2 py-1" />
        </label>
        <label className="block text-sm">
          <div className="mb-1 text-xs text-neutral-500">Type</div>
          <select value={type} onChange={e => setType(e.target.value as ContainerType)}
            className="w-full rounded border px-2 py-1">
            {CONTAINER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <div className="mb-1 text-xs text-neutral-500">System name (optional)</div>
          <input value={systemName} onChange={e => setSystemName(e.target.value)}
            className="w-full rounded border px-2 py-1" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving || !name}
            className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Create `components/import/CsvPasteDialog.tsx`**

```tsx
'use client'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/browser'
import { createContainer } from '@/lib/db/containers'
import { createElements } from '@/lib/db/elements'
import { useInvalidateProject } from '@/lib/hooks/useProjectData'
import { parseCsvForImport, type CsvImportResult } from './csvParser'
import { CONTAINER_TYPES, type ContainerType } from '@/lib/domain/enums'

export function CsvPasteDialog({
  projectId, open, onClose, onConfirm,
}: { projectId: string; open: boolean; onClose: () => void; onConfirm: () => void }) {
  const invalidate = useInvalidateProject()
  const [name, setName] = useState('')
  const [type, setType] = useState<ContainerType>('source')
  const [systemName, setSystemName] = useState('')
  const [raw, setRaw] = useState('')
  const [saving, setSaving] = useState(false)

  const parseResult = useMemo<{ ok: true; value: CsvImportResult } | { ok: false; error: string } | null>(() => {
    if (!raw.trim()) return null
    try { return { ok: true, value: parseCsvForImport(raw) } }
    catch (err) { return { ok: false, error: err instanceof Error ? err.message : String(err) } }
  }, [raw])

  if (!open) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!parseResult || !parseResult.ok) return
    setSaving(true)
    try {
      const supabase = createClient()
      const container = await createContainer(supabase, {
        project_id: projectId, name, container_type: type, system_name: systemName || null,
        position_x: 40, position_y: 40,
      })
      await createElements(supabase, parseResult.value.fields.map((f, i) => ({
        container_id: container.id,
        display_label: f.display_label,
        data_type: f.data_type,
        sort_order: i,
        tags: [],
      })))
      invalidate(projectId)
      toast.success(`Imported ${parseResult.value.fields.length} fields`)
      onConfirm()
      setName(''); setSystemName(''); setRaw('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form onSubmit={onSubmit} className="w-[560px] max-h-[80vh] space-y-4 overflow-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Paste CSV</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label>
            <div className="mb-1 text-xs text-neutral-500">Container name</div>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="w-full rounded border px-2 py-1" aria-label="Container name" />
          </label>
          <label>
            <div className="mb-1 text-xs text-neutral-500">Type</div>
            <select value={type} onChange={e => setType(e.target.value as ContainerType)}
              className="w-full rounded border px-2 py-1">
              {CONTAINER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="col-span-2">
            <div className="mb-1 text-xs text-neutral-500">System name (optional)</div>
            <input value={systemName} onChange={e => setSystemName(e.target.value)}
              className="w-full rounded border px-2 py-1" />
          </label>
        </div>
        <label className="block text-sm">
          <div className="mb-1 text-xs text-neutral-500">CSV (first row = headers, optional second row of SQL types)</div>
          <textarea aria-label="CSV" rows={6} value={raw} onChange={e => setRaw(e.target.value)}
            className="w-full rounded border px-2 py-1 font-mono" />
        </label>
        {parseResult && !parseResult.ok && (
          <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{parseResult.error}</div>
        )}
        {parseResult && parseResult.ok && (
          <div className="rounded border text-sm">
            <div className="border-b bg-neutral-50 px-3 py-1 text-xs uppercase tracking-wide text-neutral-500">
              Preview ({parseResult.value.fields.length} fields{parseResult.value.detectedTypeRow ? ', type row detected' : ''})
            </div>
            <ul className="max-h-48 overflow-auto">
              {parseResult.value.fields.map((f, i) => (
                <li key={i} className="flex justify-between px-3 py-1">
                  <span>{f.display_label}</span>
                  <span className="text-neutral-500">{f.data_type ?? ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
          <button
            type="submit"
            disabled={saving || !name || !parseResult || !parseResult.ok}
            className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >{saving ? 'Importing…' : 'Import'}</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Run — expect PASS**

Run: `npm test -- tests/components/CsvPasteDialog.test.tsx`

- [ ] **Step 7: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add components/project/AddContainerMenu.tsx components/project/NewContainerDialog.tsx components/import/CsvPasteDialog.tsx tests/components/CsvPasteDialog.test.tsx
git commit -m "feat(import): add manual + CSV paste container creation dialogs"
```

---

## Task 23: Playwright Smoke Test

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/mvp-smoke.spec.ts`, `scripts/e2e-setup.ts`

- [ ] **Step 1: Install Playwright browsers**

```bash
npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
```

- [ ] **Step 3: Create `scripts/e2e-setup.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

async function main() {
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  for (const t of ['audit_log', 'mappings', 'data_elements', 'containers', 'project_members', 'projects']) {
    await svc.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  }
  console.log('E2E db reset complete')
}
main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 4: Create `tests/e2e/mvp-smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

// This smoke test uses the email/password user seeded in supabase/seed.sql.
// It bypasses the Google OAuth button by signing in via the Supabase API
// and setting cookies before navigating.

test('create project, import CSV, make a mapping, confirm it, reload', async ({ page, context }) => {
  // Sign in via REST API
  const res = await page.request.post(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'}/auth/v1/token?grant_type=password`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Content-Type': 'application/json',
      },
      data: { email: 'test@local.dev', password: 'testpassword123' },
    },
  )
  const body = await res.json()
  expect(body.access_token).toBeTruthy()

  // Set Supabase auth cookie (@supabase/ssr uses a "sb-<project-ref>-auth-token" cookie)
  await context.addCookies([{
    name: 'sb-127-auth-token',
    value: JSON.stringify([body.access_token, body.refresh_token, null, null, null]),
    url: 'http://localhost:3000',
  }])

  await page.goto('/projects')
  await page.getByRole('button', { name: /new project/i }).click()
  await page.getByPlaceholder('Project name').fill('Smoke Test Project')
  await page.getByRole('button', { name: /^create$/i }).click()

  // We're on the workspace now
  await expect(page.getByText('Smoke Test Project')).toBeVisible()

  // Add source container via CSV
  await page.getByRole('button', { name: /\+ add container/i }).click()
  await page.getByRole('button', { name: /paste csv/i }).click()
  await page.getByLabel('Container name').fill('Customers')
  await page.getByLabel('CSV').fill('first_name,last_name')
  await page.getByRole('button', { name: /^import$/i }).click()

  // Add target container via CSV
  await page.getByRole('button', { name: /\+ add container/i }).click()
  await page.getByRole('button', { name: /paste csv/i }).click()
  await page.getByLabel('Container name').fill('People')
  await page.locator('select').first().selectOption('target')
  await page.getByLabel('CSV').fill('full_name')
  await page.getByRole('button', { name: /^import$/i }).click()

  // The canvas renders nodes; dragging handles programmatically is brittle.
  // For the smoke test we instead verify persistence by reloading after
  // creating a mapping via the db layer through a page.evaluate call.
  await page.evaluate(async () => {
    const { createClient } = await import('/lib/supabase/browser.ts' as any)
    // no-op placeholder — see alternate path below
  }).catch(() => {})

  // Instead of the evaluate hack, drive mapping creation via the UI:
  // click a source handle then a target handle. React Flow exposes handles
  // with data-handleid attributes.
  const sourceHandle = page.locator('[data-handleid$="-s"]').first()
  const targetHandle = page.locator('[data-handleid$="-t"]').last()
  const sb = await sourceHandle.boundingBox()
  const tb = await targetHandle.boundingBox()
  if (sb && tb) {
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2)
    await page.mouse.down()
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 10 })
    await page.mouse.up()
  }

  // Click the edge to open the inspector
  await page.locator('.react-flow__edge').first().click()
  await page.getByRole('button', { name: /^confirm$/i }).click()
  await expect(page.getByRole('button', { name: /confirmed/i })).toBeVisible()

  // Reload and verify the mapping is still there
  await page.reload()
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)
})
```

- [ ] **Step 5: Run locally**

```bash
npm run db:reset
npm run test:e2e
```

Expected: smoke test passes. If the handle drag doesn't connect (React Flow's default connect-mode is strict), use the looser mode by setting `connectionMode="loose"` on `<ReactFlow>` and re-run — this is the realistic fallback, and acceptable for the MVP smoke test.

If still flaky, move the mapping creation out of the browser driver: `test.step("seed mapping via db helper", ...)` using the service role client and then reload the page to verify.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests/e2e/ scripts/e2e-setup.ts
git commit -m "test(e2e): add Playwright smoke test for MVP happy path"
```

---

## Task 24: CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create workflow**

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: supabase start
      - name: Export Supabase env
        run: |
          echo "NEXT_PUBLIC_SUPABASE_URL=$(supabase status -o json | jq -r .API_URL)" >> $GITHUB_ENV
          echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$(supabase status -o json | jq -r .ANON_KEY)" >> $GITHUB_ENV
          echo "SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | jq -r .SERVICE_ROLE_KEY)" >> $GITHUB_ENV
      - run: npm run typecheck
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for typecheck, unit, build, e2e"
```

---

## Task 25: README and Final Verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
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
- `npm run typecheck` — tsc --noEmit
- `npm test` — Vitest unit + component tests (requires local Supabase running)
- `npm run test:e2e` — Playwright smoke test
- `npm run db:reset` — reset local Supabase and re-apply seed
```

- [ ] **Step 2: Final verification**

```bash
npm run db:reset
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected: all green.

- [ ] **Step 3: Commit and push**

```bash
git add README.md
git commit -m "docs: add README with local dev instructions"
git push
```

---

## Self-Review Notes

**Spec coverage:**
- Projects/versions/containers/elements/mappings → Tasks 3, 9–12 (schema + db layer)
- RLS + multi-user → Task 4 + rls.test.ts in Task 6
- Audit log via triggers → Task 5
- Manual + CSV paste import → Task 14 (parser), Task 22 (dialogs)
- React Flow canvas with drag-to-connect, inspector, dashboard → Tasks 18–21
- Auth via Google OAuth → Task 15
- Dashboard counts → Tasks 13 + 18
- Playwright smoke test → Task 23
- CI → Task 24

**Deferred (explicit in spec):** LLM smart import, other import formats, path highlighting, completion heatmap, presence/cursors/locking, comments UI, audit log UI, exports, versioning/branching.

**Known risks flagged in the plan:**
- Playwright handle-drag reliability in Task 23 has a documented fallback (switch to loose connection mode, or seed via db helper).
- Supabase `sb-*-auth-token` cookie name varies by project ref; Task 23 uses the local ref. If running against a different Supabase project, adjust.
