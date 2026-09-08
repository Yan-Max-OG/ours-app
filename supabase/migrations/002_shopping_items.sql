create table if not exists public.shopping_items (like public.tasks including defaults);
alter table public.shopping_items add column if not exists private boolean not null default false;
alter table public.shopping_items enable row level security;
create index if not exists shopping_items_couple_category on public.shopping_items(couple_id, category);
create policy shopping_items_member_read on public.shopping_items for select to authenticated using(is_couple_member(couple_id) and (not private or creator_id=auth.uid()));
create trigger shopping_items_updated before update on public.shopping_items for each row execute function touch_updated_at();
