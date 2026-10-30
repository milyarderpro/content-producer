import { localQuery } from './helpers/local-query.js';
import { describe, expect, it } from 'vitest';

describe('Phase 3 posts and post metrics', () => {
  it('enforces post lifecycle, scope, metrics, indexes, and private privileges', () => {
    const suffix = `${process.pid}${Date.now()}`;

    expect(() =>
      localQuery(`
        do $$
        declare
          owner_one uuid := extensions.gen_random_uuid();
          owner_two uuid := extensions.gen_random_uuid();
          workspace_one bigint;
          workspace_two bigint;
          page_one bigint;
          page_two bigint;
          ledger_one bigint;
          ledger_two bigint;
          plan_one bigint;
          plan_two bigint;
          item_one bigint;
          item_two bigint;
          post_one bigint;
          post_two bigint;
          capture_time timestamptz := '2026-10-08 13:00:00+00';
          schedule_time timestamptz := '2026-10-09 13:00:00+00';
          payload jsonb := '{"schema_version":1,"hook":"Did you know?","body":{},"cta":"Share this.","canva_copy":"Did you know? Share this.","caption":"Trivia.","hashtags":[],"render_style":"plain_lines","text_metrics":{}}'::jsonb;
          generation_snapshot jsonb := '{"config_schema_version":1,"fact_count":{},"fact_count_applied":5,"fact_count_override":false,"text_budget":{},"fact_reuse_scope":"workspace_unique","profile_key":"fast_trivia","render_style":"plain_lines","target_markets":["US"],"locale":"en-US"}'::jsonb;
          system_one jsonb := '{"schema_version":1,"gate_version":1,"evaluated_at":"2026-10-08T13:00:00Z","evaluator":"server","post_revision":1,"content_hash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","config_version":1,"renderer_version":1,"overall_status":"passed","checks":[{"id":"core.schema.valid","severity":"blocking","status":"passed","expected":"valid","actual":"valid","evidence":["core.schema"]}]}'::jsonb;
          editorial_one jsonb := '{"schema_version":1,"rubric_version":1,"evaluated_at":"2026-10-08T13:00:00Z","evaluator":"chatgpt","post_revision":1,"content_hash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","overall_status":"pass","criteria":[{"id":"core.meaning","severity":"critical","status":"pass","note":"Supported.","evidence_paths":["body.facts"]}],"risk_flags":[]}'::jsonb;
          system_two jsonb := '{"schema_version":1,"gate_version":1,"evaluated_at":"2026-10-08T13:00:00Z","evaluator":"server","post_revision":1,"content_hash":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","config_version":1,"renderer_version":1,"overall_status":"passed","checks":[{"id":"core.schema.valid","severity":"blocking","status":"passed","expected":"valid","actual":"valid","evidence":["core.schema"]}]}'::jsonb;
          editorial_two jsonb := '{"schema_version":1,"rubric_version":1,"evaluated_at":"2026-10-08T13:00:00Z","evaluator":"chatgpt","post_revision":1,"content_hash":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","overall_status":"pass","criteria":[{"id":"core.meaning","severity":"critical","status":"pass","note":"Supported.","evidence_paths":["body.facts"]}],"risk_flags":[]}'::jsonb;
        begin
          insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
          values
            ('00000000-0000-0000-0000-000000000000', owner_one, 'authenticated', 'authenticated', 'phase3-post-owner-one-${suffix}@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
            ('00000000-0000-0000-0000-000000000000', owner_two, 'authenticated', 'authenticated', 'phase3-post-owner-two-${suffix}@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
          insert into public.workspaces (owner_user_id, name, slug) values (owner_one, 'Post one', 'phase3-post-one-${suffix}') returning id into workspace_one;
          insert into public.workspaces (owner_user_id, name, slug) values (owner_two, 'Post two', 'phase3-post-two-${suffix}') returning id into workspace_two;
          insert into public.pages (workspace_id, name, slug) values (workspace_one, 'Post page one', 'phase3-post-page-one-${suffix}') returning id into page_one;
          insert into public.pages (workspace_id, name, slug) values (workspace_two, 'Post page two', 'phase3-post-page-two-${suffix}') returning id into page_two;
          insert into public.page_niche_configs (workspace_id, page_id, niche_key, config) values (workspace_one, page_one, 'trivia', internal.default_trivia_config_v1());
          insert into public.page_niche_configs (workspace_id, page_id, niche_key, config) values (workspace_two, page_two, 'trivia', internal.default_trivia_config_v1());
          insert into internal.operation_ledger (workspace_id, actor_user_id, operation_key, operation_name, request_schema_version, request_hash)
          values (workspace_one, owner_one, extensions.gen_random_uuid(), 'create_post.v1', 1, repeat('a', 64)) returning id into ledger_one;
          insert into internal.operation_ledger (workspace_id, actor_user_id, operation_key, operation_name, request_schema_version, request_hash)
          values (workspace_two, owner_two, extensions.gen_random_uuid(), 'create_post.v1', 1, repeat('b', 64)) returning id into ledger_two;
          insert into public.content_plans (workspace_id, page_id, niche_key, created_by_operation_id, requested_count)
          values (workspace_one, page_one, 'trivia', ledger_one, 1) returning id into plan_one;
          insert into public.content_plans (workspace_id, page_id, niche_key, created_by_operation_id, requested_count)
          values (workspace_two, page_two, 'trivia', ledger_two, 1) returning id into plan_two;
          insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position)
          values (workspace_one, plan_one, page_one, 'trivia', 1) returning id into item_one;
          insert into public.content_plan_items (workspace_id, plan_id, page_id, niche_key, position)
          values (workspace_two, plan_two, page_two, 'trivia', 1) returning id into item_two;

          insert into public.posts (workspace_id, page_id, niche_key, content_plan_item_id, created_by_operation_id, format_key, topic_key, interaction_goal, status, quality_status, approval_snapshot, ready_at, published_at, content_payload, generation_snapshot, system_checks, editorial_checks, content_hash)
          values (workspace_one, page_one, 'trivia', item_one, ledger_one, 'single_subject_fast', 'animals', 'share', 'posted', 'passed', '{}'::jsonb, now(), now(), payload, generation_snapshot, system_one, editorial_one, repeat('c', 64)) returning id into post_one;
          insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, content_hash)
          values (workspace_two, page_two, 'trivia', 'single_subject_fast', 'animals', 'share', payload, generation_snapshot, repeat('d', 64)) returning id into post_two;
          if (select revision from public.posts where id = post_one) <> 1 then raise exception 'post revision did not start at one'; end if;

          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, content_hash) values (workspace_one, page_two, 'trivia', 'single_subject_fast', 'animals', 'share', payload, generation_snapshot, repeat('e', 64)); raise exception 'cross-workspace page accepted'; exception when foreign_key_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, content_plan_item_id, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', item_two, 'single_subject_fast', 'animals', 'share', payload, generation_snapshot, repeat('e', 64)); raise exception 'cross-workspace plan item accepted'; exception when foreign_key_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, created_by_operation_id, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', ledger_two, 'single_subject_fast', 'animals', 'share', payload, generation_snapshot, repeat('e', 64)); raise exception 'cross-workspace post audit accepted'; exception when foreign_key_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'single_subject_fast', 'animals', 'share', payload, generation_snapshot, repeat('A', 64)); raise exception 'uppercase hash accepted'; exception when check_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, content_hash, revision) values (workspace_one, page_one, 'trivia', 'single_subject_fast', 'animals', 'share', payload, generation_snapshot, repeat('e', 64), 0); raise exception 'zero revision accepted'; exception when check_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'plain_lines', 'animals', 'share', '[]'::jsonb, '{}'::jsonb, repeat('e', 64)); raise exception 'array content payload accepted'; exception when check_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'plain_lines', 'animals', 'share', '{}'::jsonb, '[]'::jsonb, repeat('e', 64)); raise exception 'array generation snapshot accepted'; exception when check_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, system_checks, content_hash) values (workspace_one, page_one, 'trivia', 'plain_lines', 'animals', 'share', '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, repeat('e', 64)); raise exception 'array system checks accepted'; exception when check_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, editorial_checks, content_hash) values (workspace_one, page_one, 'trivia', 'plain_lines', 'animals', 'share', '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, repeat('e', 64)); raise exception 'array editorial checks accepted'; exception when check_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, approval_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'plain_lines', 'animals', 'share', '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, repeat('e', 64)); raise exception 'array approval snapshot accepted'; exception when check_violation then null; end;

          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, status, quality_status, ready_at, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'plain_lines', 'animals', 'share', 'ready', 'passed', now(), '{}'::jsonb, '{}'::jsonb, repeat('e', 64)); raise exception 'ready without approval accepted'; exception when check_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, status, quality_status, approval_snapshot, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'plain_lines', 'animals', 'share', 'ready', 'passed', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, repeat('e', 64)); raise exception 'ready without timestamp accepted'; exception when check_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, status, quality_status, approval_snapshot, ready_at, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'plain_lines', 'animals', 'share', 'posted', 'passed', '{}'::jsonb, now(), '{}'::jsonb, '{}'::jsonb, repeat('e', 64)); raise exception 'posted without publication accepted'; exception when check_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, status, quality_status, approval_snapshot, ready_at, published_at, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'plain_lines', 'animals', 'share', 'archived', 'passed', '{}'::jsonb, now(), now(), '{}'::jsonb, '{}'::jsonb, repeat('e', 64)); raise exception 'archived without timestamp accepted'; exception when check_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, status, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'plain_lines', 'animals', 'share', 'discarded', '{}'::jsonb, '{}'::jsonb, repeat('e', 64)); raise exception 'discarded without timestamp accepted'; exception when check_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, status, discarded_at, published_at, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'plain_lines', 'animals', 'share', 'discarded', now(), now(), '{}'::jsonb, '{}'::jsonb, repeat('e', 64)); raise exception 'discarded publication accepted'; exception when check_violation then null; end;
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, published_url, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'plain_lines', 'animals', 'share', 'http://example.test/post', '{}'::jsonb, '{}'::jsonb, repeat('e', 64)); raise exception 'non-HTTPS URL accepted'; exception when check_violation then null; end;

          begin insert into public.posts (workspace_id, page_id, niche_key, content_plan_item_id, format_key, topic_key, interaction_goal, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', item_one, 'single_subject_fast', 'animals', 'share', payload, generation_snapshot, repeat('e', 64)); raise exception 'duplicate active plan item accepted'; exception when unique_violation then null; end;
          insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, scheduled_at, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'single_subject_fast', 'animals', 'share', schedule_time, payload, generation_snapshot, repeat('e', 64));
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, scheduled_at, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'single_subject_fast', 'animals', 'share', schedule_time, payload, generation_snapshot, repeat('f', 64)); raise exception 'duplicate active post schedule accepted'; exception when unique_violation then null; end;
          insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, platform_post_id, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'single_subject_fast', 'animals', 'share', 'facebook-1', payload, generation_snapshot, repeat('e', 64));
          begin insert into public.posts (workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal, platform_post_id, content_payload, generation_snapshot, content_hash) values (workspace_one, page_one, 'trivia', 'single_subject_fast', 'animals', 'share', 'facebook-1', payload, generation_snapshot, repeat('f', 64)); raise exception 'duplicate platform identity accepted'; exception when unique_violation then null; end;

          insert into public.post_metrics (workspace_id, page_id, post_id, created_by_operation_id, captured_at, views) values (workspace_one, page_one, post_one, ledger_one, capture_time, 0);
          declare metric_error text;
          begin
            insert into public.post_metrics (workspace_id, page_id, post_id, captured_at, views) values (workspace_two, page_two, post_two, capture_time + interval '6 minutes', 1);
            raise exception 'draft post metrics accepted';
          exception when check_violation then
            get stacked diagnostics metric_error = message_text;
            if metric_error <> 'POST_METRICS_POST_NOT_PUBLISHED' then raise; end if;
          end;
          update public.posts
          set status = 'ready', quality_status = 'passed', approval_snapshot = '{}'::jsonb, ready_at = now(), system_checks = system_two, editorial_checks = editorial_two
          where id = post_two;
          declare metric_error text;
          begin
            insert into public.post_metrics (workspace_id, page_id, post_id, captured_at, views) values (workspace_two, page_two, post_two, capture_time + interval '7 minutes', 1);
            raise exception 'ready post metrics accepted';
          exception when check_violation then
            get stacked diagnostics metric_error = message_text;
            if metric_error <> 'POST_METRICS_POST_NOT_PUBLISHED' then raise; end if;
          end;
          update public.posts set status = 'discarded', discarded_at = now() where id = post_two;
          declare metric_error text;
          begin
            insert into public.post_metrics (workspace_id, page_id, post_id, captured_at, views) values (workspace_two, page_two, post_two, capture_time + interval '8 minutes', 1);
            raise exception 'discarded post metrics accepted';
          exception when check_violation then
            get stacked diagnostics metric_error = message_text;
            if metric_error <> 'POST_METRICS_POST_NOT_PUBLISHED' then raise; end if;
          end;
          update public.posts
          set status = 'archived', discarded_at = null, published_at = now(), archived_at = now()
          where id = post_two;
          insert into public.post_metrics (workspace_id, page_id, post_id, captured_at, views)
          values (workspace_two, page_two, post_two, capture_time + interval '9 minutes', 1);
          begin insert into public.post_metrics (workspace_id, page_id, post_id, captured_at, views) values (workspace_one, page_one, post_one, capture_time + interval '1 minute', -1); raise exception 'negative metrics accepted'; exception when check_violation then null; end;
          begin insert into public.post_metrics (workspace_id, page_id, post_id, captured_at) values (workspace_one, page_one, post_one, capture_time + interval '2 minutes'); raise exception 'empty metrics accepted'; exception when check_violation then null; end;
          begin insert into public.post_metrics (workspace_id, page_id, post_id, captured_at, views, metrics_payload) values (workspace_one, page_one, post_one, capture_time + interval '3 minutes', 0, '[]'::jsonb); raise exception 'array metrics payload accepted'; exception when check_violation then null; end;
          begin insert into public.post_metrics (workspace_id, page_id, post_id, captured_at, views) values (workspace_one, page_one, post_one, capture_time, 1); raise exception 'duplicate metric capture accepted'; exception when unique_violation then null; end;
          begin insert into public.post_metrics (workspace_id, page_id, post_id, captured_at, views) values (workspace_one, page_one, post_two, capture_time + interval '4 minutes', 1); raise exception 'cross-workspace metric post accepted'; exception when foreign_key_violation then null; end;
          begin insert into public.post_metrics (workspace_id, page_id, post_id, created_by_operation_id, captured_at, views) values (workspace_one, page_one, post_one, ledger_two, capture_time + interval '5 minutes', 1); raise exception 'cross-workspace metric audit accepted'; exception when foreign_key_violation then null; end;

          if not (select relrowsecurity from pg_class where oid = 'public.posts'::regclass) then raise exception 'posts RLS disabled'; end if;
          if not (select relrowsecurity from pg_class where oid = 'public.post_metrics'::regclass) then raise exception 'post metrics RLS disabled'; end if;
          if has_table_privilege('authenticated', 'public.posts', 'select') or has_table_privilege('service_role', 'public.post_metrics', 'select') then raise exception 'caller table privilege'; end if;
          if to_regclass('public.posts_page_status_created_at_idx') is null or to_regclass('public.posts_page_niche_format_idx') is null or to_regclass('public.posts_page_niche_topic_idx') is null or to_regclass('public.posts_page_schedule_unique_key') is null or to_regclass('public.posts_active_plan_item_unique_key') is null or to_regclass('public.posts_platform_identity_unique_key') is null or to_regclass('public.posts_published_at_idx') is null or to_regclass('public.posts_content_hash_idx') is null then raise exception 'post index missing'; end if;
          if to_regclass('public.post_metrics_post_id_captured_at_idx') is null or to_regclass('public.post_metrics_page_id_captured_at_idx') is null then raise exception 'post metrics index missing'; end if;

          delete from public.post_metrics where workspace_id in (workspace_one, workspace_two);
          delete from public.posts where workspace_id in (workspace_one, workspace_two);
          delete from public.content_plan_items where id in (item_one, item_two);
          delete from public.content_plans where id in (plan_one, plan_two);
          delete from internal.operation_ledger where id in (ledger_one, ledger_two);
          delete from public.page_niche_configs where page_id in (page_one, page_two);
          delete from public.pages where id in (page_one, page_two);
          delete from public.workspaces where id in (workspace_one, workspace_two);
          delete from auth.users where id in (owner_one, owner_two);
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);
});
