create or replace function internal.post_lock_target_v1(w bigint,id uuid,new_time timestamptz default null,slots boolean default false) returns public.posts
language plpgsql volatile security invoker set search_path='' as $$
declare result public.posts; page_public uuid;
begin
 select pp.* into result from public.posts pp where pp.workspace_id=w and pp.public_id=$2;
 if result.id is null then raise exception using errcode='P0001',message='POST_NOT_FOUND'; end if;
 select pg.public_id into page_public from public.pages pg where pg.id=result.page_id and pg.workspace_id=w;
 perform internal.trivia_lock_page_v1(w,page_public,false);
 select pp.* into result from public.posts pp where pp.workspace_id=w and pp.public_id=$2;
 if slots then perform internal.post_lock_slots_v1(result.page_id,result.scheduled_at,new_time); end if;
 if result.content_plan_item_id is not null then
   perform 1 from public.content_plans cp where cp.id=(select ci.plan_id from public.content_plan_items ci where ci.id=result.content_plan_item_id) and cp.workspace_id=w for update;
   perform 1 from public.content_plan_items ci where ci.id=result.content_plan_item_id and ci.workspace_id=w for update;
 end if;
 select pp.* into result from public.posts pp where pp.workspace_id=w and pp.public_id=$2 for update;
 return result;
end; $$;
