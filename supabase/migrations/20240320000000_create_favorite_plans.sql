-- Create favorite_plans table
create table if not exists public.favorite_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  travelers integer not null,
  transport_type text not null,
  flight_details jsonb,
  car_route jsonb,
  hotel_included boolean default false,
  car_rental boolean default false,
  selected_places text[],
  plan_html text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.favorite_plans enable row level security;

-- Create policies
create policy "Users can view their own favorite plans"
  on public.favorite_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert their own favorite plans"
  on public.favorite_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own favorite plans"
  on public.favorite_plans for update
  using (auth.uid() = user_id);

create policy "Users can delete their own favorite plans"
  on public.favorite_plans for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_favorite_plans_updated_at
  before update on public.favorite_plans
  for each row
  execute function public.handle_updated_at(); 