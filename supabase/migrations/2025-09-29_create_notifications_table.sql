-- Create notifications table for app-wide notifications
-- Safe to run multiple times
create extension if not exists "pgcrypto";

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  message text not null default '',
  timestamp timestamptz not null default now(),
  is_read boolean not null default false,
  icon text not null default 'comment',
  link jsonb
);

-- Optional: constrain icon values to known set
-- Comment out if you need more flexible values later
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'notifications_icon_check'
  ) then
    alter table public.notifications
      add constraint notifications_icon_check
      check (icon in ('lead','deadline','revision','feedback','payment','completed','comment'));
  end if;
end $$;

-- Index to speed up queries by recency
create index if not exists idx_notifications_timestamp_desc on public.notifications (timestamp desc);

-- Enable Row Level Security and permissive policies (adjust to your auth model)
alter table public.notifications enable row level security;

-- Allow anyone (anon & authenticated) to read notifications (adjust if needed)
create policy if not exists notifications_select on public.notifications
  for select using (true);

-- Allow authenticated to insert/update/delete (adjust if needed)
create policy if not exists notifications_insert on public.notifications
  for insert with check (true);

create policy if not exists notifications_update on public.notifications
  for update using (true) with check (true);

create policy if not exists notifications_delete on public.notifications
  for delete using (true);

-- Add to realtime publication
alter publication supabase_realtime add table public.notifications;
