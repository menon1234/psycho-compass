-- Run this in the Supabase SQL Editor for the project used by psycho-compass.
-- It allows browser clients using the anon key to insert session rows.

alter table public.sessions enable row level security;

drop policy if exists "allow anon inserts into sessions" on public.sessions;

create policy "allow anon inserts into sessions"
on public.sessions
for insert
to anon
with check (true);
