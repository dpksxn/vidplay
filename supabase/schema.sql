-- vidplay schema
-- Run in Supabase SQL editor (or `supabase db push` if using CLI).

-- =========================================================================
-- generations: one row per image-to-video job
-- =========================================================================
create table if not exists public.generations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  prompt        text not null,
  image_path    text not null,                -- storage path in `inputs` bucket
  image_url     text not null,                -- public URL of the input image
  video_url     text,                         -- final video URL once ready
  status        text not null default 'queued' check (status in ('queued','processing','succeeded','failed','canceled')),
  error         text,
  replicate_id  text unique,                  -- Replicate prediction id
  model         text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists generations_user_idx       on public.generations (user_id, created_at desc);
create index if not exists generations_replicate_idx  on public.generations (replicate_id);

-- updated_at trigger
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists generations_touch on public.generations;
create trigger generations_touch
before update on public.generations
for each row execute function public.touch_updated_at();

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.generations enable row level security;

drop policy if exists "users read own generations"    on public.generations;
drop policy if exists "users insert own generations"  on public.generations;
drop policy if exists "users update own generations"  on public.generations;
drop policy if exists "users delete own generations"  on public.generations;

create policy "users read own generations"
  on public.generations for select
  using (auth.uid() = user_id);

create policy "users insert own generations"
  on public.generations for insert
  with check (auth.uid() = user_id);

create policy "users update own generations"
  on public.generations for update
  using (auth.uid() = user_id);

create policy "users delete own generations"
  on public.generations for delete
  using (auth.uid() = user_id);

-- =========================================================================
-- Storage buckets
-- =========================================================================
-- Input images (public-read so Replicate can fetch)
insert into storage.buckets (id, name, public)
values ('inputs', 'inputs', true)
on conflict (id) do nothing;

-- Generated videos (public-read so the player can stream)
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- Storage policies: only owner can upload/delete; reads are public
drop policy if exists "owner uploads to inputs"   on storage.objects;
drop policy if exists "owner deletes from inputs" on storage.objects;
drop policy if exists "owner uploads to videos"   on storage.objects;
drop policy if exists "owner deletes from videos" on storage.objects;

create policy "owner uploads to inputs"
  on storage.objects for insert
  with check (bucket_id = 'inputs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "owner deletes from inputs"
  on storage.objects for delete
  using (bucket_id = 'inputs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "owner uploads to videos"
  on storage.objects for insert
  with check (bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "owner deletes from videos"
  on storage.objects for delete
  using (bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]);
