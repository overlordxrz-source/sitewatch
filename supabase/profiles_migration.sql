-- Run this in Supabase SQL Editor (add-on to migration.sql)

create table if not exists profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  subscription_status     text not null default 'trialing'
                            check (subscription_status in ('trialing','active','canceled','past_due','unpaid')),
  trial_ends_at           timestamptz not null default (now() + interval '7 days'),
  created_at              timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Service role manages profiles"
  on profiles for all with check (true);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
