create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

alter table public.map_photos
  add column if not exists album_id uuid references public.albums(id) on delete set null;

create index if not exists map_photos_album_id_idx
  on public.map_photos (album_id);

alter table public.albums enable row level security;

create policy "Public can read albums"
  on public.albums for select to anon, authenticated using (true);

create policy "Public can create albums"
  on public.albums for insert to anon, authenticated with check (true);

create policy "Public can update albums"
  on public.albums for update to anon, authenticated using (true) with check (true);

create policy "Public can delete albums"
  on public.albums for delete to anon, authenticated using (true);
