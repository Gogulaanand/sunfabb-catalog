#!/usr/bin/env bash

set -uo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly MONITOR_SCRIPT="${SCRIPT_DIR}/production-monitor.sh"
readonly TEST_TMP="$(mktemp -d)"
readonly FAKE_BIN="${TEST_TMP}/bin"

mkdir -p "$FAKE_BIN"
trap 'rm -rf "$TEST_TMP"' EXIT

write_fake_curl() {
  local http_code="$1"
  local duration_seconds="$2"
  local exit_code="${3:-0}"

  printf '%s\n' \
    '#!/usr/bin/env bash' \
    "printf '%s\\n' '${http_code} ${duration_seconds}'" \
    "exit ${exit_code}" \
    > "${FAKE_BIN}/curl"
  chmod +x "${FAKE_BIN}/curl"
}

run_monitor() {
  PATH="${FAKE_BIN}:${PATH}" \
    CHECK_ATTEMPTS=2 \
    FRONTEND_SLOW_MS=25000 \
    BACKEND_SLOW_MS=10000 \
    bash "$MONITOR_SCRIPT" > "${TEST_TMP}/output.log" 2>&1
}

assert_output_contains() {
  local expected="$1"

  if ! grep -Fq "$expected" "${TEST_TMP}/output.log"; then
    echo "Expected monitor output to contain: ${expected}"
    cat "${TEST_TMP}/output.log"
    exit 1
  fi
}

write_fake_curl 200 0.100000
if ! run_monitor; then
  echo "Expected successful probes to pass"
  cat "${TEST_TMP}/output.log"
  exit 1
fi
assert_output_contains "All production checks passed."

write_fake_curl 503 0.100000
if run_monitor; then
  echo "Expected non-2xx probes to fail"
  exit 1
fi
assert_output_contains "returned HTTP 503"

write_fake_curl 000 0.000000 7
if run_monitor; then
  echo "Expected transport failures to fail"
  exit 1
fi
assert_output_contains "transport failure"

write_fake_curl 200 30.000000
if run_monitor; then
  echo "Expected sustained slow probes to fail"
  exit 1
fi
assert_output_contains "sustained latency"

if PATH="${FAKE_BIN}:${PATH}" CHECK_ATTEMPTS=0 bash "$MONITOR_SCRIPT" > "${TEST_TMP}/output.log" 2>&1; then
  echo "Expected invalid monitor configuration to fail"
  exit 1
fi
assert_output_contains "CHECK_ATTEMPTS must be a positive integer"

echo "Production monitor tests passed."
