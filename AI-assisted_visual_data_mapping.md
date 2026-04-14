# AI-assisted visual data mapping tool for system conversion

## Conversation
👉 - Indicates the current conversation path

<i>[4/14/2026, 1:11:08 PM]</i> 👉 <b>👤 User</b>: 

Help me think through this.  My ultimate goal here is to come up with requirement for a system conversion data mapper that is AI assisted, but is primarily a visual data mapping tool where i can drag and drop fields or groups of fields into an unmapped container, or import more structured data, either one, and start dragging and dropping elements to map them, clicking into them to add detail or rules or formats.  

Think of a Multi System Enterprise digital transformation effort.  I have an old stack of BSS/OSS systems, and I want to convert data from one or more of those systems into other new or existing systems and I need a system to track that every data element is accounted for, and then ideally export that into documentation or even create SQL scripts.  This isn't the ETL tool, just a visualization tool to do mapping in real time while facilitating meetings.  Cleaner and more precise than just excel.

So, as a place to start...

I have applications which have data.  That data can be categorized, subcategorized.  Each data field has n number of attributes, which include a value, a label, a type definition, perhaps multiple labels depending on context - what it's called in the Application UI, versus what its db name is.  From any source db, in a project like this, a single field or group of fields or concatenation can be mapped to one or more target systems, which may in turn either enrich that data or standardize it or otherwise transform it.  

User stories:
1 Suppose someone from BI says "I have this list of fields that I need for x report".  They give me a list of fields that is neither the source fields or the target fields.  They are entirely unmapped and I need to map them to the source data fields.

2 I have table schemas from the source system's db.  I need to map each field to a target or transformation layer or label fields as not needed.  

3 I have a table schema from the target system's db.  I need to map each field to a source or transformation layer or mark fields as not used.  

4) for both 2 and 3, I don't have field level detail. I only have a generic category like "location, customer, account, product, billing, statement, etc.  I need to map fields from both source and target into that container to give it definition.<br>

<i>[4/14/2026, 1:11:35 PM]</i> 👉 <b>🤖 Assistant</b>: 

 This is a well-scoped problem, george. Let me think through the conceptual structure before we talk about what to build.

## What You're Really Describing

You're describing a **semantic mapping workspace** — not ETL, not a schema editor, but a **reconciliation surface** where data elements from different contexts get linked, annotated, and resolved. The core tension in your four user stories is that data arrives with wildly different levels of definition:

| Story | Source fidelity | Target fidelity |
|---|---|---|
| 1 (BI report fields) | None — just labels | None — just intent |
| 2 (Source schema) | High — DB columns | Varies |
| 3 (Target schema) | Varies | High — DB columns |
| 4 (Category only) | Low — just a category name | Low — just a category name |

So your tool needs to handle **partial knowledge gracefully** — a field can exist in the mapping before it's fully defined, and the tool tracks completeness as a first-class concept.

---

## Core Conceptual Model

Before UI, you need a clean mental model. Here's how I'd frame it:

**Data Element** — the atom. Can come from a DB schema (fully attributed) or be hand-entered (partially attributed). Attributes include: name/label, DB column name, UI label, data type, format, nullability, example values, notes.

**Container** — a named group. Could be a DB table, a BI report, a category like "Customer", or a transformation layer. Containers hold Data Elements. A Container can be a Source, a Target, or a Transformation/Staging layer.

**Mapping** — a directed relationship between one or more source Data Elements → one or more target Data Elements. A mapping has: cardinality (1:1, many:1, 1:many), transformation rule (passthrough, concat, lookup, formula, etc.), confidence/status (draft, confirmed, not needed, blocked), and notes.

**Project** — the umbrella. Multiple source systems, multiple target systems, multiple mappings, tracked together.

---

## The Four User Stories Mapped to the Model

**Story 1 (BI fields):** User creates a new Container of type "Report/Unmapped", pastes or types field names. These become Data Elements with low fidelity (label only). Then they drag from source containers to link them. The tool surfaces "unmapped BI fields" as a completion gap.

**Story 2 (Source schema import):** Import a DDL or CSV. System creates a Source Container with fully-attributed Data Elements. User then maps each field outward to targets — or marks as "not needed" (which is itself a valid mapping state, not just deletion).

**Story 3 (Target schema import):** Same as Story 2 but reversed. Target fields start unmapped, user maps inward from sources.

**Story 4 (Category only):** User creates a Container with just a name. Both source AND target fields get dragged into it to give it shape — it acts as a definitional staging area, not just a passthrough.

---

## Key Design Principles Worth Locking In Early

**1. Mapping status is explicit, not binary.** Every field should have a status: `unmapped`, `mapped`, `not needed`, `blocked`, `in review`, `confirmed`. A field silently having no mapping is a data quality risk.

**2. Containers are typed.** Source / Target / Transformation Layer / Report / Category. The type drives the visual language and what relationships are valid.

**3. Mapping is directional but visible both ways.** If I'm looking at a target field, I should see what feeds it. If I'm looking at a source field, I should see where it goes.

**4. AI assist is augmentation, not automation.** AI can suggest mappings based on name similarity, type compatibility, and semantic meaning — but a human confirms. Suggestions appear as a distinct visual state (e.g., dotted line vs. solid line).

**5. The tool is a meeting artifact, not just a workbench.** It needs a read-only / presentation mode. Progress dashboards (X of Y fields mapped, Z confirmed). Export to documentation and SQL.

---

## Questions Before Going Further

A few things that would shape the requirements significantly:

1. **Who are the primary users in the room?** Business analysts, data architects, developers — different roles will want different levels of field detail visible at once.

2. **What import formats do you need to support?** DDL SQL, CSV/Excel schemas, JSON Schema, existing ERDs, manual entry?

3. **Is this a standalone tool, or does it need to live inside something** (Confluence, a portal, a dedicated web app)?

4. **What's the export target?** Documentation (Word/PDF), SQL scripts, YAML/JSON for downstream ETL config, all of the above?

5. **Multi-user / collaborative?** Real-time like Figma, or async with a shared file?

Those answers will determine whether you're speccing a lightweight React SPA, a full platform, or something in between. Want to work through those, or do you want me to start drafting a requirements structure based on reasonable assumptions?<br>

<i>[4/14/2026, 1:16:33 PM]</i> 👉 <b>👤 User</b>: 

1) My teammates and I the primary users 2) yes, DDL SQL, CSV/Excel schemas, JSON Schema, existing ERDs, manual entry, 3) standalone React/Next.js/Vanilla JS, 4) all of the above 5) a facilitation tool for live mapping.  Accessible by multiple authenticated users, with audit trail for every change.  

I'd like it to be able to have graphic abilities so that if I click on an element or group it highlights it's path across all source and target systems.  I'd like to be able to do "Smart imports" where I can upload a doc that fits any of the partial data or full data scenarios and an LLM reviews it and drops in the data where it thinks it should go with a review by humans before it is applied to a version.<br>

<i>[4/14/2026, 1:17:17 PM]</i> 👉 <b>🤖 Assistant</b>: 

 This is shaping up into a well-defined product. Let me think through the full requirements structure before we talk about building anything.

---

## What You're Building: A Mental Model

Call it a **Data Lineage Mapping Workbench**. It sits between raw schemas and ETL tools — its job is to make the *semantic intent* of a data migration visible, auditable, and collaborative. It's part whiteboard, part database, part document generator.

---

## Architecture Concepts Worth Naming

**Version / Session Model**
Since you have an audit trail and multi-user access, every mapping lives in a **Project**, which has **Versions**. Smart Import suggestions land in a **Draft overlay** — not committed to the live version until a reviewer approves. This protects the working state during a live meeting.

**The Graph**
Underneath everything is a directed graph: nodes are Data Elements, edges are Mappings. The visual canvas is just a rendered view of that graph. This is what enables "highlight the path" — you're just traversing the graph from any selected node in both directions.

**Layers**
Source → [Transformation Layer(s)] → Target. A field can pass through multiple hops. Each hop is a mapping edge with its own rule.

---

## Full Requirements Draft

### 1. Project & Version Management

- Create/archive Projects (one per conversion initiative)
- Projects contain named Versions (v1.0, v1.1-draft, etc.)
- Versions can be branched, merged, or promoted
- Smart Import suggestions land in a sandboxed Draft state, not live version
- Full audit log: who changed what, when, on which version — append-only

---

### 2. Data Element Model

Every field, wherever it comes from, resolves to a **Data Element** with these attributes:

| Attribute | Notes |
|---|---|
| Internal ID | System-generated |
| Display Label | Human-readable name |
| DB Column Name | Physical name |
| UI Label | What it's called in the source app's interface |
| Data Type | varchar, int, date, boolean, etc. |
| Format / Pattern | e.g., E.164 for MSISDN, ISO 8601 for dates |
| Nullable | Y/N |
| Example Values | Freetext or imported samples |
| Source System | Which app it came from |
| Fidelity Level | Full / Partial / Label-only |
| Mapping Status | `unmapped` / `mapped` / `not_needed` / `blocked` / `in_review` / `confirmed` |
| Notes | Freetext annotation |
| Tags | User-defined, e.g. "PII", "deprecated", "key field" |

---

### 3. Container Model

Containers group Data Elements. Typed:

| Type | Description |
|---|---|
| Source | A source system table or schema |
| Target | A target system table or schema |
| Transformation Layer | Staging, enrichment, or lookup step |
| Report / BI | A report or analytics consumer with its own field list |
| Category | A named semantic bucket (e.g. "Customer", "Billing") with no schema yet |

Containers can be nested (Schema → Table → Field). A Category container can receive fields dragged in from both source and target to give it definition bottom-up.

---

### 4. Mapping Model

A Mapping is a directed edge (or multi-edge) between Data Elements:

| Attribute | Notes |
|---|---|
| Source Element(s) | One or more — supports concat, composite key |
| Target Element(s) | One or more |
| Mapping Type | Passthrough / Concat / Lookup / Formula / Derived / Constant |
| Transformation Rule | Freetext or structured expression |
| Confidence | `ai-suggested` / `draft` / `confirmed` |
| Created By | User + timestamp |
| Confirmed By | User + timestamp |
| Notes | Rationale, business rule, caveats |

Mapping status is explicit — "not needed" and "blocked" are real states, not just absence of a mapping.

---

### 5. Import Engine

Support these input formats, all routed through a Smart Import pipeline:

- **DDL SQL** — parse CREATE TABLE statements, extract columns, types, constraints
- **CSV / Excel** — column headers as field names, optional type row
- **JSON Schema** — walk the schema tree, flatten to Data Elements
- **ERD** — structured ERD formats (dbdiagram.io, Lucidchart export, etc.)
- **Unstructured doc** — Word/PDF/plain text — LLM extracts field candidates
- **Manual entry** — type or paste field names with optional attributes

**Smart Import Flow:**
1. User uploads a document
2. System identifies format (or LLM infers it)
3. LLM extracts: field names, types, descriptions, relationships, suggested container type
4. Results appear in a **Draft Tray** — a side panel showing proposed elements and their suggested placements
5. User reviews each suggestion: Accept / Reject / Edit / Move
6. Bulk accept available with a single confirmation action
7. Only on final confirm does anything touch the live version

---

### 6. Canvas / Visual Workspace

**Layout**
- Left panel: Project tree (systems, containers, versions)
- Center: Mapping canvas — zoomable, pannable
- Right panel: Detail inspector (selected element or mapping attributes)
- Bottom: Draft Tray (Smart Import staging)

**Canvas Interactions**
- Drag a Container onto canvas to place it
- Expand/collapse containers to show/hide fields
- Drag a field from one container to another to create a mapping edge
- Multi-select fields to create a many:1 or 1:many mapping
- Click a mapping edge to open the transformation rule editor
- Right-click context menus on fields and containers

**Path Highlighting**
- Click any Data Element → highlight all edges in both directions through the full lineage graph
- Color-coded by mapping confidence (ai-suggested = dotted amber, draft = dashed blue, confirmed = solid green)
- Highlight persists until cleared or another element is selected
- "Trace all paths from this source" — expands full downstream lineage

**Completion Overlay**
- Toggle a heatmap view: containers colored by % of fields with confirmed mappings
- Summary dashboard: total fields, mapped, confirmed, not needed, unmapped, blocked

---

### 7. Collaboration & Access Control

- Authentication required (OAuth / SSO)
- Roles: Viewer / Editor / Reviewer / Admin
- Live presence indicators (who's on the canvas right now)
- Field-level locking: "Jane is editing this element"
- Change feed: real-time notification of edits during a session
- Comment threads on any element or mapping edge
- Audit log viewer: filterable by user, date, element, action type

---

### 8. Export Engine

| Format | Content |
|---|---|
| Word / PDF | Human-readable mapping spec document, per container or full project |
| Excel | Mapping matrix: source fields × target fields, with rules and status |
| SQL | DDL for target tables + transformation view definitions |
| JSON / YAML | Machine-readable mapping config (for ETL tool handoff) |
| ERD Diagram | Visual export of mapped relationships |

Export scope is selectable: full project, single version, single container, confirmed-only.

---

## Open Questions Before Spec Finalization

A few things that would tighten this further:

1. **Transformation Layer** — do you want a dedicated node type on the canvas (like a dbt model or a staging table) or is a transformation rule on the mapping edge sufficient for your use cases?

2. **SQL export specificity** — are you thinking `CREATE TABLE` DDL, `INSERT INTO ... SELECT` migration scripts, or `CREATE VIEW` transformation views — or all three depending on target?

3. **LLM for Smart Import** — do you have an Anthropic API key for this or are you thinking of a different model provider? This affects how we'd wire the import pipeline.

4. **Authentication** — do you have an existing auth system (Google, GitHub, Okta) or do you want username/password with JWT?

5. **Persistence** — local-first with sync, or fully server-side? PostgreSQL is an obvious fit given the graph + audit trail needs.

Want to lock in answers to those and then move to a formal requirements document or a system design spec?<br>

<i>[4/14/2026, 1:22:45 PM]</i> 👉 <b>👤 User</b>: 1) I really just want to model the data mapping.  I don't want or need to process the data.  But if the tool can output some form of data that can be loaded into an ETL tool in a standard format, that's a bonus.  2) again, i'm really just looking for the mapping.  3) I've got API keys for every major american and asian LLM.  I'd lean toward Sonnet 4.6, Gemini 3.1 , or GPT 5.4 (yes it exists).  Probably either supabase or google firestore for auth and db.  5) see 4.<br>
<i>[4/14/2026, 1:23:16 PM]</i> 👉 <b>🤖 Assistant</b>: 

 Good clarifications. Let me reframe and tighten the spec accordingly.

---

## Reframed Core Purpose

This tool is a **mapping record**, not a processing tool. It answers the question: *"What is supposed to happen to this data, and who agreed to it?"* The output is **documentation and handoff artifacts**, not executable code. SQL and ETL exports are just structured ways of expressing the mapping intent — a human or an ETL tool interprets them, the tool doesn't run them.

---

## Clarifications That Simplify the Design

**Transformation Layer** becomes lighter — it's just an annotated hop node on the canvas. No schema required. It says "this field passes through a lookup here" and the rule is documented, not executed.

**SQL export** becomes a mapping specification in SQL syntax — think annotated `SELECT source.field AS target.field` style. Readable by a human data engineer who then implements it. Not runnable directly.

**ETL handoff format** — the natural fit here is **Apache Atlas lineage JSON** or a simple custom JSON schema that any major ETL tool (Informatica, dbt, Airbyte, Fivetran) could parse. We define a clean open schema for this.

---

## LLM Strategy

Given your key availability, here's how I'd think about it:

| Task | Recommended Model | Reason |
|---|---|---|
| Smart Import — unstructured doc parsing | Gemini 2.0 Flash or Sonnet | Long context, document understanding |
| Smart Import — DDL/JSON/CSV parsing | Sonnet 4.6 | Structured extraction, reliable JSON output |
| Mapping suggestions (semantic similarity) | Sonnet 4.6 | Best at semantic reasoning over field names/descriptions |
| Export — generating mapping spec narrative | Sonnet 4.6 | Prose quality |
| Fallback / cost optimization | GPT-4o | Broad availability |

Make the LLM provider **configurable per project or per task type** — don't hardcode. A dropdown in project settings. This also future-proofs you as models evolve.

---

## Persistence: Supabase

Supabase is the right call over Firestore for this use case. Here's why it matters for your data model:

- Your core data is **relational** — projects, versions, containers, elements, mappings all have FK relationships
- The audit trail is a **append-only event log** — Postgres handles this naturally
- The graph traversal for path highlighting is a **recursive CTE query** — trivial in Postgres, painful in Firestore
- Supabase Realtime handles the live collaboration presence layer
- Supabase Auth handles OAuth out of the box (Google, GitHub, etc.)

Firestore would fight you on every one of those.

---

## Revised & Tightened Requirements

### What's In

- Project / version management with branching
- Data Element model with full attribute set
- Container model (Source, Target, Transformation hop, Report/BI, Category)
- Mapping model — directed, annotated, with confidence states
- Smart Import pipeline (all formats, LLM-assisted, Draft Tray review)
- Visual canvas — drag/drop, path highlighting, completion heatmap
- Multi-user with presence, roles, comments, audit trail
- Export: Word/PDF spec doc, Excel mapping matrix, SQL mapping syntax, ETL handoff JSON

### What's Out (explicitly)

- Data execution or processing of any kind
- ETL pipeline configuration or orchestration
- Data preview or row-level sampling
- Schema validation against live databases
- Automated testing of mappings

### What's a Bonus (document but deprioritize)

- ETL handoff JSON in Apache Atlas or dbt-compatible format
- AI-suggested mappings based on semantic field name similarity
- ERD visual export

---

## The Data Model Core (Supabase / Postgres)

This is worth sketching now because it shapes everything:

```
projects → versions → containers → data_elements
                    → mappings (source_element_id → target_element_id)
                    → audit_log (append-only)
                    → import_drafts (staging for Smart Import)

users → project_members (role per project)
      → comments (on element or mapping)
      → presence (ephemeral, via Supabase Realtime)
```

The mapping edge table is the heart of it:

```sql
mappings (
  id, version_id,
  source_element_ids  -- array, supports many:1
  target_element_ids  -- array, supports 1:many
  mapping_type        -- passthrough/concat/lookup/derived/constant
  transformation_note -- human-readable rule description
  confidence          -- ai_suggested/draft/confirmed/not_needed/blocked
  created_by, created_at,
  confirmed_by, confirmed_at
)
```

Path highlighting is then a recursive CTE walking this table in both directions from any selected element.

---

## Next Step Options

We're at the point where we could go one of three directions:

**A) Formal Requirements Document** — a structured PRD artifact you can hand to a dev team or use for scoping/estimation. I write it as a document.

**B) System Design Spec** — component architecture, API surface, data model DDL, component tree. More technical, less prose.

**C) Build a Prototype** — start with the canvas and core data model as a working React artifact, iterate from there.

Which direction, george — and do you want to do any of these as artifacts?<br>

