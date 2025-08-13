#!/usr/bin/env bash
set -euo pipefail
echo "🧹 Cleaning up existing processes..."

# Kill any existing Node.js processes on port 5029
echo "   Killing processes on port 5029..."
pkill -f "node.*5029" || true
pkill -f "nodemon.*5029" || true

# Kill any existing Node.js server processes
echo "   Killing existing Node.js server processes..."
pkill -f "node.*server.js" || true
pkill -f "nodemon.*server.js" || true

# Kill any processes using the WebSocket port
echo "   Killing WebSocket processes..."
pkill -f "ws.*5029" || true

# Wait a moment for processes to fully terminate
sleep 2

echo "✅ Cleanup complete!"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/docker"
docker compose up -d
sleep 5

# Load variables from .env file (if it exists)
if [[ -f .env ]]; then
  set -a
  source .env
  set +a
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
: "${WEAVIATE_API_KEY:?Missing WEAVIATE_API_KEY in .env}"

# Run npm with variables already in the environment
cd ..
npm run watch-start
