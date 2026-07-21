
-- ============================================================================
-- Growth OS — Sprint Backend 0: Fundação Multi-tenant
-- ============================================================================

-- 1. Enums
create type public.app_role as enum (
  'administrador','gestor','operacional','financeiro',
  'marketing','comercial','desenvolvimento','suporte'
);

-- 2. Core multi-tenant
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index on public.workspace_members (user_id);
create index on public.workspace_members (workspace_id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, workspace_id, role)
);
create index on public.user_roles (user_id, workspace_id);

-- 3. Security-definer helpers (avoid RLS recursion)
create or replace function public.is_workspace_member(_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id and user_id = auth.uid()
  )
$$;

create or replace function public.has_role(_workspace_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and workspace_id = _workspace_id
      and role = _role
  )
$$;

-- 4. Updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- 5. Domain tables (JSONB payload keeps parity with existing TS types)
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.empresas (workspace_id, created_at desc);

create table public.empresa_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);
create index on public.empresa_events (workspace_id, empresa_id, occurred_at desc);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.leads (workspace_id, created_at desc);

create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.lead_events (workspace_id, lead_id, created_at desc);

create table public.lead_interactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.lead_interactions (workspace_id, lead_id, created_at desc);

create table public.lead_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.lead_tasks (workspace_id, lead_id, created_at desc);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.opportunities (workspace_id, empresa_id, created_at desc);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.proposals (workspace_id, opportunity_id, created_at desc);
create index on public.proposals (workspace_id, empresa_id);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.contracts (workspace_id, proposal_id, created_at desc);
create index on public.contracts (workspace_id, empresa_id);

create table public.signatures (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.signatures (workspace_id, contract_id, created_at desc);

-- 6. updated_at triggers
create trigger t_empresas_updated before update on public.empresas for each row execute function public.tg_set_updated_at();
create trigger t_leads_updated before update on public.leads for each row execute function public.tg_set_updated_at();
create trigger t_lead_tasks_updated before update on public.lead_tasks for each row execute function public.tg_set_updated_at();
create trigger t_opportunities_updated before update on public.opportunities for each row execute function public.tg_set_updated_at();
create trigger t_proposals_updated before update on public.proposals for each row execute function public.tg_set_updated_at();
create trigger t_contracts_updated before update on public.contracts for each row execute function public.tg_set_updated_at();
create trigger t_signatures_updated before update on public.signatures for each row execute function public.tg_set_updated_at();
create trigger t_profiles_updated before update on public.profiles for each row execute function public.tg_set_updated_at();

-- 7. GRANTS
grant select, insert, update, delete on public.workspaces to authenticated;
grant all on public.workspaces to service_role;

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

grant select on public.workspace_members to authenticated;
grant all on public.workspace_members to service_role;

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

do $$ declare t text;
begin
  for t in select unnest(array[
    'empresas','empresa_events','leads','lead_events','lead_interactions',
    'lead_tasks','opportunities','proposals','contracts','signatures'
  ]) loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

-- 8. Enable RLS
alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.user_roles enable row level security;
alter table public.empresas enable row level security;
alter table public.empresa_events enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.lead_interactions enable row level security;
alter table public.lead_tasks enable row level security;
alter table public.opportunities enable row level security;
alter table public.proposals enable row level security;
alter table public.contracts enable row level security;
alter table public.signatures enable row level security;

-- 9. Policies
-- workspaces: members can read; anyone authenticated can insert (used during signup fallback); admins can update/delete
create policy "workspaces: members read" on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
create policy "workspaces: authenticated create" on public.workspaces
  for insert to authenticated with check (true);
create policy "workspaces: admin update" on public.workspaces
  for update to authenticated using (public.has_role(id, 'administrador'))
  with check (public.has_role(id, 'administrador'));

-- profiles: user owns own row
create policy "profiles: self read" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles: self insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "profiles: self update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- workspace_members: user sees own membership rows
create policy "members: self read" on public.workspace_members
  for select to authenticated using (user_id = auth.uid());

-- user_roles: user sees own roles
create policy "roles: self read" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

-- Domain tables: workspace-scoped
do $$ declare t text;
begin
  for t in select unnest(array[
    'empresas','empresa_events','leads','lead_events','lead_interactions',
    'lead_tasks','opportunities','proposals','contracts','signatures'
  ]) loop
    execute format($p$create policy "%1$s: workspace select" on public.%1$I for select to authenticated using (public.is_workspace_member(workspace_id))$p$, t);
    execute format($p$create policy "%1$s: workspace insert" on public.%1$I for insert to authenticated with check (public.is_workspace_member(workspace_id))$p$, t);
    execute format($p$create policy "%1$s: workspace update" on public.%1$I for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))$p$, t);
    execute format($p$create policy "%1$s: workspace delete" on public.%1$I for delete to authenticated using (public.is_workspace_member(workspace_id))$p$, t);
  end loop;
end $$;

-- 10. Signup handler: creates profile + personal workspace + membership + admin role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare ws_id uuid;
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''), '@', 1))
  );

  insert into public.workspaces (name)
  values (coalesce(new.raw_user_meta_data->>'workspace_name', 'Meu Workspace'))
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id) values (ws_id, new.id);
  insert into public.user_roles (user_id, workspace_id, role) values (new.id, ws_id, 'administrador');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
