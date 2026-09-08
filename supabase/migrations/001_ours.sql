create extension if not exists pgcrypto;
create table public.users(id uuid primary key default gen_random_uuid(),telegram_id text not null unique,first_name text not null,photo_url text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.couples(id uuid primary key default gen_random_uuid(),name text not null default 'Our space',start_date date not null default current_date,theme text not null default 'SAGE',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.couple_members(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,user_id uuid not null references users on delete cascade,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(couple_id,user_id));
create unique index one_active_couple on couple_members(user_id) where active;
create index members_by_couple on couple_members(couple_id) where active;
create table public.invites(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,token_hash text not null unique,expires_at timestamptz not null default now()+interval '48 hours',used_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.notification_preferences(user_id uuid primary key references users on delete cascade,notifications boolean not null default false,quiet_start time not null default '22:00',quiet_end time not null default '08:00',timezone text not null default 'Europe/Moscow',mood_visibility text not null default 'after_checkin' check(mood_visibility in('after_checkin','always','private')),reduced_motion boolean not null default false,xp_enabled boolean not null default true,language text not null default 'en',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create function public.touch_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
create function public.is_couple_member(cid uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from couple_members where couple_id=cid and user_id=auth.uid() and active)$$;
-- Pair mutations are service-only RPCs. Advisory user locks + the active membership
-- index prevent cross-invite races; a row lock serializes a couple's final seat.
create function public.create_space(actor uuid,token_hash text) returns uuid language plpgsql security definer set search_path=public as $$declare cid uuid;begin perform pg_advisory_xact_lock(hashtextextended(actor::text,0));select couple_id into cid from couple_members where user_id=actor and active;if cid is null then insert into couples default values returning id into cid;insert into couple_members(couple_id,user_id) values(cid,actor);else perform 1 from couples where id=cid for update;if (select count(*) from couple_members where couple_id=cid and active)>=2 then raise exception 'This space already has two people';end if;end if;update invites set used_at=now() where couple_id=cid and used_at is null;insert into invites(couple_id,creator_id,token_hash) values(cid,actor,token_hash);return cid;end$$;
create function public.accept_invite(actor uuid,hashed_token text) returns uuid language plpgsql security definer set search_path=public as $$declare inv invites%rowtype;begin perform pg_advisory_xact_lock(hashtextextended(actor::text,0));select * into inv from invites where token_hash=hashed_token;if inv.id is null then raise exception 'Invitation is invalid';end if;perform 1 from couples where id=inv.couple_id for update;select * into inv from invites where id=inv.id for update;if inv.used_at is not null or inv.expires_at<=now() then raise exception 'Invitation expired or already used';end if;if inv.creator_id=actor then raise exception 'Share this invitation with your person';end if;if exists(select 1 from couple_members where user_id=actor and active) then raise exception 'You already belong to a space';end if;if not exists(select 1 from couple_members where couple_id=inv.couple_id and user_id=inv.creator_id and active) or (select count(*) from couple_members where couple_id=inv.couple_id and active)<>1 then raise exception 'This space cannot accept an invitation';end if;insert into couple_members(couple_id,user_id) values(inv.couple_id,actor);update invites set used_at=now() where couple_id=inv.couple_id and used_at is null;return inv.couple_id;end$$;
create function public.disconnect_space(actor uuid) returns void language plpgsql security definer set search_path=public as $$declare cid uuid;begin perform pg_advisory_xact_lock(hashtextextended(actor::text,0));select couple_id into cid from couple_members where user_id=actor and active;if cid is not null then perform 1 from couples where id=cid for update;update couple_members set active=false where couple_id=cid;update invites set used_at=now() where couple_id=cid and used_at is null;end if;end$$;
create table public.rate_limits(key text primary key,count int not null default 1,window_start timestamptz not null default now());
create function public.check_rate(rate_key text,max_requests int,window_seconds int) returns boolean language plpgsql security definer set search_path=public as $$declare n int;begin insert into rate_limits(key) values(rate_key) on conflict(key) do update set count=case when rate_limits.window_start<now()-make_interval(secs=>window_seconds) then 1 else rate_limits.count+1 end,window_start=case when rate_limits.window_start<now()-make_interval(secs=>window_seconds) then now() else rate_limits.window_start end returning count into n;return n<=max_requests;end$$;

create table public.tasks(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index tasks_couple_date on public.tasks(couple_id,date);
create index tasks_couple_updated on public.tasks(couple_id,updated_at);

create table public.rituals(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index rituals_couple_date on public.rituals(couple_id,date);
create index rituals_couple_updated on public.rituals(couple_id,updated_at);

create table public.gratitudes(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index gratitudes_couple_date on public.gratitudes(couple_id,date);
create index gratitudes_couple_updated on public.gratitudes(couple_id,updated_at);

create table public.love_notes(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index love_notes_couple_date on public.love_notes(couple_id,date);
create index love_notes_couple_updated on public.love_notes(couple_id,updated_at);

create table public.places(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index places_couple_date on public.places(couple_id,date);
create index places_couple_updated on public.places(couple_id,updated_at);

create table public.events(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index events_couple_date on public.events(couple_id,date);
create index events_couple_updated on public.events(couple_id,updated_at);

create table public.memories(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index memories_couple_date on public.memories(couple_id,date);
create index memories_couple_updated on public.memories(couple_id,updated_at);

create table public.time_capsules(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index time_capsules_couple_date on public.time_capsules(couple_id,date);
create index time_capsules_couple_updated on public.time_capsules(couple_id,updated_at);

create table public.bucket_items(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index bucket_items_couple_date on public.bucket_items(couple_id,date);
create index bucket_items_couple_updated on public.bucket_items(couple_id,updated_at);

create table public.goals(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index goals_couple_date on public.goals(couple_id,date);
create index goals_couple_updated on public.goals(couple_id,updated_at);

create table public.mood_entries(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index mood_entries_couple_date on public.mood_entries(couple_id,date);
create index mood_entries_couple_updated on public.mood_entries(couple_id,updated_at);

create table public.weekly_pulses(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index weekly_pulses_couple_date on public.weekly_pulses(couple_id,date);
create index weekly_pulses_couple_updated on public.weekly_pulses(couple_id,updated_at);

create table public.question_answers(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index question_answers_couple_date on public.question_answers(couple_id,date);
create index question_answers_couple_updated on public.question_answers(couple_id,updated_at);

create table public.this_or_that_answers(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index this_or_that_answers_couple_date on public.this_or_that_answers(couple_id,date);
create index this_or_that_answers_couple_updated on public.this_or_that_answers(couple_id,updated_at);

create table public.wishlist_items(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null check(length(title) between 1 and 200),body text not null default '' check(length(body)<=10000),category text not null default 'for us',status text not null default 'open' check(status in('open','completed')),assigned_to text,date date,unlock_at timestamptz,image text,private boolean not null default false,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index wishlist_items_couple_date on public.wishlist_items(couple_id,date);
create index wishlist_items_couple_updated on public.wishlist_items(couple_id,updated_at);

create unique index mood_once_daily on mood_entries(couple_id,creator_id,date);
create unique index question_once_daily on question_answers(couple_id,creator_id,date,category);
create unique index weekly_once on weekly_pulses(couple_id,creator_id,date,category);
create unique index game_once on this_or_that_answers(couple_id,creator_id,date,category);
create table public.task_checklist_items(id uuid primary key default gen_random_uuid(),task_id uuid not null references tasks on delete cascade,title text not null,completed boolean not null default false,position int not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.memory_photos(id uuid primary key default gen_random_uuid(),memory_id uuid not null references memories on delete cascade,storage_path text not null,position int not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.wishlists(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,creator_id uuid not null references users on delete cascade,title text not null default 'Little wishes',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table wishlist_items add column wishlist_id uuid references wishlists on delete cascade;
create table public.daily_questions(id uuid primary key default gen_random_uuid(),category text not null,prompt text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table question_answers add column question_id uuid references daily_questions;
create table public.weekly_pulse_answers(id uuid primary key default gen_random_uuid(),pulse_id uuid not null references weekly_pulses on delete cascade,user_id uuid not null references users on delete cascade,question text not null,answer text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.this_or_that_rounds(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,prompts jsonb not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table this_or_that_answers add column round_id uuid references this_or_that_rounds;
create table public.achievements(id text primary key,title text not null,threshold int not null,kind text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
insert into achievements(id,title,threshold,kind) values('first-memory','First memory',1,'memories'),('ten-memories','Memory keepers',10,'memories'),('first-date','Made time for us',1,'events'),('ten-places','Little explorers',10,'places'),('100-thanks','A hundred thank-yous',100,'gratitudes');
create table public.user_achievements(id uuid primary key default gen_random_uuid(),user_id uuid not null references users on delete cascade,achievement_id text not null references achievements,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,achievement_id));
create table public.couple_xp_events(id uuid primary key default gen_random_uuid(),couple_id uuid not null references couples on delete cascade,source_id uuid not null,kind text not null,points int not null check(points>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(source_id,kind));
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references users on delete cascade,couple_id uuid not null references couples on delete cascade,source_id uuid,kind text not null,body text not null,due_at timestamptz not null default now(),sent_at timestamptz,attempts int not null default 0,locked_until timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,source_id,kind));
create index notification_queue on notifications(due_at) where sent_at is null;
create function public.queue_activity() returns trigger language plpgsql security definer set search_path=public as $$begin
insert into couple_xp_events(couple_id,source_id,kind,points) values(new.couple_id,new.id,TG_TABLE_NAME,10) on conflict do nothing;
insert into notifications(user_id,couple_id,source_id,kind,body,due_at)
select cm.user_id,new.couple_id,new.id,TG_TABLE_NAME,case TG_TABLE_NAME when 'gratitudes' then 'A little thank-you is waiting in OURS.' when 'love_notes' then 'Someone is thinking of you. Open OURS.' when 'events' then 'A moment for the two of you is coming up.' else 'Something new in your shared space.' end,case when TG_TABLE_NAME='events' and new.date is not null then greatest(now(),new.date::timestamptz-interval '2 hours') else coalesce(new.unlock_at,now()) end
from couple_members cm join notification_preferences np on np.user_id=cm.user_id where cm.couple_id=new.couple_id and cm.active and cm.user_id<>new.creator_id and np.notifications and not new.private;
return new;end$$;
create function public.claim_notifications() returns setof notifications language plpgsql security definer set search_path=public as $$begin return query update notifications n set locked_until=now()+interval '5 minutes',attempts=attempts+1 where n.id in(select id from notifications where sent_at is null and due_at<=now() and (locked_until is null or locked_until<now()) and attempts<8 order by due_at for update skip locked limit 25) returning n.*;end$$;
alter table public.users enable row level security;
create trigger users_updated before update on public.users for each row execute function touch_updated_at();
alter table public.couples enable row level security;
create trigger couples_updated before update on public.couples for each row execute function touch_updated_at();
alter table public.couple_members enable row level security;
create trigger couple_members_updated before update on public.couple_members for each row execute function touch_updated_at();
alter table public.invites enable row level security;
create trigger invites_updated before update on public.invites for each row execute function touch_updated_at();
alter table public.notification_preferences enable row level security;
create trigger notification_preferences_updated before update on public.notification_preferences for each row execute function touch_updated_at();
alter table public.tasks enable row level security;
create trigger tasks_updated before update on public.tasks for each row execute function touch_updated_at();
alter table public.rituals enable row level security;
create trigger rituals_updated before update on public.rituals for each row execute function touch_updated_at();
alter table public.gratitudes enable row level security;
create trigger gratitudes_updated before update on public.gratitudes for each row execute function touch_updated_at();
alter table public.love_notes enable row level security;
create trigger love_notes_updated before update on public.love_notes for each row execute function touch_updated_at();
alter table public.places enable row level security;
create trigger places_updated before update on public.places for each row execute function touch_updated_at();
alter table public.events enable row level security;
create trigger events_updated before update on public.events for each row execute function touch_updated_at();
alter table public.memories enable row level security;
create trigger memories_updated before update on public.memories for each row execute function touch_updated_at();
alter table public.time_capsules enable row level security;
create trigger time_capsules_updated before update on public.time_capsules for each row execute function touch_updated_at();
alter table public.bucket_items enable row level security;
create trigger bucket_items_updated before update on public.bucket_items for each row execute function touch_updated_at();
alter table public.goals enable row level security;
create trigger goals_updated before update on public.goals for each row execute function touch_updated_at();
alter table public.mood_entries enable row level security;
create trigger mood_entries_updated before update on public.mood_entries for each row execute function touch_updated_at();
alter table public.weekly_pulses enable row level security;
create trigger weekly_pulses_updated before update on public.weekly_pulses for each row execute function touch_updated_at();
alter table public.question_answers enable row level security;
create trigger question_answers_updated before update on public.question_answers for each row execute function touch_updated_at();
alter table public.this_or_that_answers enable row level security;
create trigger this_or_that_answers_updated before update on public.this_or_that_answers for each row execute function touch_updated_at();
alter table public.wishlist_items enable row level security;
create trigger wishlist_items_updated before update on public.wishlist_items for each row execute function touch_updated_at();
alter table public.task_checklist_items enable row level security;
create trigger task_checklist_items_updated before update on public.task_checklist_items for each row execute function touch_updated_at();
alter table public.memory_photos enable row level security;
create trigger memory_photos_updated before update on public.memory_photos for each row execute function touch_updated_at();
alter table public.wishlists enable row level security;
create trigger wishlists_updated before update on public.wishlists for each row execute function touch_updated_at();
alter table public.daily_questions enable row level security;
create trigger daily_questions_updated before update on public.daily_questions for each row execute function touch_updated_at();
alter table public.weekly_pulse_answers enable row level security;
create trigger weekly_pulse_answers_updated before update on public.weekly_pulse_answers for each row execute function touch_updated_at();
alter table public.this_or_that_rounds enable row level security;
create trigger this_or_that_rounds_updated before update on public.this_or_that_rounds for each row execute function touch_updated_at();
alter table public.achievements enable row level security;
create trigger achievements_updated before update on public.achievements for each row execute function touch_updated_at();
alter table public.user_achievements enable row level security;
create trigger user_achievements_updated before update on public.user_achievements for each row execute function touch_updated_at();
alter table public.couple_xp_events enable row level security;
create trigger couple_xp_events_updated before update on public.couple_xp_events for each row execute function touch_updated_at();
alter table public.notifications enable row level security;
create trigger notifications_updated before update on public.notifications for each row execute function touch_updated_at();
alter table rate_limits enable row level security;
create policy member_read on tasks for select to authenticated using(is_couple_member(couple_id) and (not private or creator_id=auth.uid()));
create policy member_read on places for select to authenticated using(is_couple_member(couple_id) and (not private or creator_id=auth.uid()));
create policy member_read on memories for select to authenticated using(is_couple_member(couple_id) and (not private or creator_id=auth.uid()));
create policy member_read on bucket_items for select to authenticated using(is_couple_member(couple_id) and (not private or creator_id=auth.uid()));
create policy member_read on goals for select to authenticated using(is_couple_member(couple_id) and (not private or creator_id=auth.uid()));
create policy member_read on rituals for select to authenticated using(is_couple_member(couple_id) and (not private or creator_id=auth.uid()));
create trigger tasks_activity after insert on tasks for each row execute function queue_activity();
create trigger places_activity after insert on places for each row execute function queue_activity();
create trigger memories_activity after insert on memories for each row execute function queue_activity();
create trigger gratitudes_activity after insert on gratitudes for each row execute function queue_activity();
create trigger love_notes_activity after insert on love_notes for each row execute function queue_activity();
create trigger events_activity after insert on events for each row execute function queue_activity();
create trigger rituals_activity after insert on rituals for each row execute function queue_activity();

-- No client policies for sealed/reveal content or mutations: gateway only.
revoke all on all functions in schema public from public,anon,authenticated;
grant execute on function is_couple_member(uuid) to authenticated;
grant execute on all functions in schema public to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ours-photos','ours-photos',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
-- Storage is private; authenticated gateway issues short-lived download links.
-- Recurrence is a server transaction; two simultaneous completions cannot
-- materialize two copies because only an open -> completed transition fires.
create function public.repeat_completed_task() returns trigger language plpgsql security definer set search_path=public as $$declare next_day date;begin
if old.status='open' and new.status='completed' and new.details->>'recurring' in('daily','weekly','monthly') then
next_day=coalesce(new.date,current_date)+case new.details->>'recurring' when 'daily' then interval '1 day' when 'weekly' then interval '7 days' else interval '1 month' end;
insert into tasks(couple_id,creator_id,title,body,category,assigned_to,date,details) values(new.couple_id,new.creator_id,new.title,new.body,new.category,new.assigned_to,next_day,new.details-'completed_at');
end if;return new;end$$;
revoke all on function repeat_completed_task() from public,anon,authenticated;
create trigger recurring_task after update on tasks for each row execute function repeat_completed_task();
