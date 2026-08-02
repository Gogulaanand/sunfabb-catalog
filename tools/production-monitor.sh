#!/usr/bin/env bash

set -uo pipefail

readonly FRONTEND_URL="${FRONTEND_URL:-https://sunfabb.com}"
readonly BACKEND_URL="${BACKEND_URL:-https://sunfabb-backend.onrender.com}"
readonly CHECK_ATTEMPTS="${CHECK_ATTEMPTS:-2}"
readonly FRONTEND_SLOW_MS="${FRONTEND_SLOW_MS:-25000}"
readonly BACKEND_SLOW_MS="${BACKEND_SLOW_MS:-10000}"
readonly CURL_MAX_TIME_SECONDS="${CURL_MAX_TIME_SECONDS:-35}"

require_positive_integer() {
  local name="$1"
  local value="$2"

  if [[ ! "$value" =~ ^[1-9][0-9]*$ ]]; then
    echo "::error title=Invalid monitor configuration::${name} must be a positive integer"
    exit 2
  fi
}

require_http_url() {
  local name="$1"
  local value="$2"

  if [[ ! "$value" =~ ^https?://[^[:space:]]+$ ]]; then
    echo "::error title=Invalid monitor configuration::${name} must be an absolute HTTP(S) URL"
    exit 2
  fi
}

require_positive_integer "CHECK_ATTEMPTS" "$CHECK_ATTEMPTS"
require_positive_integer "FRONTEND_SLOW_MS" "$FRONTEND_SLOW_MS"
require_positive_integer "BACKEND_SLOW_MS" "$BACKEND_SLOW_MS"
require_positive_integer "CURL_MAX_TIME_SECONDS" "$CURL_MAX_TIME_SECONDS"
require_http_url "FRONTEND_URL" "$FRONTEND_URL"
require_http_url "BACKEND_URL" "$BACKEND_URL"

readonly -a ROUTES=(
  "home|${FRONTEND_URL%/}/|$FRONTEND_SLOW_MS"
  "catalog|${FRONTEND_URL%/}/catalog|$FRONTEND_SLOW_MS"
  "pdp-4195|${FRONTEND_URL%/}/catalog/bedspread-design-4195|$FRONTEND_SLOW_MS"
  "pdp-4219|${FRONTEND_URL%/}/catalog/bedspread-design-4219|$FRONTEND_SLOW_MS"
  "contact|${FRONTEND_URL%/}/contact|$FRONTEND_SLOW_MS"
  "backend-health|${BACKEND_URL%/}/health|$BACKEND_SLOW_MS"
)

failed=0

for route in "${ROUTES[@]}"; do
  IFS='|' read -r label url threshold_ms <<< "$route"
  slow_attempts=0

  for ((attempt = 1; attempt <= CHECK_ATTEMPTS; attempt += 1)); do
    result=""
    if ! result=$(curl \
      --silent \
      --show-error \
      --location \
      --connect-timeout 10 \
      --max-time "$CURL_MAX_TIME_SECONDS" \
      --output /dev/null \
      --user-agent "sunfabb-production-monitor/1.0" \
      --write-out '%{http_code} %{time_total}' \
      "$url"); then
      echo "::error title=${label} transport failure::attempt ${attempt}/${CHECK_ATTEMPTS} could not reach ${url}"
      failed=1
      continue
    fi

    read -r http_code duration_seconds <<< "$result"
    duration_ms=$(awk -v seconds="$duration_seconds" 'BEGIN { printf "%.0f", seconds * 1000 }')

    if [[ ! "$http_code" =~ ^2[0-9][0-9]$ ]]; then
      echo "::error title=${label} returned HTTP ${http_code}::attempt ${attempt}/${CHECK_ATTEMPTS} failed for ${url}"
      failed=1
      continue
    fi

    if ((duration_ms > threshold_ms)); then
      slow_attempts=$((slow_attempts + 1))
      echo "::warning title=${label} slow response::attempt ${attempt}/${CHECK_ATTEMPTS} took ${duration_ms}ms (threshold ${threshold_ms}ms)"
    else
      echo "${label} attempt ${attempt}/${CHECK_ATTEMPTS}: HTTP ${http_code} in ${duration_ms}ms"
    fi
  done

  if ((slow_attempts == CHECK_ATTEMPTS)); then
    echo "::error title=${label} sustained latency::all ${CHECK_ATTEMPTS} attempts exceeded ${threshold_ms}ms"
    failed=1
  fi
done

if ((failed != 0)); then
  echo "One or more production checks failed."
  exit 1
fi

echo "All production checks passed."
