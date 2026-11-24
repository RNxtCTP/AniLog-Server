-- ============================================================================
-- AniLog — Supabase Database Schema, RLS Policies, Triggers & Storage
-- วิธีใช้: คัดลอกคำสั่งทั้งหมดไปวางใน Supabase Dashboard > SQL Editor แล้วกด Run
-- ============================================================================

-- 1. สร้างตาราง profiles สำหรับเก็บข้อมูลโปรไฟล์ผู้ใช้ (เชื่อมกับ auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default 'ผู้ใช้ใหม่',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. สร้างตาราง media_items สำหรับเก็บรายการอนิเมะ / มังงะ / มังฮวา ของแต่ละบัญชี
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  thai_title text not null default '',
  type text not null default 'anime' check (type in ('anime', 'manga', 'manhwa')),
  status text not null default 'watching' check (status in ('watching', 'completed', 'on_hold', 'dropped', 'planned')),
  progress integer not null default 0 check (progress >= 0),
  total integer not null default 0 check (total >= 0),
  score numeric(3, 1) not null default 0 check (score >= 0 and score <= 10),
  genres text[] not null default '{}',
  review text not null default '',
  cover_gradient text not null default 'indigo',
  cover_image text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- สร้าง Index เพื่อช่วยให้ดึงข้อมูลของแต่ละผู้ใช้ได้รวดเร็วขึ้น
create index if not exists idx_media_items_user_updated
  on public.media_items (user_id, updated_at desc);

-- 3. เปิดใช้งาน Row Level Security (RLS) เพื่อป้องกันไม่ให้ผู้อื่นเข้าถึงข้อมูลของเรา
alter table public.profiles enable row level security;
alter table public.media_items enable row level security;

-- 4. นโยบายความปลอดภัย (Policies) สำหรับตาราง profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 5. นโยบายความปลอดภัย (Policies) สำหรับตาราง media_items
drop policy if exists "Users can view own media items" on public.media_items;
create policy "Users can view own media items"
  on public.media_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own media items" on public.media_items;
create policy "Users can insert own media items"
  on public.media_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own media items" on public.media_items;
create policy "Users can update own media items"
  on public.media_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own media items" on public.media_items;
create policy "Users can delete own media items"
  on public.media_items for delete
  using (auth.uid() = user_id);

-- 6. Trigger สร้างโปรไฟล์อัตโนมัติทันทีที่มีการสมัครสมาชิกใหม่ (auth.users)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. (ทางเลือก) สร้าง Storage Bucket ชื่อ "covers" สำหรับเก็บรูปปกแบบไฟล์จริง
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

-- สิทธิ์ดูรูปปกแบบสาธารณะ และอนุญาตให้ผู้ใช้ที่ล็อกอินอัปโหลด/แก้ไขเฉพาะโฟลเดอร์ของตัวเอง
drop policy if exists "Public can view cover images" on storage.objects;
create policy "Public can view cover images"
  on storage.objects for select
  using (bucket_id = 'covers');

drop policy if exists "Users can upload own covers" on storage.objects;
create policy "Users can upload own covers"
  on storage.objects for insert
  with check (
    bucket_id = 'covers'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own covers" on storage.objects;
create policy "Users can delete own covers"
  on storage.objects for delete
  using (
    bucket_id = 'covers'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );