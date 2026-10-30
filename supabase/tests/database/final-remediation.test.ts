import { localQuery as query } from './helpers/local-query.js';
import { describe, expect, it } from 'vitest';

describe('Phase 3 final remediation', () => {
  it('fails closed for trivia, evidence, timezone, market, and metrics contracts', () => {
    const suffix = `${process.pid}${Date.now()}`;
    expect(() =>
      query(`
        do $$
        declare
          user_id uuid := extensions.gen_random_uuid(); v_workspace_id bigint; v_page_id bigint; v_post_id bigint;
          config jsonb := internal.default_trivia_config_v1();
          hash text := repeat('a', 64);
          payload jsonb := '{"schema_version":1,"hook":"Did you know?","body":{},"cta":"Share this.","canva_copy":"Did you know? Share this.","caption":"Trivia.","hashtags":[],"render_style":"plain_lines","text_metrics":{}}';
          generation jsonb := '{"config_schema_version":1,"fact_count":{},"fact_count_applied":5,"fact_count_override":false,"text_budget":{},"fact_reuse_scope":"workspace_unique","profile_key":"fast_trivia","render_style":"plain_lines","target_markets":["US"],"locale":"en-US"}';
          system_evidence jsonb := '{"schema_version":1,"gate_version":1,"evaluated_at":"2026-10-08T13:00:00Z","evaluator":"server","post_revision":1,"content_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","config_version":1,"renderer_version":1,"overall_status":"passed","checks":[{"id":"core.schema.valid","severity":"blocking","status":"passed","expected":"valid","actual":"valid","evidence":["core.schema"]}]}';
          editorial_evidence jsonb := '{"schema_version":1,"rubric_version":1,"evaluated_at":"2026-10-08T13:00:00Z","evaluator":"chatgpt","evaluator_label":"reviewer","post_revision":1,"content_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","overall_status":"pass","criteria":[{"id":"core.meaning","severity":"critical","status":"pass","note":"Supported.","evidence_paths":["body.facts"]}],"risk_flags":[]}';
        begin
          if not internal.is_valid_trivia_config_v1(config) then raise exception 'canonical trivia config rejected'; end if;
          if internal.is_valid_trivia_config_v1(jsonb_set(config, '{format_weights,single_subject_fast}', '-1')) then raise exception 'negative weight accepted'; end if;
          if internal.is_valid_trivia_config_v1(jsonb_set(config, '{format_weights,single_subject_fast}', '101')) then raise exception 'oversized weight accepted'; end if;
          if internal.is_valid_trivia_config_v1(jsonb_set(config, '{format_weights,single_subject_fast}', '"35"')) then raise exception 'string weight accepted'; end if;
          if internal.is_valid_trivia_config_v1(jsonb_set(config, '{format_weights,single_subject_fast}', '35.5')) then raise exception 'decimal weight accepted'; end if;
          if internal.is_valid_trivia_config_v1(jsonb_set(config, '{format_weights,single_subject_fast}', '34')) then raise exception 'weight total accepted'; end if;
          if internal.is_valid_trivia_config_v1(jsonb_set(config, '{profiles,fast_trivia,fact_count_min}', '"7"')) then raise exception 'profile string accepted'; end if;
          if internal.is_valid_trivia_config_v1(jsonb_set(config, '{profiles,fast_trivia,fact_count_min}', 'null')) then raise exception 'profile null accepted'; end if;
          if internal.is_valid_trivia_config_v1(jsonb_set(config, '{profiles,fast_trivia,words_per_fact_min}', '8.5')) then raise exception 'profile decimal accepted'; end if;
          if internal.is_valid_trivia_config_v1(jsonb_set(config, '{profiles,fast_trivia,words_per_fact_min}', '12')) then raise exception 'profile inversion accepted'; end if;
          if internal.is_valid_trivia_config_v1(jsonb_set(config, '{fact_count,max}', '10')) then raise exception 'fact count accepted'; end if;
          if internal.is_valid_trivia_config_v1(jsonb_set(config, '{text_budget,canva_total_max_chars}', '601')) then raise exception 'budget ceiling accepted'; end if;
          if internal.is_valid_trivia_config_v1(jsonb_set(config, '{hashtags,max_count}', '6')) then raise exception 'hashtags accepted'; end if;
          if internal.is_valid_trivia_config_v1(jsonb_set(config, '{style,tone}', '"casual"')) then raise exception 'style accepted'; end if;
          if internal.is_valid_trivia_config_v1(config || '{"unknown":true}') then raise exception 'unknown config key accepted'; end if;
          if not internal.is_valid_system_checks_v1(system_evidence, hash, 1) or not internal.is_valid_editorial_checks_v1(editorial_evidence, hash, 1) then raise exception 'canonical evidence rejected'; end if;
          if internal.is_valid_system_checks_v1('{"schema_version":1,"content_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","overall_status":"passed","checks":[]}', hash, 1) then raise exception 'generic system evidence accepted'; end if;
          if internal.is_valid_system_checks_v1(jsonb_set(system_evidence, '{schema_version}', '2'), hash, 1) then raise exception 'unsupported system schema version accepted'; end if;
          if internal.is_valid_system_checks_v1(jsonb_set(system_evidence, '{schema_version}', '"1"'), hash, 1) then raise exception 'string system schema version accepted'; end if;
          if internal.is_valid_system_checks_v1(jsonb_set(system_evidence, '{schema_version}', '1.0'), hash, 1) then raise exception 'decimal system schema version accepted'; end if;
          if internal.is_valid_system_checks_v1(jsonb_set(system_evidence, '{schema_version}', 'true'), hash, 1) then raise exception 'boolean system schema version accepted'; end if;
          if internal.is_valid_system_checks_v1(jsonb_set(system_evidence, '{schema_version}', 'null'), hash, 1) then raise exception 'null system schema version accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{schema_version}', '2'), hash, 1) then raise exception 'unsupported editorial schema version accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{schema_version}', '"1"'), hash, 1) then raise exception 'string editorial schema version accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{schema_version}', '1.0'), hash, 1) then raise exception 'decimal editorial schema version accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{schema_version}', 'true'), hash, 1) then raise exception 'boolean editorial schema version accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{schema_version}', 'null'), hash, 1) then raise exception 'null editorial schema version accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{rubric_version}', '2'), hash, 1) then raise exception 'unsupported editorial rubric version accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{rubric_version}', '"1"'), hash, 1) then raise exception 'string editorial rubric version accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{rubric_version}', '1.0'), hash, 1) then raise exception 'decimal editorial rubric version accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{rubric_version}', 'true'), hash, 1) then raise exception 'boolean editorial rubric version accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{rubric_version}', 'null'), hash, 1) then raise exception 'null editorial rubric version accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{overall_status}', '"passed"'), hash, 1) then raise exception 'non-contract editorial status accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{content_hash}', '"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"'), hash, 1) then raise exception 'editorial hash mismatch accepted'; end if;
          if internal.is_valid_system_checks_v1(jsonb_set(system_evidence, '{evaluator}', '"client"'), hash, 1) then raise exception 'wrong evidence evaluator accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{overall_status}', '"unknown"'), hash, 1) then raise exception 'unsupported editorial status accepted'; end if;
          if internal.is_valid_system_checks_v1(jsonb_set(system_evidence, '{checks,0}', '{"id":"x"}'), hash, 1) then raise exception 'malformed system check accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{criteria,0}', '{"id":"x"}'), hash, 1) then raise exception 'malformed editorial criterion accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{evaluator_label}', to_jsonb(repeat('x', 121))), hash, 1) then raise exception 'oversized evaluator label accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{criteria,0,note}', to_jsonb(repeat('x', 501))), hash, 1) then raise exception 'oversized editorial note accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{criteria,0,evidence_paths}', to_jsonb(array_fill('body.facts'::text, array[21]))), hash, 1) then raise exception 'too many evidence paths accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{risk_flags}', to_jsonb(array_fill('risk'::text, array[21]))), hash, 1) then raise exception 'too many risk flags accepted'; end if;
          if internal.is_valid_editorial_checks_v1(jsonb_set(editorial_evidence, '{criteria}', (select jsonb_agg(editorial_evidence -> 'criteria' -> 0) from generate_series(1, 31))), hash, 1) then raise exception 'too many editorial criteria accepted'; end if;
          if internal.is_valid_system_checks_v1(jsonb_set(system_evidence, '{checks,0,evidence}', to_jsonb(array[repeat('x', 33000)])), hash, 1) then raise exception 'oversized evidence accepted'; end if;
          insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values ('00000000-0000-0000-0000-000000000000',user_id,'authenticated','authenticated','phase3-remediation-${suffix}@example.test','x',now(),'{}','{}',now(),now());
          insert into public.workspaces(owner_user_id,name,slug,target_markets) values (user_id,'Remediation','phase3-remediation-${suffix}',array['UK']) returning id into v_workspace_id;
          if (select target_markets from public.workspaces where id=v_workspace_id) <> array['GB'] then raise exception 'workspace UK not canonicalized'; end if;
          insert into public.pages(workspace_id,name,slug,timezone,target_markets) values (v_workspace_id,'UTC','phase3-remediation-utc-${suffix}','UTC',array['US']) returning id into v_page_id;
          insert into public.pages(workspace_id,name,slug,timezone,target_markets) values (v_workspace_id,'New York','phase3-remediation-ny-${suffix}','America/New_York',array['GB']);
          -- CR-010: Page input is canonical ISO; workspace alias compatibility remains above.
          insert into public.pages(workspace_id,name,slug,timezone,target_markets) values (v_workspace_id,'London','phase3-remediation-london-${suffix}','Europe/London',array['GB']);
          if (select target_markets from public.pages where slug='phase3-remediation-london-${suffix}') <> array['GB'] then raise exception 'page ISO market changed'; end if;
          begin insert into public.pages(workspace_id,name,slug,target_markets) values (v_workspace_id,'Alias','phase3-remediation-alias-${suffix}',array['UK']); raise exception 'non-ISO Page alias accepted'; exception when check_violation then if sqlerrm <> 'TARGET_MARKETS_INVALID' then raise; end if; end;
          begin insert into public.pages(workspace_id,name,slug,timezone) values (v_workspace_id,'Bad','phase3-remediation-bad-${suffix}','Mars/Olympus'); raise exception 'fictional timezone accepted'; exception when check_violation then if sqlerrm <> 'PAGE_TIMEZONE_INVALID' then raise; end if; end;
          begin insert into public.pages(workspace_id,name,slug,target_markets) values (v_workspace_id,'Duplicate','phase3-remediation-dup-${suffix}',array['US','US']); raise exception 'duplicate market accepted'; exception when check_violation then if sqlerrm <> 'TARGET_MARKETS_INVALID' then raise; end if; end;
          begin insert into public.pages(workspace_id,name,slug,target_markets) values (v_workspace_id,'Normalized duplicate','phase3-remediation-ukgb-${suffix}',array['UK','GB']); raise exception 'normalized duplicate accepted'; exception when check_violation then if sqlerrm <> 'TARGET_MARKETS_INVALID' then raise; end if; end;
          begin insert into public.pages(workspace_id,name,slug,target_markets) values (v_workspace_id,'Empty','phase3-remediation-empty-${suffix}',array[]::text[]); raise exception 'empty market set accepted'; exception when check_violation then if sqlerrm <> 'TARGET_MARKETS_INVALID' then raise; end if; end;
          insert into public.page_niche_configs(workspace_id,page_id,niche_key,config) values(v_workspace_id,v_page_id,'trivia',config);
          insert into public.posts(workspace_id,page_id,niche_key,format_key,topic_key,interaction_goal,status,quality_status,approval_snapshot,ready_at,published_at,content_payload,generation_snapshot,system_checks,editorial_checks,content_hash) values(v_workspace_id,v_page_id,'trivia','single_subject_fast','animals','share','posted','passed','{}',now(),now(),payload,generation,system_evidence,editorial_evidence,hash) returning id into v_post_id;
          insert into public.post_metrics(workspace_id,page_id,post_id,captured_at,likes) values(v_workspace_id,v_page_id,v_post_id,'2042-01-01 00:00:00+00',0);
          insert into public.post_metrics(workspace_id,page_id,post_id,captured_at,reactions,likes) values(v_workspace_id,v_page_id,v_post_id,'2042-01-01 00:01:00+00',2,1);
          begin insert into public.post_metrics(workspace_id,page_id,post_id,captured_at,reactions,likes) values(v_workspace_id,v_page_id,v_post_id,'2042-01-01 00:02:00+00',1,2); raise exception 'likes above reactions accepted'; exception when check_violation then null; end;
          begin insert into public.post_metrics(workspace_id,page_id,post_id,captured_at,views) values(v_workspace_id,v_page_id,v_post_id,'2042-01-01 00:03:00+00',-1); raise exception 'negative metric accepted'; exception when check_violation then null; end;
          begin insert into public.post_metrics(workspace_id,page_id,post_id,captured_at,watch_time_seconds) values(v_workspace_id,v_page_id,v_post_id,'2042-01-01 00:04:00+00','NaN'::numeric); raise exception 'NaN accepted'; exception when check_violation then null; end;
          begin insert into public.post_metrics(workspace_id,page_id,post_id,captured_at,watch_time_seconds) values(v_workspace_id,v_page_id,v_post_id,'2042-01-01 00:04:30+00','Infinity'::numeric); raise exception 'Infinity accepted'; exception when check_violation then null; end;
          begin insert into public.post_metrics(workspace_id,page_id,post_id,captured_at,watch_time_seconds) values(v_workspace_id,v_page_id,v_post_id,'2042-01-01 00:04:45+00','-Infinity'::numeric); raise exception '-Infinity accepted'; exception when check_violation then null; end;
          insert into public.post_metrics(workspace_id,page_id,post_id,captured_at,views,metrics_payload) values(v_workspace_id,v_page_id,v_post_id,'2042-01-01 00:05:00+00',0,'{"metric_definition_version":1,"source_type":"facebook_ui","source_reported_at":"2026-10-08T13:00:00Z","timezone":"UTC","note":"Observed."}');
          begin insert into public.post_metrics(workspace_id,page_id,post_id,captured_at,views,metrics_payload) values(v_workspace_id,v_page_id,v_post_id,'2042-01-01 00:06:00+00',0,'{"metric_definition_version":2,"source_type":"facebook_ui","source_reported_at":null,"timezone":null,"note":null}'); raise exception 'unsupported payload version accepted'; exception when check_violation then if sqlerrm <> 'POST_METRICS_PAYLOAD_INVALID' then raise; end if; end;
          begin insert into public.post_metrics(workspace_id,page_id,post_id,captured_at,views,metrics_payload) values(v_workspace_id,v_page_id,v_post_id,'2042-01-01 00:07:00+00',0,'{"metric_definition_version":1,"source_type":"facebook_ui","source_reported_at":null,"timezone":"Mars/Olympus","note":null}'); raise exception 'invalid payload timezone accepted'; exception when check_violation then if sqlerrm <> 'POST_METRICS_PAYLOAD_INVALID' then raise; end if; end;
          begin insert into public.post_metrics(workspace_id,page_id,post_id,captured_at,views,metrics_payload) values(v_workspace_id,v_page_id,v_post_id,'2042-01-01 00:08:00+00',0,'{"metric_definition_version":1,"source_type":"facebook_ui","source_reported_at":null,"timezone":null,"note":null,"extra":-1}'); raise exception 'unknown negative payload metric accepted'; exception when check_violation then if sqlerrm <> 'POST_METRICS_PAYLOAD_INVALID' then raise; end if; end;
          if has_function_privilege('public','internal.is_valid_system_checks_v1(jsonb,text,integer)','execute') or has_function_privilege('authenticated','internal.normalize_target_markets(text[])','execute') then raise exception 'new private helper executable'; end if;
          delete from public.post_metrics as metric where metric.post_id = v_post_id;
          delete from public.posts as post where post.id = v_post_id;
          delete from public.page_niche_configs as config_row where config_row.workspace_id = v_workspace_id;
          delete from public.pages as page where page.workspace_id = v_workspace_id;
          delete from public.workspaces as workspace where workspace.id = v_workspace_id;
          delete from auth.users as auth_user where auth_user.id = user_id;
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);
});
