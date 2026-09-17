-- Fred & Ariana — banco de pedidos + login do painel
create extension if not exists pgcrypto;

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  privacy_mode text not null check (privacy_mode in ('identified','anonymous')),
  name text,
  whatsapp text,
  prayer_request text not null,
  consent_lgpd boolean not null default false,
  consented_at timestamptz,
  source text not null default 'site',
  status text not null default 'novo' check (status in ('novo','em_oracao','concluido','arquivado'))
);

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'admin' check (role in ('admin','operator')),
  created_at timestamptz not null default now()
);

alter table public.prayer_requests enable row level security;
alter table public.admin_profiles enable row level security;

create or replace function public.is_prayer_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.admin_profiles where id=auth.uid());
$$;

drop policy if exists "public_insert_prayer_requests" on public.prayer_requests;
create policy "public_insert_prayer_requests" on public.prayer_requests
for insert to anon,authenticated
with check (
 consent_lgpd=true and prayer_request is not null and length(trim(prayer_request)) between 3 and 5000
 and (
   (privacy_mode='anonymous' and name is null and whatsapp is null)
   or (privacy_mode='identified' and name is not null and whatsapp is not null)
 )
);

drop policy if exists "admins_read_prayer_requests" on public.prayer_requests;
create policy "admins_read_prayer_requests" on public.prayer_requests for select to authenticated using(public.is_prayer_admin());

drop policy if exists "admins_update_prayer_requests" on public.prayer_requests;
create policy "admins_update_prayer_requests" on public.prayer_requests for update to authenticated using(public.is_prayer_admin()) with check(public.is_prayer_admin());

drop policy if exists "admins_delete_prayer_requests" on public.prayer_requests;
create policy "admins_delete_prayer_requests" on public.prayer_requests for delete to authenticated using(public.is_prayer_admin());

drop policy if exists "admin_profile_self_read" on public.admin_profiles;
create policy "admin_profile_self_read" on public.admin_profiles for select to authenticated using(id=auth.uid());

create or replace function public.touch_prayer_request_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;

drop trigger if exists prayer_requests_touch_updated_at on public.prayer_requests;
create trigger prayer_requests_touch_updated_at before update on public.prayer_requests
for each row execute function public.touch_prayer_request_updated_at();

create index if not exists prayer_requests_created_at_idx on public.prayer_requests(created_at desc);
create index if not exists prayer_requests_status_idx on public.prayer_requests(status);

-- Primeiro usuário da equipe:
-- 1. Authentication > Users > crie o usuário.
-- 2. Copie o UUID.
-- 3. Rode:
-- insert into public.admin_profiles (id,email,role)
-- values ('UUID_DO_USUARIO','email@igreja.com','admin');
