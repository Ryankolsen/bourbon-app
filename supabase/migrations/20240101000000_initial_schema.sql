-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────
create table public.profiles (
  id           uuid references auth.users on delete cascade not null primary key,
  username     text unique,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- BOURBONS (master list)
-- ─────────────────────────────────────────
create table public.bourbons (
  id            uuid default gen_random_uuid() primary key,
  name          text not null,
  distillery    text,
  mashbill      text,
  age_statement integer,       -- in years; null = NAS
  proof         numeric(5,1),
  type          text,          -- bourbon, rye, wheat, etc.
  msrp          numeric(8,2),
  image_url     text,
  description   text,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

-- ─────────────────────────────────────────
-- USER COLLECTION
-- ─────────────────────────────────────────
create table public.user_collection (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references public.profiles(id) on delete cascade not null,
  bourbon_id        uuid references public.bourbons(id) on delete cascade not null,
  purchase_price    numeric(8,2),
  purchase_date     date,
  purchase_location text,
  bottle_status     text default 'sealed'
                    check (bottle_status in ('sealed', 'open', 'empty')),
  notes             text,
  created_at        timestamptz default now() not null,
  unique (user_id, bourbon_id)
);

-- ─────────────────────────────────────────
-- USER WISHLIST
-- ─────────────────────────────────────────
create table public.user_wishlist (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  bourbon_id uuid references public.bourbons(id) on delete cascade not null,
  priority   integer default 5 check (priority between 1 and 10),
  notes      text,
  created_at timestamptz default now() not null,
  unique (user_id, bourbon_id)
);

-- ─────────────────────────────────────────
-- TASTINGS
-- ─────────────────────────────────────────
create table public.tastings (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  bourbon_id    uuid references public.bourbons(id) on delete cascade not null,
  collection_id uuid references public.user_collection(id) on delete set null,
  rating        numeric(3,1) check (rating between 0 and 100),
  nose          text,
  palate        text,
  finish        text,
  overall_notes text,
  tasted_at     timestamptz default now() not null,
  created_at    timestamptz default now() not null
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.bourbons        enable row level security;
alter table public.user_collection enable row level security;
alter table public.user_wishlist   enable row level security;
alter table public.tastings        enable row level security;

-- Profiles: users can read any profile, only update their own
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Bourbons: readable by all authenticated users
create policy "Bourbons are viewable by authenticated users"
  on public.bourbons for select
  using (auth.role() = 'authenticated');

-- Collection: private to each user
create policy "Users manage own collection"
  on public.user_collection for all
  using (auth.uid() = user_id);

-- Wishlist: private to each user
create policy "Users manage own wishlist"
  on public.user_wishlist for all
  using (auth.uid() = user_id);

-- Tastings: private to each user
create policy "Users manage own tastings"
  on public.tastings for all
  using (auth.uid() = user_id);
