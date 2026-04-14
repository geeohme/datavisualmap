# Data Visual Map — Phase Roadmap

This tool is being built in sub-projects. Each phase has its own design spec and implementation plan, brainstormed and executed independently. This document is the index.

Full problem framing: [AI-assisted_visual_data_mapping.md](../AI-assisted_visual_data_mapping.md).

## Phase 1 — MVP Core *(in progress)*

Spec: [docs/superpowers/specs/2026-04-14-mvp-core-design.md](./superpowers/specs/2026-04-14-mvp-core-design.md)

Projects, containers, data elements, mappings, manual entry + CSV paste import, React Flow canvas with drag-to-connect, inspector panel, Supabase Auth + RLS multi-user data model, dashboard counts, DB-trigger audit log (no UI).

## Phase 2 — Smart Import Pipeline

LLM-assisted import from unstructured and structured sources, landing in a sandboxed Draft Tray that a human reviews before promotion to the live project.

**Scope:**
- Importers: DDL SQL, CSV/Excel with type inference, JSON Schema, ERD formats, unstructured Word/PDF/text
- LLM extraction of field names, types, descriptions, suggested container type and placement
- Draft Tray UI: side panel listing proposed elements with accept/reject/edit/move actions, bulk accept
- Per-project / per-task LLM provider selection (Sonnet 4.6, Gemini, GPT, configurable)
- `confidence = ai_suggested` state on mappings

**Dependencies:** Phase 1 data model and canvas.

## Phase 3 — Path Highlighting & Completion Heatmap

Graph traversal and visualization features that turn the canvas into a lineage explorer.

**Scope:**
- Recursive CTE graph traversal from any selected element in both directions
- Visual path highlighting across the full lineage (multi-hop through transformation containers)
- "Trace all paths from this source" action
- Completion heatmap overlay: containers colored by % confirmed mappings
- Dashboard charts beyond raw counts

**Dependencies:** Phase 1 data model. Independent of phase 2.

## Phase 4 — Collaboration

Real-time facilitation features for live mapping meetings.

**Scope:**
- Expanded roles beyond owner/editor/viewer (Reviewer)
- Supabase Realtime presence — who's on the canvas now
- Live cursors and selection indicators
- Field-level edit locking ("Jane is editing this element")
- Change feed / activity stream during a session
- Comment threads on elements and mapping edges
- Audit log viewer UI (filterable by user, date, entity, action)

**Dependencies:** Phase 1. Independent of phases 2 and 3.

## Phase 5 — Export Engine

Turn the mapping record into deliverable artifacts.

**Scope:**
- Word / PDF human-readable mapping spec document
- Excel mapping matrix (source × target with rules and status)
- SQL mapping-syntax export (annotated `SELECT src.col AS tgt.col`, for human implementation — not runnable)
- ETL handoff JSON — custom clean schema, with Apache Atlas / dbt-compatible variants as stretch
- ERD visual export
- Export scope selector: full project, single container, confirmed-only

**Dependencies:** Phase 1. Benefits from but doesn't require phases 2–4.

## Phase 6 — Versioning & Branching

Promote the implicit working version into a full version model with draft overlays and merge.

**Scope:**
- Named versions (v1.0, v1.1-draft, etc.)
- Branch, merge, promote operations
- Draft overlay pattern for Smart Import (replaces phase 2's simpler Draft Tray if needed)
- Per-version audit log scoping
- Schema change: add `version_id` column to containers/elements/mappings (forward-compatible from phase 1 design)

**Dependencies:** Phase 1 schema. Benefits most when phases 2 and 5 exist.

---

## Notes

- Phase order is a suggestion, not a constraint. Phases 2, 3, 4, 5 are largely independent and can be reordered based on user need after MVP ships.
- Each phase begins with its own brainstorming session (superpowers:brainstorming) and produces its own spec in `docs/superpowers/specs/`.
- Keep this file updated as phases complete or scope shifts.
