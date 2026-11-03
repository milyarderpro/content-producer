#!/usr/bin/env bash
set -euo pipefail
umask 077

# Use the local Supabase DB container for fixture work. For production, use an
# installed pg_dump/pg_restore/psql with PGHOST/PGPORT/PGUSER/PGDATABASE and
# PGPASSWORD or PGPASSFILE supplied outside the repository.
if [[ $# -ne 2 || ( $1 != local && $1 != production ) ]]; then
  echo 'usage: cutover-backup.sh local|production ABSOLUTE_EMPTY_OUTPUT_DIR' >&2
  exit 2
fi
mode=$1
out=$2
[[ $out = /* && ! -e $out ]] || { echo 'output must be a new absolute directory' >&2; exit 2; }
if [[ $mode = production ]]; then
  [[ -n ${PGHOST:-} && -n ${PGUSER:-} && -n ${PGDATABASE:-} ]] || {
    echo 'production PGHOST, PGUSER and PGDATABASE are required' >&2; exit 2;
  }
  runner=()
else
  runner=(docker exec -i -e PGUSER=postgres -e PGDATABASE=postgres supabase_db_content-producer)
fi
mkdir -m 700 -- "$out"
trap 'echo "Backup incomplete; discard $out before retrying" >&2' ERR

"${runner[@]}" pg_dump --format=custom --no-owner --no-acl \
  --schema=public --schema=internal --schema=supabase_migrations \
  > "$out/app-and-history.dump"
"${runner[@]}" pg_restore --list < "$out/app-and-history.dump" > "$out/archive-index.txt"
"${runner[@]}" pg_restore --file=/dev/null < "$out/app-and-history.dump"
[[ -s $out/app-and-history.dump && -s $out/archive-index.txt ]]

"${runner[@]}" psql -X -q -v ON_ERROR_STOP=1 -At <<'SQL' > "$out/preserved-comparator.json"
select jsonb_build_object(
  'auth_user_ids', (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from auth.users),
  'workspaces', (select coalesce(jsonb_agg(to_jsonb(w) order by w.id), '[]'::jsonb) from public.workspaces w),
  'pages', (select coalesce(jsonb_agg(to_jsonb(p) order by p.id), '[]'::jsonb) from public.pages p),
  'page_niche_configs', (select coalesce(jsonb_agg(to_jsonb(c) order by c.id), '[]'::jsonb) from public.page_niche_configs c),
  'niches', (select coalesce(jsonb_agg(to_jsonb(n) order by n.key), '[]'::jsonb) from public.niches n)
)::text;
SQL
"${runner[@]}" psql -X -q -v ON_ERROR_STOP=1 -At <<'SQL' > "$out/migration-history.jsonl"
copy (select to_jsonb(m)::text from supabase_migrations.schema_migrations m order by m.version) to stdout;
SQL
[[ -s $out/preserved-comparator.json && -s $out/migration-history.jsonl ]]

(cd "$out" && sha256sum app-and-history.dump archive-index.txt preserved-comparator.json migration-history.jsonl > SHA256SUMS)
(cd "$out" && sha256sum --check --status SHA256SUMS)
chmod 600 "$out"/*
trap - ERR
echo "Backup verified at $out"
