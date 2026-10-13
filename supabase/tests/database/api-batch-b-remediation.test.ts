import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  fixture,
  cleanup,
  request,
  save,
  revise,
  rpc,
  ready,
  get,
  approve,
  publish,
  revoke,
  posted,
  archive,
  lifecycleRpc,
  configure,
  content,
  generation,
  secondPage,
  json,
  row,
  sql,
  state,
  usages,
  evidence,
  replayDigest,
  callerStatement,
  session,
  waitForSession,
  bindings,
  correct,
  type Fixture,
  type Request,
} from './helpers/post-lifecycle.js';
import { factInput, reserve } from './helpers/trivia-rpc.js';

function reuse(f: Fixture, r: Request): string {
  return reserve(
    f,
    r.bindings.map((b, i) =>
      factInput(
        {
          ...row(`select claim_text,subject_key,relation_key,object_key,numbers,qualifiers,
      topic_key,normalization_version,ontology_version from public.trivia_facts where public_id='${b.fact_public_id}'`),
          candidate_key: `reuse_${i}`,
        },
        i + 1,
      ),
    ),
    randomUUID(),
    r.token,
    f.configTime,
    String(r.generation.fact_reuse_scope),
  );
}
function words(r: Request, counts: number[]): Request {
  r.bindings = r.bindings.map((b, i) => ({
    ...b,
    rendered_text: Array(counts[i]).fill('a').join(' '),
  }));
  r.content = content(r.bindings);
  return r;
}
function warning(p: { system_checks: Record<string, unknown> }): string | undefined {
  return (p.system_checks.checks as { id: string; status: string }[]).find(
    (c) => c.id === 'trivia.profile.preferred_band',
  )?.status;
}

describe('CR-016 Batch B public regression', () => {
  it('P1-01 legal cross-Page reuse does not invalidate retained revise/approve/publish; new/re-added allocations remain scoped', () => {
    const f = fixture();
    try {
      const r = request(f);
      let a = ready(f, rpc(f, save(f, r)).data.post);
      const original = (usages(a).junctions as { source_snapshot: unknown }[]).map(
        (b) => b.source_snapshot,
      );
      const b = secondPage(f);
      configure(b, { fact_reuse_scope: 'page_unique' });
      const rb = {
        ...r,
        key: randomUUID(),
        token: randomUUID(),
        configTime: b.configTime,
        generation: generation(b, 5),
      };
      rpc(b, reuse(b, rb));
      const pb = rpc(b, save(b, rb)).data.post;
      const call = revise(f, a, r);
      const before = state(f);
      expect(() => rpc(f, call, f.other)).toThrow(/^OWNER_ACCESS_REQUIRED$/);
      expect(state(f)).toBe(before);
      a = rpc(f, call).data.post;
      expect(a.status).toBe('draft');
      expect(
        (usages(a).junctions as { source_snapshot: unknown }[]).map((x) => x.source_snapshot),
      ).toEqual(original);
      const fresh = bindings(f, 1);
      const replaced = {
        ...r,
        bindings: [...r.bindings.slice(0, 4), { ...fresh.bindings[0]!, position: 5 }],
      };
      replaced.content = content(replaced.bindings);
      a = rpc(f, revise(f, a, replaced, randomUUID(), fresh.token)).data.post;
      const readd = { ...r, token: randomUUID(), bindings: r.bindings.slice(4) };
      expect(() => rpc(f, reuse(f, readd))).toThrow(/^FACT_REUSE_BLOCKED$/);
      a = ready(f, a);
      const publishCall = publish(f, a);
      const published = lifecycleRpc(f, publishCall);
      expect(published.data.status).toBe('posted');
      expect(replayDigest(lifecycleRpc(f, publishCall))).toBe(replayDigest(published));
      lifecycleRpc(f, archive(f, get(f, a.post_public_id)));
      expect(get(f, pb.post_public_id).status).toBe('draft');
      expect(() => rpc(b, reuse(b, { ...rb, token: randomUUID() }))).toThrow(
        /^FACT_REUSE_BLOCKED$/,
      );
      const c = secondPage(f);
      const rc = {
        ...r,
        token: randomUUID(),
        configTime: c.configTime,
        generation: generation(c, 5),
      };
      expect(() => rpc(c, reuse(c, rc))).toThrow(/^FACT_REUSE_BLOCKED$/);
    } finally {
      cleanup(f);
    }
  }, 45_000);

  it('P2-01 fresh all-pass save and ready revision remain pending until explicit approval, with exact replay', () => {
    const f = fixture();
    try {
      const r = words(request(f, 7), Array(7).fill(8));
      const call = save(f, r);
      const first = rpc(f, call);
      expect(first.data.post.quality_status).toBe('pending');
      expect(evidence(first.data.post).approval_snapshot).toBeNull();
      lifecycleRpc(f, approve(f, first.data.post, randomUUID(), [], null));
      const approved = get(f, first.data.post.post_public_id);
      expect(approved.quality_status).toBe('passed');
      const revision = revise(f, approved, r);
      const revised = rpc(f, revision);
      expect(revised.data.post).toMatchObject({
        status: 'draft',
        quality_status: 'pending',
        revision: approved.revision + 1,
      });
      expect(evidence(revised.data.post).approval_snapshot).toBeNull();
      expect(replayDigest(rpc(f, call))).toBe(replayDigest(first));
      expect(replayDigest(rpc(f, revision))).toBe(replayDigest(revised));
    } finally {
      cleanup(f);
    }
  }, 20_000);

  it('P2-02 uneven per-fact preferred words require warning acceptance without waiving hard limits', () => {
    const f = fixture();
    try {
      const r = words(request(f, 7), [1, 18, 8, 8, 8, 7, 6]);
      const p = rpc(f, save(f, r)).data.post;
      expect((p.content_payload.text_metrics as Record<string, unknown>).word_count).toBe(65);
      expect(warning(p)).toBe('needs_review');
      const before = state(f);
      expect(() => lifecycleRpc(f, approve(f, p, randomUUID(), [], null))).toThrow(
        /^WAIVER_NOT_ALLOWED$/,
      );
      expect(state(f)).toBe(before);
      const accepted = lifecycleRpc(f, approve(f, p));
      expect(warning({ system_checks: accepted.data.recomputed_checks })).toBe('needs_review');
      expect(posted(f, get(f, p.post_public_id)).status).toBe('posted');
      const dense = words(request(f, 7), Array(7).fill(18));
      const failed = rpc(f, save(f, dense)).data.post;
      expect(failed.quality_status).toBe('failed');
      expect(() => lifecycleRpc(f, approve(f, failed))).toThrow(/^QUALITY_SYSTEM_CHECK_FAILED$/);
    } finally {
      cleanup(f);
    }
  }, 25_000);

  it.each([
    { profile: 'fast_trivia', count: 7, good: 9, bad: 10, minimum: 8, maximum: 9 },
    { profile: 'practical_utility', count: 5, good: 12, bad: 13, minimum: 10, maximum: 12 },
  ])(
    'P2-02 locked narrowed $profile ranges drive save/revise/approval/publish checks',
    ({ profile, count, good, bad, minimum, maximum }) => {
      const f = fixture();
      try {
        const profiles = row<{ p: Record<string, Record<string, unknown>> }>(
          `select config->'profiles' p from public.page_niche_configs where page_id=(select id from public.pages where public_id='${f.page}')`,
        ).p;
        configure(f, {
          profiles: {
            ...profiles,
            [profile]: {
              ...profiles[profile],
              words_per_fact_min: minimum,
              words_per_fact_max: maximum,
            },
          },
        });
        const r = words(request(f, count), Array(count).fill(good));
        r.generation.profile_key = profile;
        let p = rpc(f, save(f, r)).data.post;
        expect(warning(p)).toBe('passed');
        lifecycleRpc(f, approve(f, p, randomUUID(), [], null));
        p = get(f, p.post_public_id);
        words(r, Array(count).fill(bad));
        p = rpc(f, revise(f, p, r)).data.post;
        expect(warning(p)).toBe('needs_review');
        expect(() => lifecycleRpc(f, approve(f, p, randomUUID(), [], null))).toThrow(
          /^WAIVER_NOT_ALLOWED$/,
        );
        p = ready(f, p);
        expect(posted(f, p).status).toBe('posted');
      } finally {
        cleanup(f);
      }
    },
    25_000,
  );

  it('P2-01 administrative legacy normalization is idempotent and preserves historical replay and approved/publication snapshots', () => {
    const f = fixture();
    let inactive: Fixture | undefined;
    try {
      const r = words(request(f, 7), Array(7).fill(8));
      const call = save(f, r);
      const first = rpc(f, call);
      const p = first.data.post;
      // Controlled legacy fixture: emulate the actual baseline's passed draft/result.
      const historical = {
        ...first,
        data: { ...first.data, post: { ...p, quality_status: 'passed' } },
      };
      sql(`begin;alter table internal.post_write_history disable trigger post_history_immutable;
        update internal.post_write_history set response=${json(historical)} where operation_id=(select id from internal.operation_ledger where operation_key='${r.key}');
        alter table internal.post_write_history enable trigger post_history_immutable;
        update internal.operation_ledger l set response_snapshot=jsonb_set(response_snapshot,'{response_hash}',to_jsonb(encode(extensions.digest(convert_to(h.response::text,'UTF8'),'sha256'),'hex')))
        from internal.post_write_history h where h.operation_id=l.id and l.operation_key='${r.key}';
        update public.posts set quality_status='passed' where public_id='${p.post_public_id}';commit;`);
      const original = evidence(p),
        usage = usages(p);
      const approved = ready(f, rpc(f, save(f, request(f))).data.post);
      const pub = posted(f, ready(f, rpc(f, save(f, request(f))).data.post));
      const protectedRows = [evidence(approved), evidence(pub)];
      inactive = fixture();
      const bad = request(inactive);
      bad.content.hook = 'A'.repeat(80);
      bad.content.canva_copy = [
        bad.content.hook,
        ...bad.bindings.map((b) => b.rendered_text),
        bad.content.cta,
      ].join('\n\n');
      const badCall = save(inactive, bad),
        badFirst = rpc(inactive, badCall),
        badPost = badFirst.data.post;
      expect(badPost.quality_status).toBe('failed');
      const badEvidence = evidence(badPost),
        badUsage = usages(badPost);
      sql(`update public.posts set quality_status='passed' where public_id='${badPost.post_public_id}';
        update public.workspaces set is_active=false where public_id='${inactive.workspace}'`);
      const immutableState = () =>
        row(`select
        (select md5(jsonb_agg(to_jsonb(l) order by id)::text) from internal.operation_ledger l) ledger,
        (select md5(jsonb_agg(to_jsonb(h) order by id)::text) from internal.post_write_history h) history`);
      const immutable = immutableState();
      // Fault after the earlier valid draft could be updated: repair must roll back all rows.
      sql(`begin;alter table public.posts disable trigger posts_validate;
        update public.posts set system_checks=jsonb_set(system_checks,'{content_hash}',to_jsonb(repeat('f',64))) where public_id='${badPost.post_public_id}';
        alter table public.posts enable trigger posts_validate;commit;`);
      const beforeFault = [state(f), state(inactive)];
      expect(() => sql('select internal.normalize_unapproved_drafts_v1()')).toThrow(
        /^QUALITY_EVIDENCE_STALE$/,
      );
      expect([state(f), state(inactive)]).toEqual(beforeFault);
      sql(
        `update public.posts set system_checks=${json(badEvidence.system_checks)} where public_id='${badPost.post_public_id}'`,
      );
      expect(Number(sql('select internal.normalize_unapproved_drafts_v1()'))).toBe(2);
      const current = get(f, p.post_public_id);
      expect(current).toMatchObject({
        revision: p.revision + 1,
        quality_status: 'pending',
        status: 'draft',
      });
      expect(current.editorial_checks).toEqual({
        ...(original.editorial_checks as object),
        post_revision: p.revision + 1,
      });
      expect(evidence(current).content_hash).toBe(original.content_hash);
      expect(usages(current)).toEqual(usage);
      expect([evidence(approved), evidence(pub)]).toEqual(protectedRows);
      expect(replayDigest(rpc(f, call))).toBe(replayDigest(historical));
      expect(immutableState()).toEqual(immutable);
      sql(`update public.workspaces set is_active=true where public_id='${inactive.workspace}'`);
      expect(get(inactive, badPost.post_public_id)).toMatchObject({
        quality_status: 'failed',
        revision: badPost.revision + 1,
      });
      expect(evidence(badPost).system_checks).toEqual({
        ...(badEvidence.system_checks as object),
        post_revision: badPost.revision + 1,
      });
      expect(usages(badPost)).toEqual(badUsage);
      expect(replayDigest(rpc(inactive, badCall))).toBe(replayDigest(badFirst));
      expect(Number(sql('select internal.normalize_unapproved_drafts_v1()'))).toBe(0);
      for (const role of ['anon', 'authenticated', 'service_role', 'content_producer_api_owner'])
        expect(() =>
          sql(
            `begin;set local role ${role};select internal.normalize_unapproved_drafts_v1();rollback;`,
          ),
        ).toThrow();
    } finally {
      if (inactive) cleanup(inactive);
      cleanup(f);
    }
  }, 30_000);

  it('P2-02 legacy ready approval with a newly applicable profile warning blocks publish; exact historical replay and explicit reapproval recover', () => {
    const f = fixture();
    try {
      const r = words(request(f, 7), [1, 18, 8, 8, 8, 7, 6]);
      const draft = rpc(f, save(f, r)).data.post;
      const key = randomUUID();
      const approved = lifecycleRpc(f, approve(f, draft, key));
      const p = get(f, draft.post_public_id);
      // Controlled historical fixture emulates pre-fix public approval with no warning.
      // All scoped relationships/digests remain valid; no production helper is replaced.
      sql(`begin;alter table internal.post_write_history disable trigger post_history_immutable;
        update internal.post_write_history set response=jsonb_set(jsonb_set(response,'{data,approval,accepted_warning_ids}','[]'),'{data,approval,warning_acceptance_reason}','null')
          where operation_id=(select id from internal.operation_ledger where operation_key='${key}');
        alter table internal.post_write_history enable trigger post_history_immutable;
        update internal.operation_ledger l set response_snapshot=jsonb_set(response_snapshot,'{response_hash}',to_jsonb(encode(extensions.digest(convert_to(h.response::text,'UTF8'),'sha256'),'hex'))),
          request_hash=internal.canonical_request_hash_v1('approve_post','${f.workspace}',1,${json({ post_public_id: draft.post_public_id, expected_revision: draft.revision, expected_content_hash: draft.content_hash, explicit_approval: true, accepted_warning_ids: [], warning_acceptance_reason: null })})
          from internal.post_write_history h where h.operation_id=l.id and l.operation_key='${key}';
        update public.posts set approval_snapshot=jsonb_set(jsonb_set(approval_snapshot,'{accepted_warning_ids}','[]'),'{warning_acceptance_reason}','null')
          where public_id='${p.post_public_id}';commit;`);
      const historical = {
        ...approved,
        data: {
          ...approved.data,
          approval: {
            ...approved.data.approval,
            accepted_warning_ids: [],
            warning_acceptance_reason: null,
          },
        },
      };
      expect(replayDigest(lifecycleRpc(f, approve(f, draft, key, [], null)))).toBe(
        replayDigest(historical),
      );
      const before = state(f);
      expect(() => lifecycleRpc(f, publish(f, p))).toThrow(/^WAIVER_NOT_ALLOWED$/);
      expect(state(f)).toBe(before);
      lifecycleRpc(f, revoke(f, p));
      const reapproved = ready(f, get(f, p.post_public_id));
      expect(posted(f, reapproved).status).toBe('posted');
      expect(replayDigest(lifecycleRpc(f, approve(f, draft, key, [], null)))).toBe(
        replayDigest(historical),
      );
    } finally {
      cleanup(f);
    }
  }, 30_000);

  it('P1-01 public B save versus A publish BOTH orders preserve legal permanent and retained usages', async () => {
    const f = fixture();
    const running: ReturnType<typeof session>[] = [];
    try {
      for (const first of ['save', 'publish']) {
        const r = request(f);
        const a = ready(f, rpc(f, save(f, r)).data.post);
        const b = secondPage(f);
        configure(b, { fact_reuse_scope: 'page_unique' });
        const rb = {
          ...r,
          key: randomUUID(),
          token: randomUUID(),
          configTime: b.configTime,
          generation: generation(b, 5),
        };
        rpc(b, reuse(b, rb));
        const calls = { save: save(b, rb), publish: publish(f, a) };
        const holderName = `cr016-holder-${randomUUID()}`,
          waiterName = `cr016-waiter-${randomUUID()}`;
        const holder = session(
          `begin;set application_name='${holderName}';${callerStatement(f.owner, calls[first as keyof typeof calls])}select pg_sleep(1.2);commit;`,
        );
        running.push(holder);
        await waitForSession(holderName);
        const waiter = session(
          `begin;set application_name='${waiterName}';${callerStatement(f.owner, calls[first === 'save' ? 'publish' : 'save'])}commit;`,
        );
        running.push(waiter);
        await waitForSession(waiterName, "wait_event_type='Lock'");
        expect((await Promise.all([holder, waiter])).map((x) => x.code)).toEqual([0, 0]);
        expect(get(f, a.post_public_id).status).toBe('posted');
        expect(
          row(
            `select count(*) n from public.trivia_post_facts where workspace_id=(select id from public.workspaces where public_id='${f.workspace}') and page_id=(select id from public.pages where public_id='${b.page}') and allocation_state='allocated'`,
          ).n,
        ).toBe(5);
        const snapshot = usages(a);
        rpc(f, correct(f, r.bindings[0]!.fact_public_id));
        expect(usages(a)).toEqual(snapshot);
      }
    } finally {
      await Promise.allSettled(running);
      cleanup(f);
    }
  }, 45_000);
});
