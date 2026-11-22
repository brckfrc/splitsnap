#!/usr/bin/env bash
#
# Runs the Maestro flows in .maestro/ against the booted iOS simulator and the
# local Supabase stack. Used by `npm run test:e2e`; local only, not in CI.
#
# Needs: Maestro (`brew install mobile-dev-inc/tap/maestro`), Java 21
# (`brew install openjdk@21`), the dev build installed on the booted simulator,
# Metro on port 8081 (`npm start`), and a running local stack (`supabase start`).
#
# The flows sign in as a seeded account. The password is never written to the
# repo: pass it in SMOKE_PASSWORD (SMOKE_EMAIL defaults to Deniz).
#
# Resets the LOCAL database first (`supabase db reset`, never --linked), so the
# flows start from seed.sql. Anything typed into the local app is lost.
#
# Usage: SMOKE_PASSWORD=… scripts/test-e2e.sh [flow.yaml ...]   (default: .maestro/smoke.yaml)
set -euo pipefail

cd "$(dirname "$0")/.."

: "${SMOKE_PASSWORD:?set SMOKE_PASSWORD to the local seed password}"
SMOKE_EMAIL="${SMOKE_EMAIL:-deniz@borak.dev}"

if [ -z "${JAVA_HOME:-}" ] && command -v brew >/dev/null; then
  export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"
fi
export MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true

curl -fsS -o /dev/null http://localhost:8081/status \
  || { echo "test-e2e: Metro is not running on :8081; start it with 'npm start'." >&2; exit 2; }

supabase db reset >/dev/null

if [ "$#" -gt 0 ]; then flows=("$@"); else flows=(.maestro/smoke.yaml); fi

maestro test -e APP_TARGET=dev -e SMOKE_EMAIL="$SMOKE_EMAIL" -e SMOKE_PASSWORD="$SMOKE_PASSWORD" "${flows[@]}"
