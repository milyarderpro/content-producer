// P1-T3: synthetic contract examples only. No research, MCP, RPC or database calls.
// All IDs/operation keys/claim tokens are invented and carry no live authority.
export const id = (n: number) => `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const configTime = '2026-10-31T01:02:03.123456Z';
export const workspace = id(1);
export const page = id(2);
export const config = id(3);
export const planId = id(100);

export function draftExample(index = 0, inPlan = false) {
  const label = String.fromCharCode(65 + index);
  const facts = Array.from({ length: 5 }, (_, i) => ({
    position: i + 1,
    candidate_key: `${label}${i + 1}`,
    claim_text: `Fixture jar ${label}-${i + 1} has a blue lid.`,
    source_url: `https://example.org/fixture/jars-${label.toLowerCase()}`,
    dedup: {
      complete: true,
      decision: i === 0 ? 'same' : 'distinct',
      fact_public_id: i === 0 ? id(500 + index * 10) : null,
      reviews: i === 0 ? [{ fact_public_id: id(500 + index * 10), decision: 'same' }] : [],
    },
  }));
  const body = { facts: facts.map((f) => ({ position: f.position, text: f.claim_text })) };
  const hook = `Fixture jars ${label}`;
  const cta = 'Which fixture stands out?';
  const content = {
    schema_version: 2,
    hook,
    body,
    cta,
    canva_copy: [hook, ...body.facts.map((f) => f.text), cta].join('\n\n'),
    caption: 'Fixture-only copy; not researched trivia.',
    hashtags: ['#Fixture'],
    render_style: 'plain_lines',
    text_metrics: {},
  };
  const editorial = {
    meaning_preserved: 'pass',
    caption_no_new_claim: 'pass',
    no_known_substantive_issue: 'pass',
  };
  const request = {
    request_schema_version: 2,
    workspace_public_id: workspace,
    operation_key: id(300 + index),
    page_public_id: page,
    niche_key: 'trivia',
    config_public_id: config,
    expected_config_updated_at: configTime,
    expected_catalog_version: String(42 + index),
    content_schema_version: 2,
    format_key: 'themed_utility',
    topic_key: 'food_storage_home',
    interaction_goal: 'save',
    scheduled_at: null,
    plan_item: inPlan
      ? { plan_item_public_id: id(101 + index), claim_token: id(201 + index) }
      : null,
    facts,
    content_payload: content,
    editorial_checks: editorial,
  };
  const response = {
    response_schema_version: 2,
    data: {
      post: {
        post_public_id: id(400 + index),
        page_public_id: page,
        content_schema_version: 2,
        status: 'draft',
        revision: 1,
        // Shape-only placeholder; NOT a claimed server hash or a production value.
        content_hash: String(index + 1).padStart(64, '0'),
      },
      plan: inPlan
        ? {
            plan_public_id: planId,
            requested_count: 5,
            status: index === 4 ? 'completed' : 'in_progress',
            progress: {
              pending: 4 - index,
              in_progress: 0,
              completed: index + 1,
              failed: 0,
              cancelled: 0,
            },
          }
        : null,
      replayed: false,
    },
  };
  const readRequest = {
    request_schema_version: 1,
    workspace_public_id: workspace,
    post_public_id: response.data.post.post_public_id,
    include_sources: true,
    include_checks: true,
    include_latest_metrics: false,
  };
  // Required readback projection, not an assertion that today's v1 output schema accepts v2.
  const readbackProjection = {
    ...response.data.post,
    content_payload: structuredClone(content),
    fact_bindings: facts.map((f, i) => ({
      position: f.position,
      fact_public_id: id(500 + index * 10 + i),
      rendered_text: body.facts[i].text,
      allocation_state: 'allocated',
      source_snapshot: {
        schema_version: 2,
        canonical_claim: f.claim_text,
        source_url: f.source_url,
      },
    })),
    system_checks: {
      post_revision: 1,
      content_hash: response.data.post.content_hash,
      overall_status: 'passed',
    },
    editorial_checks: {
      post_revision: 1,
      content_hash: response.data.post.content_hash,
      checks: { ...editorial },
    },
  };
  const findRequest = {
    request_schema_version: 2,
    workspace_public_id: workspace,
    page_public_id: page,
    candidates: [
      ...facts.map((f) => ({ candidate_key: f.candidate_key, claim_text: f.claim_text })),
      { candidate_key: `${label}6`, claim_text: `Fixture spare jar ${label} has a red lid.` },
    ],
  };
  const findResponse = {
    response_schema_version: 2,
    data: {
      catalog_version: request.expected_catalog_version,
      candidates: findRequest.candidates.map((c, i) => ({
        candidate_key: c.candidate_key,
        complete: true,
        matches:
          i === 0 || i === 5
            ? [
                {
                  fact_public_id: id(i === 0 ? 500 + index * 10 : 999),
                  claim_text: c.claim_text,
                  status: i === 0 ? 'verified' : 'invalidated',
                  reuse_eligibility: i === 0 ? 'eligible' : 'not_eligible',
                  used_on_page: false,
                  used_in_workspace: false,
                },
              ]
            : [],
      })),
    },
  };
  return { request, response, findRequest, findResponse, readRequest, readbackProjection };
}

export const single = draftExample();
export const batch = Array.from({ length: 5 }, (_, i) => draftExample(i, true));
export const planCreateRequest = {
  request_schema_version: 1,
  workspace_public_id: workspace,
  operation_key: id(20),
  page_public_id: page,
  niche_key: 'trivia',
  name: 'Five synthetic food and home drafts',
  config_schema_version: 1,
  items: batch.map((_, i) => ({
    position: i + 1,
    scheduled_at: null,
    topic_key: 'food_storage_home',
    format_key: 'themed_utility',
    interaction_goal: 'save',
    item_config: {},
  })),
  plan_intent: 'Create exactly five drafts about food and home, without schedules.',
};
export const claimRequest = {
  request_schema_version: 1,
  workspace_public_id: workspace,
  operation_key: id(21),
  plan_public_id: planId,
  limit: 1,
  lease_minutes: 30,
};
export const partialProgress = {
  plan_public_id: planId,
  requested_count: 5,
  status: 'partially_completed',
  progress: { pending: 1, in_progress: 0, completed: 3, failed: 1, cancelled: 0 },
};
export const approvalRequest = {
  request_schema_version: 1,
  workspace_public_id: workspace,
  operation_key: id(22),
  post_public_id: single.response.data.post.post_public_id,
  expected_revision: 1,
  expected_content_hash: single.response.data.post.content_hash,
  explicit_approval: true,
  accepted_warning_ids: [],
};
const {
  page_public_id: _page,
  niche_key: _niche,
  scheduled_at: _schedule,
  plan_item: _claim,
  ...revisionFields
} = single.request;
void _page;
void _niche;
void _schedule;
void _claim;
export const reviseRequest = {
  ...revisionFields,
  operation_key: id(23),
  post_public_id: single.response.data.post.post_public_id,
  expected_revision: 1,
  expected_content_hash: single.response.data.post.content_hash,
  expected_catalog_version: '43',
  facts: single.request.facts.map((f, i) => ({
    ...f,
    dedup: {
      complete: true,
      decision: 'same',
      fact_public_id: single.readbackProjection.fact_bindings[i].fact_public_id,
      reviews: [
        {
          fact_public_id: single.readbackProjection.fact_bindings[i].fact_public_id,
          decision: 'same',
        },
      ],
    },
  })),
  revision_reason: 'Fixture-only wording review; no meaning change.',
};
export const reviseResponse = {
  response_schema_version: 2,
  data: {
    post: { ...single.response.data.post, revision: 2 },
    plan: null,
    replayed: false,
  },
};

export function errorExample(
  code: string,
  category: string,
  stage = 'domain',
  outcome = 'rolled_back',
  tool = 'save_post_v2',
) {
  return {
    response_schema_version: 2,
    error: {
      code,
      category,
      message:
        outcome === 'unknown'
          ? 'Hasil operasi contoh belum dapat dipastikan.'
          : 'Permintaan contoh ditolak; lihat bagian dan tindakan yang dijelaskan.',
      tool,
      stage,
      retryable: false,
      recovery:
        outcome === 'unknown'
          ? 'Baca post/plan atau replay key dan payload semantik asli yang identik sebelum operasi baru.'
          : 'Baca state yang relevan, tinjau masalah, lalu perbaiki sebelum operasi baru.',
      write_outcome: outcome,
      diagnostic_id: 'diag-fixture-001',
    },
  };
}

export const errors = {
  url: {
    ...errorExample('FACT_URL_REQUIRED', 'input', 'input', 'not_started'),
    error: {
      ...errorExample('FACT_URL_REQUIRED', 'input', 'input', 'not_started').error,
      message: 'Fakta ke-3: URL sumber kosong.',
      recovery: 'Isi satu URL web pendukung untuk fakta ke-3, lalu periksa ulang naskah.',
      field_errors: [
        {
          path: 'facts[2].source_url',
          code: 'FACT_URL_REQUIRED',
          message: 'URL sumber wajib diisi.',
        },
      ],
    },
  },
  catalog: {
    ...errorExample('FACT_CATALOG_CONFLICT', 'state_conflict'),
    error: {
      ...errorExample('FACT_CATALOG_CONFLICT', 'state_conflict').error,
      message: 'Katalog fakta berubah sejak pencarian terakhir; draft belum disimpan.',
      recovery: 'Cari ulang fakta final pada versi katalog terbaru sebelum operasi simpan baru.',
    },
  },
  reuse: {
    ...errorExample('FACT_REUSE_BLOCKED', 'state_conflict'),
    error: {
      ...errorExample('FACT_REUSE_BLOCKED', 'state_conflict').error,
      message: 'Fakta ke-2 sudah dipakai pada scope Page.',
      recovery: 'Pilih calon lain, perbarui copy, lalu cek ulang sebelum operasi baru.',
      field_errors: [
        { path: 'facts[1]', code: 'FACT_REUSE_BLOCKED', message: 'Pemakaian ulang dilarang.' },
      ],
    },
  },
  claim: errorExample('PLAN_ITEM_CLAIM_EXPIRED', 'state_conflict'),
  revision: errorExample(
    'REVISION_CONFLICT',
    'state_conflict',
    'domain',
    'rolled_back',
    'revise_post_v2',
  ),
  config: errorExample('PAGE_VERSION_CONFLICT', 'state_conflict'),
  hash: errorExample(
    'CONTENT_HASH_CONFLICT',
    'state_conflict',
    'domain',
    'rolled_back',
    'revise_post_v2',
  ),
  budget: {
    response_schema_version: 2,
    error: {
      ...errorExample('TEXT_BUDGET_EXCEEDED', 'input').error,
      message: 'Caption melewati batas Page sebanyak 20 karakter.',
      recovery: 'Pendekkan caption, tinjau maknanya, lalu periksa ulang sebelum operasi baru.',
      field_errors: [
        {
          path: 'content_payload.caption',
          code: 'TEXT_BUDGET_EXCEEDED',
          message: 'Kurangi sedikitnya 20 karakter tanpa menambah klaim baru.',
        },
      ],
    },
  },
  editorial: {
    response_schema_version: 2,
    error: {
      ...errorExample('QUALITY_EDITORIAL_INCOMPLETE', 'input').error,
      message: 'Pemeriksaan makna memerlukan revisi; perubahan belum disimpan.',
      recovery: 'Perbaiki hubungan fakta dan copy lalu ulangi tiga pemeriksaan editorial.',
      field_errors: [
        {
          path: 'editorial_checks.meaning_preserved',
          code: 'QUALITY_EDITORIAL_INCOMPLETE',
          message: 'Hasil needs_revision tidak dapat disimpan.',
        },
      ],
    },
  },
  denied: errorExample('FORBIDDEN', 'access_denied', 'auth', 'not_started'),
  unknown: errorExample('INTERNAL_ERROR', 'internal_unknown', 'rpc_transport', 'unknown'),
  timeout: {
    response_schema_version: 2,
    error: {
      ...errorExample('RPC_TIMEOUT', 'transient', 'rpc_transport', 'unknown').error,
      message: 'Respons save tidak diterima; hasil simpan belum dapat dipastikan.',
      recovery: 'Rekonsiliasi post/plan atau replay operation key dan payload semantik yang sama.',
      retryable: true,
    },
  },
  rate: {
    response_schema_version: 2,
    error: {
      ...errorExample('RATE_LIMITED', 'transient', 'rate_limit', 'not_started').error,
      message: 'Batas pemanggilan tercapai; tunggu 60 detik.',
      recovery: 'Tunggu waktu yang disebutkan; jangan mengganti key untuk melewati batas.',
      retryable: true,
      retry_after_seconds: 60,
    },
  },
};

export const lostResponseReplay = {
  request: structuredClone(batch[3].request),
  response: {
    ...structuredClone(batch[3].response),
    data: { ...batch[3].response.data, replayed: true },
  },
  observation: { original_committed: true, response_lost: true, claim_expired_now: true },
};
export const newSaveExpired = {
  request: { ...structuredClone(batch[3].request), operation_key: id(9990) },
  response: errors.claim,
  observation: { original_committed: false, claim_expired_now: true },
};
export const legacyError = {
  response_schema_version: 1,
  error: {
    code: 'FACT_REUSE_BLOCKED',
    message: 'The reuse policy forbids this fact.',
    retryable: false,
    recovery: 'Choose another fact or Page.',
  },
};

export const legacyOutputUncertain = {
  isError: true,
  structuredContent: {
    response_schema_version: 1,
    error: {
      code: 'DATABASE_UNAVAILABLE',
      message: 'Respons save tidak dapat dipakai; hasil simpan belum dapat dipastikan.',
      retryable: true,
      recovery: 'Rekonsiliasi post/plan atau replay key dan payload semantik yang sama.',
    },
  },
  content: [
    {
      type: 'text',
      text: 'save_post | output | RPC_RESPONSE_INVALID | unknown | diag-fixture-002: Hasil simpan belum dapat dipastikan.',
    },
  ],
};

// Request/expected-error pairs; these do not invoke a domain implementation.
const missingUrl = structuredClone(single.request);
missingUrl.facts[2].source_url = '';
const longCaption = structuredClone(single.request);
longCaption.content_payload.caption += 'x'.repeat(20);
const editorialRevision = structuredClone(single.request);
editorialRevision.editorial_checks.meaning_preserved = 'needs_revision';
export const rejectedExamples = {
  missingUrl: { request: missingUrl, response: errors.url },
  longCaption: {
    request: longCaption,
    page_caption_max_chars: single.request.content_payload.caption.length,
    response: errors.budget,
  },
  editorialRevision: { request: editorialRevision, response: errors.editorial },
  staleConfig: {
    request: {
      ...structuredClone(single.request),
      expected_config_updated_at: '2026-10-31T01:02:03.123455Z',
    },
    observed_config_updated_at: configTime,
    response: errors.config,
  },
  staleCatalog: {
    request: structuredClone(single.request),
    observed_catalog_version: '43',
    response: errors.catalog,
  },
  staleRevision: {
    request: structuredClone(reviseRequest),
    observed_revision: 2,
    response: errors.revision,
  },
  staleHash: {
    request: { ...structuredClone(reviseRequest), expected_content_hash: 'f'.repeat(64) },
    observed_content_hash: single.response.data.post.content_hash,
    response: errors.hash,
  },
};
