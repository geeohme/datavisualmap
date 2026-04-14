alter table projects enable row level security;
alter table project_members enable row level security;
alter table containers enable row level security;
alter table data_elements enable row level security;
alter table mappings enable row level security;
alter table audit_log enable row level security;

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
