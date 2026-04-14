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
