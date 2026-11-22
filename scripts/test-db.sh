#!/usr/bin/env bash
#
# Runs the SQL suites under supabase/tests/ against the local Supabase stack and
# exits non-zero when any of them fails. Used by `npm run test:db` and by CI.
#
# The suites report each case as a `NOTICE:  PASS …` / `NOTICE:  FAIL …` line,
# and psql exits 0 even when a case prints FAIL, so the exit code alone proves
# nothing. A file fails here when psql itself fails, when any FAIL or ERROR line
# appears, or when it prints no PASS at all (a suite that silently ran nothing).
#
# Needs a running stack (`supabase start`, or `supabase db start` for the
# database alone). Each suite runs in a transaction and rolls back, but run
# `supabase db reset` first so the schema matches the migrations on disk.
#
# Usage: scripts/test-db.sh [file.sql ...]   (default: every supabase/tests/*.sql)
set -uo pipefail

cd "$(dirname "$0")/.."

project_id="$(sed -n 's/^project_id = "\(.*\)"$/\1/p' supabase/config.toml)"
container="supabase_db_${project_id}"

if ! docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null | grep -q true; then
  echo "test-db: container $container is not running; start the stack with 'supabase start'." >&2
  exit 2
fi

if [ "$#" -gt 0 ]; then
  files=("$@")
else
  files=(supabase/tests/*.sql)
fi

status=0
total_pass=0
total_fail=0

for f in "${files[@]}"; do
  out="$(docker exec -i "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < "$f" 2>&1)"
  rc=$?
  pass="$(grep -c 'NOTICE:  PASS' <<<"$out")"
  fail="$(grep -cE 'NOTICE:  FAIL|ERROR:' <<<"$out")"
  total_pass=$((total_pass + pass))
  total_fail=$((total_fail + fail))

  if [ "$rc" -ne 0 ] || [ "$fail" -gt 0 ] || [ "$pass" -eq 0 ]; then
    status=1
    echo "FAIL $f ($pass passed, $fail failed, psql exit $rc)"
    grep -E 'NOTICE:  FAIL|ERROR:' <<<"$out" | sed 's/^psql:<stdin>:[0-9]*: //; s/^/    /'
    [ "$pass" -eq 0 ] && [ "$fail" -eq 0 ] && echo "    no PASS lines: the suite ran no checks"
  else
    echo "ok   $f ($pass passed)"
  fi
done

echo "test-db: $total_pass passed, $total_fail failed"
exit "$status"
