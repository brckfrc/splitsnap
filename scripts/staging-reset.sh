#!/usr/bin/env bash
#
# Rebuilds the hosted STAGING Supabase project from the repo so the release
# workflow's Maestro run starts from a known state: wake the project if the
# free plan paused it, drop everything and re-apply every migration plus
# supabase/seed.sql, then replace the seed's throwaway password.
#
# Staging is reachable from the internet and seed.sql's password is in git
# history, so the test accounts get STAGING_TEST_PASSWORD instead.
#
# Destructive. It refuses to run unless the target's ref differs from
# production's AND the project is named exactly "splitsnap-staging".
#
# Env: STAGING_PROJECT_REF, SUPABASE_ACCESS_TOKEN (Management API + CLI),
#      SUPABASE_DB_PASSWORD (staging's database password), STAGING_TEST_PASSWORD.
set -euo pipefail

cd "$(dirname "$0")/.."

PRODUCTION_REF="vlrbkplylwoejnkwnaab"
STAGING_NAME="splitsnap-staging"
SEED_USERS=(
  d0000000-0000-4000-8000-000000000001
  d0000000-0000-4000-8000-000000000002
  d0000000-0000-4000-8000-000000000003
)

: "${STAGING_PROJECT_REF:?}" "${SUPABASE_ACCESS_TOKEN:?}" "${SUPABASE_DB_PASSWORD:?}" "${STAGING_TEST_PASSWORD:?}"
ref="$STAGING_PROJECT_REF"
api="https://api.supabase.com/v1/projects/$ref"
auth=(-H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN")

if [ "$ref" = "$PRODUCTION_REF" ]; then
  echo "staging-reset: refusing, $ref is the production project." >&2
  exit 1
fi

project="$(curl -fsS "${auth[@]}" "$api")"
name="$(jq -r .name <<<"$project")"
if [ "$name" != "$STAGING_NAME" ]; then
  echo "staging-reset: refusing, project $ref is named '$name', not '$STAGING_NAME'." >&2
  exit 1
fi

# Free projects pause after a week without activity.
status="$(jq -r .status <<<"$project")"
if [ "$status" != "ACTIVE_HEALTHY" ]; then
  echo "staging-reset: project is $status, restoring"
  [ "$status" = "INACTIVE" ] && curl -fsS -X POST "${auth[@]}" "$api/restore" >/dev/null
  for _ in $(seq 1 60); do
    status="$(curl -fsS "${auth[@]}" "$api" | jq -r .status)"
    [ "$status" = "ACTIVE_HEALTHY" ] && break
    sleep 10
  done
  [ "$status" = "ACTIVE_HEALTHY" ] || { echo "staging-reset: project still $status after 10 min" >&2; exit 1; }
fi

echo "staging-reset: resetting $ref ($name)"
supabase db reset --remote="$ref" --yes

# Auth admin API with the project's service-role credential.
keys="$(curl -fsS "${auth[@]}" "$api/api-keys?reveal=true")"
service_key="$(jq -r '[.[] | select(.name == "service_role" or .type == "secret")][0].api_key' <<<"$keys")"
[ -n "$service_key" ] && [ "$service_key" != "null" ] || { echo "staging-reset: no service-role key found" >&2; exit 1; }
admin=(-H "apikey: $service_key" -H "Content-Type: application/json")
[[ "$service_key" == sb_secret_* ]] || admin+=(-H "Authorization: Bearer $service_key")

body="$(jq -n --arg p "$STAGING_TEST_PASSWORD" '{password: $p}')"
for id in "${SEED_USERS[@]}"; do
  curl -fsS -X PUT "${admin[@]}" -d "$body" "https://$ref.supabase.co/auth/v1/admin/users/$id" >/dev/null
done

echo "staging-reset: done (migrations + seed applied, ${#SEED_USERS[@]} test passwords replaced)"
