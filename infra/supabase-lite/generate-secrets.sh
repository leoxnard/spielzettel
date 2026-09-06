#!/usr/bin/env bash
# Generates ANON_KEY and SERVICE_ROLE_KEY: long-lived HS256 JWTs signed with
# your JWT_SECRET, carrying the role claim PostgREST/Kong expect. No network
# calls — pure openssl, so your JWT_SECRET never leaves this machine.
#
# Usage: ./generate-secrets.sh <jwt-secret>

set -euo pipefail

JWT_SECRET="${1:?Usage: generate-secrets.sh <jwt-secret>}"

b64url() {
  openssl base64 -A | tr '+/' '-_' | tr -d '='
}

sign() {
  local role="$1"
  local iat exp header payload header_b64 payload_b64 signing_input signature
  iat=$(date +%s)
  exp=$((iat + 60 * 60 * 24 * 365 * 10)) # 10 years
  header='{"alg":"HS256","typ":"JWT"}'
  payload="{\"role\":\"${role}\",\"iss\":\"supabase\",\"iat\":${iat},\"exp\":${exp}}"
  header_b64=$(printf '%s' "$header" | b64url)
  payload_b64=$(printf '%s' "$payload" | b64url)
  signing_input="${header_b64}.${payload_b64}"
  signature=$(printf '%s' "$signing_input" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64url)
  printf '%s.%s' "$signing_input" "$signature"
}

echo "ANON_KEY=$(sign anon)"
echo "SERVICE_ROLE_KEY=$(sign service_role)"
