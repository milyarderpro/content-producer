import { describe, it } from 'vitest';

import { verifyV2CorpusSplit } from './helpers/trivia-v2-corpus-gold.js';

describe('v2 source-free public gold retrieval', () => {
  it.each([
    ['development', 60, 25, 11],
    ['holdout', 33, 15, 7],
  ] as const)('checks %s corpus through authenticated v2 RPC',
    (split, cases, paraphrases, negativeHistory) => {
      verifyV2CorpusSplit(split, { cases, paraphrases, negativeHistory });
    }, 60_000);
});
