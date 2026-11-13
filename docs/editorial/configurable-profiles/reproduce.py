"""Reproduksi bukti kontrak task 1. Read-only; stdlib Python 3, tanpa backend.

Run dari direktori mana pun: python <path>/reproduce.py [--check]
Tanpa --check, cetak report deterministik ke stdout. --check membandingkan
report dan seluruh fingerprint frozen; tidak membuat/mengubah file.
"""
import collections
import hashlib
import json
from pathlib import Path
import re
import statistics
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
INPUTS = {
    'curious_mind': ('post-coriousmind.txt', 'Curious Mind', 55, 51,
        '7388ba52b29aab246841c0d046535f19568c32def0ae6e56a43b3d4254b485da'),
    'dyk': ('post-dyk.txt', 'dyk', 103, 103,
        '4d975bd91fa6ebfecc101ca6958b5b0bacd2490a6ccb1ad72a55274ac283594f'),
    'daily_facts': ('post-dailyfacts.txt', 'Daily Facts', 18, 18,
        'f00bf8cbd7c33735e40a9c21e9052677f05eaabc172ee60c50d322c340edf329'),
}
FORMATS = {'single_subject_fast', 'themed_utility', 'emotional_animal_collection',
           'comparison', 'myth_vs_fact', 'themed_curiosity', 'mixed_curiosity'}
TOPICS = {'animals', 'pet_safety', 'food_science', 'food_storage_home',
          'practical_utility', 'human_body', 'nature_science', 'geography',
          'history_origins', 'inventions_everyday', 'general_trivia'}
EXPECTED = {
    'curious_mind': [51, 6, 10, 82, 9, 109, 624, 2, 5, 574, 93, 0, [209,185,10]],
    'dyk': [100, 5, 11, 89, 10, 125, 708, 14, 25, 635, 122, 60, [339,427,17]],
    'daily_facts': [18, 5, 7, 97.5, 14, 124, 728, 7, 10, 660, 51, 0, [60,47,2]],
}
FIELDS = ['engagement_complete', 'fact_count_min', 'fact_count_max',
          'median_copy_words', 'median_fact_words', 'max_copy_words',
          'max_copy_chars', 'copy_over_600', 'blocks_over_500', 'max_block_chars',
          'max_cta_chars', 'heart_records', 'surprise_high_medium_low']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def words(text):
    return len(re.findall(r'[A-Za-z0-9]+', text))


def split_record(profile, record):
    lines = [s.strip() for s in record['content'].splitlines() if s.strip()]
    hook = lines.pop(0)
    if profile == 'dyk' and record['id'] == 'POST-070':
        assert lines.pop(0) == '🥚 Egg Facts'
    if profile == 'dyk' and record['id'] == 'POST-057':
        cta = lines.pop(6)
        facts = lines
        placement = {'kind': 'after_fact', 'position': 6}
    else:
        facts = lines[:record['fact_count']]
        cta = '\n'.join(lines[record['fact_count']:])
        placement = {'kind': 'after_facts'}
    assert len(facts) == record['fact_count'] and cta
    return hook, facts, cta, placement


def distribution(counter):
    """Largest remainder, tie-break key ASCII; zero keys tetap disertakan."""
    total = sum(counter.values())
    result = {key: 100 * count // total for key, count in sorted(counter.items())}
    residual = 100 - sum(result.values())
    ranked = sorted(counter, key=lambda k: (-(100*counter[k] % total), k))
    for key in ranked[:residual]:
        result[key] += 1
    assert sum(result.values()) == 100
    return result


def main():
    assert sys.argv[1:] in ([], ['--check']), 'usage: reproduce.py [--check]'
    matrix = json.loads((HERE/'record-matrix.json').read_text())
    assert matrix['schema_version'] == 1
    decisions = {(r['profile'], r['id']): r for r in matrix['records']}
    assert len(decisions) == len(matrix['records']) == 172
    seen_keys = set()
    content_groups = collections.defaultdict(list)
    report = {'schema_version': 1, 'evidence': 'LOCAL/CORPUS; not LIVE or claim verification',
              'profiles': {}, 'raw_records': 0, 'unique_account_ids': 0}
    for profile, (filename, account, expected_raw, expected_unique, sha) in INPUTS.items():
        path = ROOT/'dataset-reference'/filename
        assert digest(path) == sha, f'input drift: {path}'
        raw = [(n,json.loads(line)) for n,line in enumerate(path.read_text().splitlines(),1)
               if line.strip()]
        assert len(raw) == expected_raw
        unique = {}
        source_lines = collections.defaultdict(list)
        for line, r in raw:
            assert r['account'] == account
            content_groups[r['content']].append(f'{profile}/{r["id"]}@{line}')
            source_lines[r['id']].append(line)
            if r['id'] in unique:
                assert unique[r['id']] == r, 'duplicate ID payload differs'
            unique[r['id']] = r
        assert len(unique) == expected_unique
        fact_lines, blocks, ctas = [], [], []
        formats = collections.Counter({k:0 for k in FORMATS})
        topics = collections.Counter({k:0 for k in TOPICS})
        cases = []
        for rid,r in unique.items():
            key = (profile,rid)
            seen_keys.add(key)
            decision = decisions[key]
            assert decision['source_file'] == 'dataset-reference/'+filename
            assert decision['source_lines'] == source_lines[rid]
            assert decision['architecture'] in {'single_subject','themed','mixed'}
            assert decision['format_key'] in FORMATS and decision['topic_key'] in TOPICS
            assert decision['mechanisms'] and decision['reader_benefits']
            assert decision['fact_count'] == r['fact_count']
            hook, facts, cta, placement = split_record(profile,r)
            assert decision['cta']['placement'] == placement
            assert len(decision['cta']['actions']) == len(set(decision['cta']['actions']))
            if profile == 'daily_facts':
                assert cta == 'Like the facts? Like the video and follow for more!'
                assert decision['cta']['actions'] == ['react','follow']
            if profile == 'curious_mind' and rid in {'POST-016','POST-018','POST-022'}:
                assert not decision['cta']['actions'] and decision['cta']['ambiguity']
            if profile == 'dyk' and rid == 'POST-060':
                assert len(cta.splitlines()) == 4
            formats[decision['format_key']] += 1
            topics[decision['topic_key']] += 1
            fact_lines += facts
            blocks.append('\n\n'.join(facts))
            ctas.append(cta)
            cases.append({'id':rid, 'fact_count':len(facts), 'copy_chars':len(r['content']),
                          'block_chars':len(blocks[-1]), 'cta_chars':len(cta),
                          'cta_lines':len(cta.splitlines()), 'placement':placement})
        counts = [r['fact_count'] for r in unique.values()]
        values = [sum(all(v is not None for v in r['engagement'].values()) for r in unique.values()),
                  min(counts), max(counts), statistics.median(words(r['content']) for r in unique.values()),
                  statistics.median(words(f) for f in fact_lines), max(words(r['content']) for r in unique.values()),
                  max(len(r['content']) for r in unique.values()),
                  sum(len(r['content'])>600 for r in unique.values()), sum(len(b)>500 for b in blocks),
                  max(map(len,blocks)), max(map(len,ctas)),
                  sum('❤' in r['content'] for r in unique.values()),
                  [sum(r['surprise'][k] for r in unique.values()) for k in ['high','medium','low']]]
        assert values == EXPECTED[profile], f'baseline mismatch {profile}: {values}'
        report['profiles'][profile] = {'input_sha256':sha, 'raw_records':len(raw),
            'unique_account_ids':len(unique), 'duplicate_id_lines':{k:v for k,v in source_lines.items() if len(v)>1},
            'statistics':dict(zip(FIELDS,values)), 'format_counts':dict(sorted(formats.items())),
            'topic_counts':dict(sorted(topics.items())), 'recommended_format_weights':distribution(formats),
            'recommended_topic_weights':distribution(topics), 'cases':cases}
        report['raw_records'] += len(raw)
        report['unique_account_ids'] += len(unique)
    assert seen_keys == set(decisions)
    report['exact_unique_content_bodies'] = len(content_groups)
    report['exact_duplicate_groups'] = [v for v in content_groups.values() if len(v)>1]
    assert report['raw_records'] == 176 and report['unique_account_ids'] == 172
    assert report['exact_unique_content_bodies'] == 171
    report['matrix_sha256'] = digest(HERE/'record-matrix.json')
    if sys.argv[1:] == ['--check']:
        assert report == json.loads((HERE/'report.json').read_text()), 'report drift'
        frozen = json.loads((HERE/'freeze.json').read_text())
        assert frozen['source_sha'] == 'c02c5413479cebf50f39abc10149fafca757611a'
        for item in frozen['files']:
            assert digest(ROOT/item['path']) == item['sha256'], f'freeze drift: {item["path"]}'
        print('PASS LOCAL/CORPUS: 3 hashes; 176 raw / 172 account+ID / 171 bodies; '
              '172 mappings; statistics, CTA, weights, frozen files. No backend/LIVE run.')
    else:
        print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
