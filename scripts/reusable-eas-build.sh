#!/usr/bin/env bash
# Decides whether the newest finished EAS iOS build of a profile can be used
# again instead of spending one of the month's builds (Free plan: 15 iOS).
#
#   scripts/reusable-eas-build.sh <profile>
#
# A build is reusable when nothing that goes into the app changed between the
# commit it was built from and HEAD (see APP_UNCHANGED_EXCLUDES below), its
# artifact has not expired, and, for `production`, it was never uploaded
# (no v<version>-build.<n> tag yet: App Store Connect rejects a build number
# twice). Anything unknown counts as a change, so the fallback is a new build.
#
# Prints `key=value` lines (reuse, id, url, commit, version, build_number,
# reason); in GitHub Actions they also go to $GITHUB_OUTPUT. Needs eas, jq,
# an EXPO_TOKEN (or `eas login`) and the full git history with tags.
# Docs: docs/DEVELOPMENT_WORKFLOW.md §4 → Staging and the release workflow.
set -euo pipefail

profile="${1:?usage: reusable-eas-build.sh <profile>}"
eas_cmd="${EAS:-eas}"

# Paths that never reach the app binary. Everything else (src, assets,
# plugins, app.json, eas.json, package*.json, configs, anything new) does.
# Supabase is excluded on purpose: staging is reset from the migrations on
# every run, so a server change is tested without a new app build.
APP_UNCHANGED_EXCLUDES=(
  ':(exclude)docs'
  ':(exclude)design'
  ':(exclude)website'
  ':(exclude)supabase'
  ':(exclude)scripts'
  ':(exclude).maestro'
  ':(exclude).github'
  ':(exclude).vscode'
  ':(exclude)*.md'
  ':(exclude)LICENSE'
  ':(exclude)renovate.json'
  ':(exclude)eslint.config.js'
  ':(exclude).env.example'
  ':(exclude)src/**/*.test.ts'
  ':(exclude)src/**/*.test.tsx'
)

emit() {
  printf '%s\n' "$@"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then printf '%s\n' "$@" >> "$GITHUB_OUTPUT"; fi
}
no_reuse() { emit "reuse=false" "reason=$1"; exit 0; }

if [ "${FORCE_NEW_BUILD:-false}" = "true" ]; then
  no_reuse "a new build was requested"
fi

build="$($eas_cmd build:list --platform ios --build-profile "$profile" --status finished \
  --limit 1 --json --non-interactive 2>/dev/null | jq -c '.[0] // empty')" \
  || no_reuse "could not list EAS builds"
[ -n "$build" ] || no_reuse "no finished $profile build on EAS"

id="$(jq -r '.id' <<<"$build")"
url="$(jq -r '.artifacts.buildUrl // empty' <<<"$build")"
commit="$(jq -r '.gitCommitHash // empty' <<<"$build")"
version="$(jq -r '.appVersion' <<<"$build")"
build_number="$(jq -r '.appBuildVersion' <<<"$build")"
expires="$(jq -r '.expirationDate // empty' <<<"$build")"
label="$profile build $id ($version, build $build_number, ${commit:0:7})"

[ -n "$url" ] && [ -n "$commit" ] || no_reuse "$label has no artifact or commit"
git cat-file -e "$commit^{commit}" 2>/dev/null || no_reuse "$label: commit not in this history"
git merge-base --is-ancestor "$commit" HEAD || no_reuse "$label: commit is not an ancestor of HEAD"

# Keep a day of margin so the artifact is still there when the job downloads it.
if [ -z "$expires" ] || [ "$(jq -n --arg e "$expires" '($e | sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601) > (now + 86400)')" != "true" ]; then
  no_reuse "$label: artifact expires soon or has no expiry date"
fi

changed="$(git diff --name-only "$commit" HEAD -- . "${APP_UNCHANGED_EXCLUDES[@]}")"
if [ -n "$changed" ]; then
  echo "App files changed since ${commit:0:7}:" >&2
  head -20 <<<"$changed" >&2
  no_reuse "$label: app files changed since it was built"
fi

if [ "$profile" = "production" ] && git rev-parse -q --verify "refs/tags/v$version-build.$build_number" >/dev/null; then
  no_reuse "$label was already released (tag v$version-build.$build_number)"
fi

emit "reuse=true" "id=$id" "url=$url" "commit=$commit" "version=$version" \
  "build_number=$build_number" "reason=reusing $label"
