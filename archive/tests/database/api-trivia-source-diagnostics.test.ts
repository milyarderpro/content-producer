import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';
import {
  candidate,
  cleanup,
  factInput,
  fixture,
  json,
  quote,
  release,
  reserve,
  reserved,
  row,
  rpc,
  source,
  sql,
} from './helpers/trivia-rpc.js';

function capturedError(expression: string, actor?: string): { message: string; detail: string } {
  const claims = actor
    ? `set local role authenticated;
    do $context$ begin perform set_config('request.jwt.claims',
      ${quote(JSON.stringify({ sub: actor, role: 'authenticated', client_id: randomUUID() }))},true); end $context$;`
    : '';
  const output = sql(`begin;
    ${claims}
    create temp table source_diagnostic_capture(message text,detail text) on commit drop;
    do $capture$ declare v_message text; v_detail text; begin
      perform ${expression};
    exception when others then
      get stacked diagnostics v_message=message_text,v_detail=pg_exception_detail;
      insert into source_diagnostic_capture values(v_message,v_detail);
    end $capture$;
    select to_jsonb(t) from source_diagnostic_capture t;
    commit;`);
  return JSON.parse(output) as { message: string; detail: string };
}

describe('trivia source diagnostics retain policy and redact evidence', () => {
  it('identifies the first failing fact and safe source-policy reason', () => {
    const base = factInput();
    const cases = [
      [{ ...base, sources: [{ ...source(), url: undefined }] }, 'SOURCE_METADATA_INVALID'],
      [
        { ...base, sources: [{ ...source('B'), source_type: 'official' }] },
        'SOURCE_TIER_TYPE_MISMATCH',
      ],
      [{ ...base, sources: [source(), source()] }, 'SOURCE_DUPLICATE_CANONICAL_URL'],
      [{ ...base, sources: [source('D')] }, 'SOURCE_NO_ELIGIBLE_AB'],
      [
        { ...base, risk_class: 'sensitive', sources: [source('B'), source('B', 'other')] },
        'SOURCE_SENSITIVE_TIER_A_REQUIRED',
      ],
      [{ ...base, risk_class: 'sensitive' }, 'SOURCE_INDEPENDENCE_REQUIRED'],
      [{ ...base, freshness_class: 'periodic' }, 'SOURCE_AS_OF_DATE_REQUIRED'],
    ] as const;
    for (const [input, reason] of cases) {
      const internal = capturedError(`internal.trivia_fact_input_v1(${json(input)},true)`);
      expect(internal.message).toBe(`SOURCE_DIAG:1:${reason}`);
      const publicError = capturedError(
        `internal.trivia_rpc_raise_v1('P0001','${internal.message}')`,
      );
      expect(publicError).toEqual({
        message: 'FACT_SOURCE_INSUFFICIENT',
        detail: `SOURCE_DIAG:1:${reason}`,
      });
      expect(JSON.stringify(publicError)).not.toContain('https://');
    }
  });

  it('keeps stable standard facts with one valid Tier B eligible', () => {
    const input = { ...factInput(), sources: [source('B')] };
    const result = row<{ position: number }>(
      `select (internal.trivia_fact_input_v1(${json(input)},true)->>'position')::integer position`,
    );
    expect(result.position).toBe(1);
  });

  it('preserves the supplied fact position without returning source text', () => {
    const input = { ...factInput(), position: 4, sources: [source('D')] };
    const result = capturedError(`internal.trivia_fact_input_v1(${json(input)},true)`);
    expect(result.message).toBe('SOURCE_DIAG:4:SOURCE_NO_ELIGIBLE_AB');
    expect(result.detail).toBe('');
  });

  it('does not expose an unrecognized internal diagnostic', () => {
    expect(capturedError("internal.trivia_rpc_raise_v1('P0001','SOURCE_DIAG:1:SECRET')")).toEqual({
      message: 'INTERNAL_ERROR',
      detail: '',
    });
  });
});

describe('CR-051 trivia dedup diagnostics preserve rejection and redact candidates', () => {
  it('reports the rejected fact position without changing semantic review policy', () => {
    const f = fixture();
    try {
      const initial = {
        ...candidate(),
        relation_key: 'can_perform',
        numbers: [],
        object_key: 'action',
      };
      const created = rpc(f, reserve(f, [factInput(initial)]));
      rpc(f, release(f, created.data.reservation_token as string));
      const changed = { ...initial, claim_text: 'A differently worded action claim.' };
      const denied = capturedError(reserve(f, [factInput(changed)]), f.owner);
      expect(denied).toEqual({
        message: 'FACT_REVIEW_REQUIRED',
        detail: 'REVIEW_DIAG:1:REVIEW_MISSING_OR_INVALID',
      });
      expect(JSON.stringify(denied)).not.toContain(changed.claim_text);
      expect(JSON.stringify(denied)).not.toContain(reserved(created)[0]!.fact_public_id);
    } finally {
      cleanup(f);
    }
  });

  it('keeps positionless and unknown diagnostics generic', () => {
    expect(capturedError("internal.trivia_rpc_raise_v1('P0001','FACT_REVIEW_REQUIRED')")).toEqual({
      message: 'FACT_REVIEW_REQUIRED',
      detail: '',
    });
    expect(capturedError("internal.trivia_rpc_raise_v1('P0001','REVIEW_DIAG:1:SECRET')")).toEqual({
      message: 'INTERNAL_ERROR',
      detail: '',
    });
  });
});
