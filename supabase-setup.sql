-- Supabase SQL Editor에서 실행하세요. 설정 변경 후 다시 실행해도 됩니다.
create table if not exists public.rsvp_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.attendance_responses (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null check (char_length(guest_name) between 1 and 30),
  phone text not null check (char_length(phone) between 1 and 20),
  attendance text not null check (attendance in ('참석', '불참')),
  origin text,
  transport text,
  departure_date text,
  travel_details text not null default '' check (char_length(travel_details) <= 100),
  companions jsonb not null default '[]'::jsonb,
  companion_count integer not null default 0 check (companion_count >= 0),
  total_count integer not null default 0 check (total_count >= 0),
  needs_accommodation text check (needs_accommodation in ('예', '아니오', '미정')),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);
alter table public.attendance_responses
  add column if not exists travel_details text not null default '';

create table if not exists public.invitation_settings (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null check (char_length(guest_name) between 1 and 30),
  message text not null check (char_length(message) between 1 and 300),
  created_at timestamptz not null default now()
);
alter table public.guestbook_entries
  add column if not exists hidden boolean not null default false;

alter table public.rsvp_admins enable row level security;
alter table public.attendance_responses enable row level security;
alter table public.invitation_settings enable row level security;
alter table public.guestbook_entries enable row level security;

revoke all on table public.rsvp_admins from anon, authenticated;
revoke all on table public.attendance_responses from anon, authenticated;
revoke all on table public.invitation_settings from anon, authenticated;
revoke all on table public.guestbook_entries from anon, authenticated;
grant select on table public.rsvp_admins to authenticated;
grant insert on table public.attendance_responses to anon, authenticated;
grant select on table public.attendance_responses to authenticated;
grant select on table public.invitation_settings to anon, authenticated;
grant insert, update on table public.invitation_settings to authenticated;
grant select, insert on table public.guestbook_entries to anon, authenticated;
grant update on table public.guestbook_entries to authenticated;

drop policy if exists "admins can read own registration" on public.rsvp_admins;
create policy "admins can read own registration"
on public.rsvp_admins for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "guests can submit attendance" on public.attendance_responses;
create policy "guests can submit attendance"
on public.attendance_responses for insert
to anon, authenticated
with check (true);

drop policy if exists "registered admins can read attendance" on public.attendance_responses;
create policy "registered admins can read attendance"
on public.attendance_responses for select
to authenticated
using (
  exists (
    select 1
    from public.rsvp_admins
    where user_id = (select auth.uid())
  )
);

drop policy if exists "guests can read invitation settings" on public.invitation_settings;
create policy "guests can read invitation settings"
on public.invitation_settings for select
to anon, authenticated
using (id = 'main');

drop policy if exists "registered admins can create invitation settings" on public.invitation_settings;
create policy "registered admins can create invitation settings"
on public.invitation_settings for insert
to authenticated
with check (
  id = 'main' and exists (
    select 1 from public.rsvp_admins where user_id = (select auth.uid())
  )
);

drop policy if exists "registered admins can update invitation settings" on public.invitation_settings;
create policy "registered admins can update invitation settings"
on public.invitation_settings for update
to authenticated
using (
  id = 'main' and exists (
    select 1 from public.rsvp_admins where user_id = (select auth.uid())
  )
)
with check (id = 'main');

drop policy if exists "guests can read guestbook" on public.guestbook_entries;
create policy "guests can read guestbook"
on public.guestbook_entries for select
to anon, authenticated
using (hidden = false or exists (
  select 1 from public.rsvp_admins where user_id = (select auth.uid())
));

drop policy if exists "guests can write guestbook" on public.guestbook_entries;
create policy "guests can write guestbook"
on public.guestbook_entries for insert
to anon, authenticated
with check (true);

drop policy if exists "registered admins can moderate guestbook" on public.guestbook_entries;
create policy "registered admins can moderate guestbook"
on public.guestbook_entries for update
to authenticated
using (
  exists (select 1 from public.rsvp_admins where user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.rsvp_admins where user_id = (select auth.uid()))
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invitation-media', 'invitation-media', true, 20971520, array['image/svg+xml', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])
on conflict (id) do update set
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = array['image/svg+xml', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guest-photos', 'guest-photos', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

drop policy if exists "registered admins can upload invitation images" on storage.objects;
create policy "registered admins can upload invitation images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'invitation-media' and exists (
    select 1 from public.rsvp_admins where user_id = (select auth.uid())
  )
);

drop policy if exists "guests can upload private wedding photos" on storage.objects;
create policy "guests can upload private wedding photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'guest-photos'
  and owner_id = (select auth.uid())::text
);

drop policy if exists "guests can read own private wedding photos" on storage.objects;
create policy "guests can read own private wedding photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'guest-photos'
  and owner_id = (select auth.uid())::text
);

drop policy if exists "guests can delete own private wedding photos" on storage.objects;
create policy "guests can delete own private wedding photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'guest-photos'
  and owner_id = (select auth.uid())::text
);

drop policy if exists "registered admins can read private wedding photos" on storage.objects;
create policy "registered admins can read private wedding photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'guest-photos' and exists (
    select 1 from public.rsvp_admins where user_id = (select auth.uid())
  )
);

drop policy if exists "registered admins can delete private wedding photos" on storage.objects;
create policy "registered admins can delete private wedding photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'guest-photos' and exists (
    select 1 from public.rsvp_admins where user_id = (select auth.uid())
  )
);

-- Authentication > Users에서 두 분의 계정을 만든 뒤 UUID를 아래처럼 등록하세요.
-- insert into public.rsvp_admins (user_id) values
--   ('신랑 계정 UUID'),
--   ('신부 계정 UUID');
