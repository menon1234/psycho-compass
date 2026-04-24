-- Run this in the Supabase SQL Editor for the project used by psycho-compass.
-- It adds account-linked session tracking while preserving guest sessions.

alter table public.sessions add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists sessions_user_id_created_at_idx on public.sessions (user_id, created_at desc);

alter table public.sessions enable row level security;

drop policy if exists "allow guest inserts into sessions" on public.sessions;
drop policy if exists "allow anon inserts into sessions" on public.sessions;
drop policy if exists "allow authenticated inserts into own sessions" on public.sessions;
drop policy if exists "allow authenticated reads own sessions" on public.sessions;
drop policy if exists "allow public read compass nodes" on public.sessions;

-- Anyone can insert a guest session (no user_id)
create policy "allow guest inserts into sessions"
on public.sessions
for insert
to anon
with check (user_id is null);

-- Signed-in users can insert sessions linked to their account
create policy "allow authenticated inserts into own sessions"
on public.sessions
for insert
to authenticated
with check (auth.uid() = user_id);

-- Signed-in users can read their own full sessions (for archive/history)
create policy "allow authenticated reads own sessions"
on public.sessions
for select
to authenticated
using (auth.uid() = user_id);

-- Anyone (signed in or not) can read compass position columns for all sessions
drop policy if exists "allow authenticated reads all compass nodes" on public.sessions;
create policy "allow public read compass nodes"
on public.sessions
for select
to anon, authenticated
using (true);
