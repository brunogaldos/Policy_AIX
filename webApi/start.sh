#!/usr/bin/env bash
set -euo pipefail

# Load variables from .env file (if it exists)
if [[ -f .env ]]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "⚠️  .env file not found."
  exit 1
fi

# Ensure required vars are set
: "${PSQL_DB_NAME:?Missing PSQL_DB_NAME in .env}"
: "${PSQL_DB_USER:?Missing PSQL_DB_USER in .env}"
: "${PSQL_DB_PASS:?Missing PSQL_DB_PASS in .env}"
: "${DB_HOST:?Missing DB_HOST in .env}"
: "${DB_PORT:?Missing DB_PORT in .env}"
: "${GOOGLE_SEARCH_API_KEY:?Missing GOOGLE_SEARCH_API_KEY in .env}"
: "${GOOGLE_SEARCH_API_CX_ID:?Missing GOOGLE_SEARCH_API_CX_ID in .env}"
: "${OPENAI_API_KEY:?Missing OPENAI_API_KEY in .env}"
: "${DISABLE_FORCE_HTTPS:?Missing DISABLE_FORCE_HTTPS in .env}"

# Run npm with variables already in the environment
npm run watch-start