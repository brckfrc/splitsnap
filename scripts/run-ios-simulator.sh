#!/usr/bin/env bash
#
# Boots an iOS simulator, then hands the build to Expo. Used by the `ios:27` npm
# script.
#
# Booting first keeps the install independent of how devicectl sees simulators.
# Expo resolves `--device` from a list that merges devicectl's devices with
# simctl's simulators and installs anything devicectl lists through devicectl,
# which only handles a simulator it already sees as connected. On Xcode 26.6 that
# path was taken for shut-down simulators: the build succeeded and the install
# failed with `CoreDeviceError 1001: the capability "Install Application" is not
# supported by this device`. Xcode 27's devicectl lists only booted simulators,
# which should avoid it, but booting here makes it a non-question.
#
# See docs/DEVELOPMENT_WORKFLOW.md §4.
set -euo pipefail

device="${1:?usage: run-ios-simulator.sh <simulator name or UDID> [expo args...]}"
shift

# -b boots the device when it is shut down, and either way returns only once the
# boot has finished — Expo would otherwise race a still-booting simulator.
xcrun simctl bootstatus "$device" -b

# Booting leaves the simulator headless, so try to put a window on screen —
# best-effort, and never fatal.
#
# This used to be a bare `open -a Simulator`, which resolves through
# LaunchServices and died with "Unable to find application named 'Simulator'",
# and because of `set -e` the build never started (hit on 2026-10-27 with
# Xcode 27, where Simulator.app is not present under the developer directory at
# all). `xcrun simctl` drives the device with no window, which is all the build
# and install actually need, so a missing window is a cosmetic problem and must
# not stop the run.
_ss_sim_app="$(xcode-select -p)/Applications/Simulator.app"
if [ -d "$_ss_sim_app" ]; then
  open -a "$_ss_sim_app" || true
else
  open -a Simulator 2>/dev/null \
    || echo "note: no Simulator.app found; the device runs headless (expo install still works)" >&2
fi

exec npx expo run:ios --device "$device" "$@"
