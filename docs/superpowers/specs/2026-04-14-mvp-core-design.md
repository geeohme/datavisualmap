# Data Visual Map — MVP Core Design

**Date:** 2026-04-14
**Status:** Approved for implementation planning
**Scope:** MVP (sub-project 1 of 6). See `docs/roadmap.md` for later phases.

## Purpose

A standalone web app for visually mapping data elements from source systems to target systems during an enterprise digital transformation. The tool is a **mapping record and facilitation surface** used in live meetings — not ETL. Output is documentation of *intent*, not executed data movement.

The core value: a team in a room can drag fields from a legacy BSS/OSS container to a new target container, annotate the transformation rule, mark status, and leave the meeting with an auditable artifact cleaner and more precise than a shared spreadsheet.

Source context and full problem framing: [AI-assisted_visual_data_mapping.md](../../../AI-assisted_visual_data_mapping.md).

## MVP Scope

**In:**
- Projects with a single implicit working version
- Containers typed as Source / Target / Transformation / Report / Category
- Data elements with full attribute set (label, db name, UI label, type, format, nullable, notes, tags, fidelity, status)
- Mappings as directed edges between elements with mapping type, transformation note, and draft/confirmed state
- Manual field entry and CSV paste import (headers become fields; optional type row)
- React Flow canvas — pan, zoom, drag container nodes, drag field-to-field to create edges, click to inspect
- Supabase Auth (Google OAuth) with multi-user data model and RLS
- Project dashboard with live status counts
- Audit log written by DB triggers (no UI yet)

**Out (tracked in roadmap):** LLM smart import, additional import formats, path highlighting, completion heatmap, presence / cursors / locking, comments UI, audit log UI, exports, versioning/branching, Draft Tray.

## Architecture

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript, Supabase (Postgres + Auth + RLS), React Flow (`@xyflow/react`), TanStack Query, Zustand for transient canvas state, Tailwind + shadcn/ui, Vercel hosting.

**Layering:**

```
app/
  (auth)/login, (auth)/callback
  projects/page.tsx               list
  projects/[id]/page.tsx          workspace
components/
  canvas/                         React Flow wrapper + custom node/edge components
  inspector/                      right-side detail panel
  import/                         CSV paste modal
  project/                        sidebar, dashboard, tree
lib/
  supabase/                       browser + server clients
  db/                              typed query/mutation functions (one file per entity)
  domain/                          zod schemas + pure types
  graph/                           reserved for phase 3 path highlighting
```

All Supabase access goes through `lib/db/*`. Components receive props and emit events — they do not import Supabase clients directly. RLS is the real security boundary; `lib/db` exists for typing and consistency.

Server components fetch initial project data via the Supabase server client. Client components use TanStack Query for mutations and refetch. Optimistic updates with rollback on error.

## Data Model

RLS on every table, keyed off `project_members`. One implicit working version per project; schema is ready to add `version_id` later without data loss.

```sql
projects (
  id uuid pk, name text, description text,
  created_by uuid fk auth.users, created_at timestamptz
)

project_members (
  project_id uuid fk, user_id uuid fk auth.users,
  role text check in ('owner','editor','viewer'),
  primary key (project_id, user_id)
)

containers (
  id uuid pk, project_id uuid fk, name text,
  container_type text check in ('source','target','transformation','report','category'),
  system_name text,
  position_x real, position_y real,
  collapsed boolean default false,
  created_at timestamptz, updated_at timestamptz
)

data_elements (
  id uuid pk, container_id uuid fk,
  display_label text not null,
  db_column_name text, ui_label text,
  data_type text, format text, nullable boolean,
  example_values text, notes text,
  tags text[] default '{}',
  fidelity text check in ('full','partial','label_only') default 'label_only',
  status text check in ('unmapped','mapped','not_needed','blocked','in_review','confirmed') default 'unmapped',
  sort_order int,
  created_at timestamptz, updated_at timestamptz
)

mappings (
  id uuid pk, project_id uuid fk,
  source_element_ids uuid[] not null,
  target_element_ids uuid[] not null,
  mapping_type text check in ('passthrough','concat','lookup','formula','derived','constant'),
  transformation_note text,
  confidence text check in ('draft','confirmed') default 'draft',
  created_by uuid, created_at timestamptz,
  confirmed_by uuid, confirmed_at timestamptz
)

audit_log (
  id bigserial pk, project_id uuid fk, user_id uuid fk,
  entity_type text, entity_id uuid,
  action text,
  before jsonb, after jsonb,
  at timestamptz default now()
)
```

**Notes:**
- `mappings.source_element_ids`/`target_element_ids` as arrays keep many:many in a single edge row. Phase 3 path traversal will use `unnest` + recursive CTE.
- `audit_log` is written by Postgres triggers on insert/update/delete of projects, containers, data_elements, and mappings — guarantees completeness regardless of client code paths.
- Element `status` is explicit, not derived from edge existence. "not_needed" and "blocked" are meaningful independent states.
- `confidence` enum will gain `ai_suggested` in phase 2 without breaking existing rows.

## Canvas & Interactions

**Layout:** top bar (project name, user menu, + Add Container), left sidebar (project list, project tree, dashboard counts), center React Flow canvas, right inspector panel.

**Container node** (custom React Flow node): header with name, type badge, system name, collapse toggle. Body lists fields as rows; each row exposes a React Flow handle on both sides (source right, target left) so edges connect at the field level. Collapsed containers show only the header with one aggregate handle.

**Mapping creation:** drag from a field's source handle to another field's target handle. React Flow's `onConnect` calls `createMapping` in the db layer with default `passthrough` type and `draft` confidence. Optimistic update via TanStack Query.

**Selection & inspector:**
- Field row → inspector shows editable element attributes
- Edge → inspector shows editable mapping attributes (type, transformation note, Confirm button)
- Empty canvas → inspector shows project summary
- Inspector edits autosave on blur

**Positioning:** container positions persist to `position_x`/`position_y` on drag end. No auto-layout in MVP.

**Visual states:**
- Edge color by confidence: draft = dashed blue, confirmed = solid green
- Field row left-border by status: unmapped gray, mapped blue, confirmed green, not_needed strikethrough gray, blocked red, in_review amber

**Keyboard:** Delete removes a selected edge (with confirm). Escape clears selection.

## CSV Paste Import

Accessed from "+ Add Container" → "Paste CSV".

1. Modal: container name, type dropdown, system name, textarea.
2. User pastes CSV or tab-separated text. First row = headers.
3. `papaparse` extracts headers; each becomes a `data_elements` row with `fidelity = label_only`, `status = unmapped`.
4. If a second row looks like SQL types (`varchar`, `int`, `date`, `boolean`, etc.), offer to use it as `data_type`. Otherwise ignore body rows.
5. Preview table shows what will be created; user confirms or cancels.
6. Confirm runs one transaction: create container, insert all elements. Canvas refetches.

No LLM, no smart inference beyond the type-row heuristic. Full smart-import pipeline is phase 2.

## Sidebar & Dashboard

**Dashboard** (top of sidebar): total, unmapped, mapped (draft), confirmed, not_needed, blocked. Driven by a single aggregate query. Clicking a count filters the project tree below to only elements in that status.

**Project tree:** grouped by container type (Sources / Targets / Transformations / Reports / Categories), each showing containers, expandable to fields. Clicking a field selects it on the canvas and opens the inspector.

## Error Handling

- Shared `useMutation` wrapper surfaces DB errors as toasts; no silent failures.
- Optimistic updates roll back on error.
- CSV parse errors show inline in the import modal before any DB writes.
- Auth failures redirect to `/login`.
- Project route 404 relies on RLS and renders a clean "not found or no access" page.
- No global try/catch swallowing. Next.js error boundaries catch unexpected errors.

## Testing

- **Unit (Vitest):** `lib/db/*` against a local Supabase with migrations applied (real Postgres, not mocks — RLS and schema are what we're validating), `lib/domain/*` zod schemas, CSV header→element mapping.
- **Component (Vitest + RTL):** inspector form behavior, CSV paste modal flow, container node render states.
- **E2E (Playwright smoke):** one happy path — sign in → create project → paste CSV → drag a mapping → confirm it → reload and see it persisted.
- Skip visual regression and deep canvas interaction tests in MVP; React Flow is well-tested upstream.

## Success Criteria

1. Two authenticated users can sign in and see the same project.
2. User can create a project, add containers manually and via CSV paste.
3. User can drag a field-to-field mapping, edit its rule, mark it confirmed.
4. Element and mapping edits persist across reload.
5. Dashboard counts update live as mappings change.
6. Audit log rows exist for every create/update/delete (verifiable via SQL).
7. Playwright smoke test passes in CI.

## Open Decisions Deferred to Implementation Plan

- Exact Next.js project scaffold (create-next-app flags, ESLint config)
- Supabase migration tooling (Supabase CLI is the default)
- CI provider (GitHub Actions assumed)
- Specific shadcn/ui components to vendor in
