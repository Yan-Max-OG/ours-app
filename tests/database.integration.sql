-- Run against a local/test Supabase database AFTER migrations, as postgres.
-- Transaction rolls all fixture data back. Never use production data as fixtures.
begin;
insert into users(id,telegram_id,first_name) values
('10000000-0000-4000-8000-000000000001','test-a','A'),
('10000000-0000-4000-8000-000000000002','test-b','B'),
('10000000-0000-4000-8000-000000000003','test-c','C');
select create_space('10000000-0000-4000-8000-000000000001',repeat('a',64));
select accept_invite('10000000-0000-4000-8000-000000000002',repeat('a',64));
do $$begin
if (select count(*) from couple_members where active and user_id::text like '10000000-%')<>2 then raise exception 'pairing failed';end if;
begin perform accept_invite('10000000-0000-4000-8000-000000000003',repeat('a',64));raise exception 'test: reuse accepted';exception when others then if SQLERRM='test: reuse accepted' then raise;end if;end;
begin perform create_space('10000000-0000-4000-8000-000000000002',repeat('b',64));raise exception 'test: extra pair accepted';exception when others then if SQLERRM='test: extra pair accepted' then raise;end if;end;
end$$;
insert into tasks(couple_id,creator_id,title) select couple_id,user_id,'Test task' from couple_members where user_id='10000000-0000-4000-8000-000000000001';
update tasks set status='completed' where title='Test task';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$begin if exists(select 1 from tasks where title='Test task') then raise exception 'cross-couple read';end if;end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$begin if not exists(select 1 from tasks where title='Test task' and status='completed') then raise exception 'own task unavailable';end if;if exists(select 1 from time_capsules) then raise exception 'direct sealed access';end if;end$$;
reset role;
select disconnect_space('10000000-0000-4000-8000-000000000001');
do $$begin if exists(select 1 from couple_members where active and user_id::text like '10000000-%') then raise exception 'disconnect incomplete';end if;end$$;
delete from tasks where title='Test task';
rollback;
