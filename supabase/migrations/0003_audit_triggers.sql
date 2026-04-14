create or replace function audit_project_id(entity_type text, row_data jsonb)
returns uuid language sql immutable as $$
  select case entity_type
    when 'projects' then (row_data->>'id')::uuid
    when 'containers' then (row_data->>'project_id')::uuid
    when 'mappings' then (row_data->>'project_id')::uuid
    when 'data_elements' then null
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
