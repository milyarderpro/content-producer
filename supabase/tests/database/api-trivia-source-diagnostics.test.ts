import { describe, expect, it } from 'vitest';
import { factInput, json, row, source, sql } from './helpers/trivia-rpc.js';

function capturedError(expression: string): { message: string; detail: string } {
  const output = sql(`begin;
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
