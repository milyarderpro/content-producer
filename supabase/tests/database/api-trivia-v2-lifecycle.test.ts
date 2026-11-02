import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { callerStatement, factInput, fixture, json, release, reserve, reserved, row, rpc, secondPage, sql } from './helpers/trivia-rpc.js';
import { approve, cleanup, draft, post, publish } from './helpers/trivia-v2.js';

describe('P5-T1 current mechanical and editorial v2 gate', () => {
  it('recomputes v2 checks without v1 source metadata or 18 editorial criteria', () => {
    const f = fixture();
    try {
      const p = draft(f);
      const current = row<{ checks: { schema_version: number; post_revision: number } }>(
        `select internal.lifecycle_current_system_v2(p) checks from public.posts p where public_id='${p.post_public_id}'`,
      ).checks;
      expect(current.schema_version).toBe(2);
      expect(current.post_revision).toBe(2);
      sql(`select internal.lifecycle_evidence_v1(p) from public.posts p where public_id='${p.post_public_id}';`);
      sql(`select internal.lifecycle_effective_gate_v1(${json(current)},p.editorial_checks,
        p.generation_snapshot,'{}',null) from public.posts p where public_id='${p.post_public_id}';`);
      expect(() => sql(`select internal.lifecycle_effective_gate_v1(${json(current)},
        jsonb_set(p.editorial_checks,'{post_revision}','9'),p.generation_snapshot,'{}',null)
        from public.posts p where public_id='${p.post_public_id}'`)).toThrow('QUALITY_EVIDENCE_STALE');
      expect(() => sql(`select internal.lifecycle_effective_gate_v1(${json(current)},
        jsonb_set(p.editorial_checks,'{checks,meaning_preserved}','"needs_revision"'),
        p.generation_snapshot,'{}',null) from public.posts p where public_id='${p.post_public_id}'`))
        .toThrow('QUALITY_EVIDENCE_STALE');
      expect(() => sql(`select internal.lifecycle_effective_gate_v1(${json(current)},p.editorial_checks,
        p.generation_snapshot,array['trivia.visual_rhythm_clear'],'A style note')
        from public.posts p where public_id='${p.post_public_id}'`)).toThrow('WAIVER_NOT_ALLOWED');
    } finally { cleanup(f); }
  });

  it('blocks current Page, count, format, budget and binding violations', () => {
    const f = fixture();
    try {
      const p = draft(f);
      const gate = callerStatement(f.owner, approve(f, p.post_public_id));
      const changes = [
        [`update public.pages set is_active=false where public_id='${f.page}';`, 'MODULE_DISABLED'],
        [`update public.page_niche_configs set config=jsonb_set(config,'{fact_count}',
          '{"mode":"fixed","value":6}') where page_id=(select id from public.pages where public_id='${f.page}');`, 'CONTENT_PAYLOAD_INVALID'],
        [`update public.page_niche_configs set config=jsonb_set(jsonb_set(config,'{allowed_formats}',
          '["single_subject_fast"]'),'{format_weights}',
          '{"single_subject_fast":100,"themed_utility":0,"emotional_animal_collection":0,"comparison":0,"myth_vs_fact":0}')
          where page_id=(select id from public.pages where public_id='${f.page}');`, 'FORMAT_UNSUPPORTED'],
        [`update public.page_niche_configs set config=jsonb_set(config,'{text_budget,hook_max_chars}',
          '5') where page_id=(select id from public.pages where public_id='${f.page}');`, 'CONTENT_BUDGET_EXCEEDED'],
        [`update public.trivia_post_facts set is_current=false,allocation_state='released',released_at=clock_timestamp()
          where post_id=(select id from public.posts where public_id='${p.post_public_id}') and position=1;`, 'MODULE_RELATION_INVALID'],
      ];
      for (const [change, error] of changes) {
        // Each fault is rolled back, leaving the original saved draft intact.
        expect(() => sql(`begin; ${change} ${gate}; rollback;`)).toThrow(error!);
      }
    } finally { cleanup(f); }
  });

  it('rejects invalid URL, reuse conflicts and failed system evidence even if old checks passed', () => {
    const f = fixture();
    try {
      const p = draft(f);
      const gate = `select internal.lifecycle_current_system_v2(p) from public.posts p where public_id='${p.post_public_id}'`;
      // Isolated corruption controls are transactional; DDL and bad rows roll back.
      expect(() => sql(`begin; alter table public.trivia_post_facts disable trigger user;
        update public.trivia_post_facts set source_snapshot=jsonb_set(source_snapshot,'{source_url}','"http://localhost/a"')
        where post_id=(select id from public.posts where public_id='${p.post_public_id}') and position=1;
        ${gate}; rollback;`)).toThrow('FACT_SOURCE_INSUFFICIENT');
      const other = secondPage(f);
      expect(() => sql(`begin;
        with other as (insert into public.posts(workspace_id,page_id,niche_key,format_key,topic_key,
          interaction_goal,content_schema_version,content_payload,generation_snapshot,content_hash)
          select workspace_id,(select id from public.pages where public_id='${other.page}'),niche_key,format_key,topic_key,interaction_goal,2,
            content_payload,generation_snapshot,content_hash from public.posts where public_id='${p.post_public_id}'
          returning id)
        insert into public.trivia_post_facts(workspace_id,page_id,post_id,fact_id,position,fact_role,
          rendered_text,claim_hash_snapshot,source_snapshot,verified_at_snapshot,snapshot_schema_version)
          select j.workspace_id,(select id from public.pages where public_id='${other.page}'),other.id,j.fact_id,j.position,j.fact_role,j.rendered_text,
            j.claim_hash_snapshot,j.source_snapshot,null,2 from public.trivia_post_facts j cross join other
          where j.post_id=(select id from public.posts where public_id='${p.post_public_id}') and j.position=1;
        ${gate}; rollback;`)).toThrow('FACT_REUSE_BLOCKED');
      expect(row<{ valid: boolean }>(`select internal.post_evidence_valid_v2(
        jsonb_set(system_checks,'{checks,0,status}','"failed"'),content_hash,revision,false) valid
        from public.posts where public_id='${p.post_public_id}'`).valid).toBe(false);
      expect(post(p.post_public_id).status).toBe('draft');
    } finally { cleanup(f); }
  });
});

describe('P5-T2 explicit version-aware lifecycle', () => {
  it('approves/publishes v2 using expired-only legacy identities without v1 expiry gates', () => {
    const f = fixture();
    try {
      const token = randomUUID();
      const identities = reserved(rpc(f, reserve(f, Array.from({ length: 5 }, (_, i) => factInput(undefined, i + 1)), randomUUID(), token)));
      rpc(f, release(f, token));
      sql(`update public.trivia_facts set verified_at=now()-interval '2 days',expires_at=now()-interval '1 day'
        where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`);
      const p = draft(f, identities);
      rpc(f, approve(f, p.post_public_id));
      rpc(f, publish(f, p.post_public_id));
      expect(post(p.post_public_id).status).toBe('posted');
    } finally { cleanup(f); }
  }, 20_000);
  it('approves/replays, reschedules, revokes and reapproves the reviewed v2 version', () => {
    const f = fixture();
    try {
      const p = draft(f);
      expect(() => rpc(f, approve(f, p.post_public_id, randomUUID(), false))).toThrow('APPROVAL_REQUIRED');
      expect(() => rpc(f, approve(f, p.post_public_id), f.other)).toThrow('OWNER_ACCESS_REQUIRED');
      const expression = approve(f, p.post_public_id);
      const first = rpc(f, expression);
      expect(first.data.status).toBe('ready');
      expect(first.data.recomputed_checks).toEqual(expect.objectContaining({ schema_version: 2, post_revision: 2 }));
      expect(rpc(f, expression).data.replayed).toBe(true);
      expect(post(p.post_public_id).revision).toBe(2);
      expect(() => rpc(f, approve(f, p.post_public_id).replace(',2,', ',1,'))).toThrow('REVISION_CONFLICT');
      rpc(f, `api.reschedule_post(1,'${f.workspace}','${randomUUID()}','${p.post_public_id}',2,
        '2026-12-01T12:00:00Z','Owner changed schedule')`);
      expect(post(p.post_public_id)).toEqual(expect.objectContaining({ status: 'ready', revision: 3, content_hash: p.content_hash }));
      rpc(f, `api.revoke_post_approval(1,'${f.workspace}','${randomUUID()}','${p.post_public_id}',3,
        '${p.content_hash}','Review again',true)`);
      expect(post(p.post_public_id)).toEqual(expect.objectContaining({ status: 'draft', revision: 4, approval_snapshot: null }));
      rpc(f, approve(f, p.post_public_id));
      expect(post(p.post_public_id).status).toBe('ready');
    } finally { cleanup(f); }
  });

  it('records confirmed publication and archives without rewriting publication evidence', () => {
    const f = fixture();
    try {
      const p = draft(f);
      rpc(f, approve(f, p.post_public_id));
      expect(() => rpc(f, publish(f, p.post_public_id, randomUUID(), false))).toThrow('VALIDATION_FAILED');
      const expression = publish(f, p.post_public_id);
      expect(rpc(f, expression).data.status).toBe('posted');
      expect(rpc(f, expression).data.replayed).toBe(true);
      const before = post(p.post_public_id);
      const usage = row(`select jsonb_agg(to_jsonb(j) order by id) usage from public.trivia_post_facts j
        where post_id=(select id from public.posts where public_id='${p.post_public_id}')`);
      const archive = `api.archive_post(1,'${f.workspace}','${randomUUID()}','${p.post_public_id}',3,'Archive fixture',true)`;
      expect(rpc(f, archive).data.status).toBe('archived');
      expect(rpc(f, archive).data.replayed).toBe(true);
      const after = post(p.post_public_id);
      expect(after.system_checks).toEqual(before.system_checks);
      expect(after.editorial_checks).toEqual(before.editorial_checks);
      expect(after.approval_snapshot).toEqual(before.approval_snapshot);
      expect(after.content_hash).toBe(before.content_hash);
      expect(row(`select jsonb_agg(to_jsonb(j) order by id) usage from public.trivia_post_facts j
        where post_id=(select id from public.posts where public_id='${p.post_public_id}')`)).toEqual(usage);
      expect(rpc(f, `api.get_post(1,'${f.workspace}','${p.post_public_id}',true,true,false)`).data.post)
        .toEqual(expect.objectContaining({ status: 'archived', content_schema_version: 2 }));
      rpc(f, `api.record_post_performance(1,'${f.workspace}','${randomUUID()}','${p.post_public_id}',
        '2026-11-01T01:00:00Z','{"views":100}','{"source_type":"facebook_ui","metric_definition_version":1}')`);
      expect(post(p.post_public_id)).toEqual(after);
      const metrics = rpc(f, `api.get_post_performance(1,'${f.workspace}','${p.post_public_id}',null,null,20,null)`);
      expect(metrics.data.snapshots).toEqual([expect.objectContaining({ metrics: expect.objectContaining({ views: 100, reach: null }) })]);
    } finally { cleanup(f); }
  }, 20_000);
});
