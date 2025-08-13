# 🚀 Web Research Tool Setup Guide

This guide will help you set up the Web Research Tool on a new laptop with all the fixes and dependencies we've implemented.

## 📋 Prerequisites

- **Node.js**: v20.19.4 or higher
- **npm**: v10.8.2 or higher
- **PostgreSQL**: Running on localhost:5432
- **Redis**: Running on localhost:6379
- **Weaviate**: Running on localhost:8080 (optional, for vector storage)

## 🔧 Step-by-Step Setup

### 1. Clone and Navigate
```bash
cd webApi
```

### 2. Install Dependencies
```bash
npm install
```

**This will automatically:**
- Install all npm dependencies
- Copy local agent files (including ingestionConstants)
- Copy local API files
- Apply Puppeteer version overrides

**Key Dependencies (already configured in package.json):**
- `puppeteer@24.16.1` (fixed version to resolve type conflicts)
- `@policysynth/agents@1.3.130` (with local modifications)
- `@policysynth/api@1.2.13` (with local modifications)
- `weaviate-client@3.8.0`

### 3. Environment Configuration

Create a `.env` file based on `.env.example_FINAL`:

```bash
# Database Configuration
DATABASE_URL=postgresql://policysynth:policysynth123@localhost:5432/policysynth
PSQL_DB_NAME=policysynth
PSQL_DB_USER=policysynth
PSQL_DB_PASS=policysynth123
DB_HOST=localhost
DB_PORT=5432

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_MEMORY_URL=redis://localhost:6379
REDIS_AGENT_URL=redis://localhost:6379

# Weaviate Vector Database
WEAVIATE_APIKEY=your_weaviate_api_key_here
WEAVIATE_HTTP_SCHEME=http
WEAVIATE_HOST=localhost:8080

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
AI_MODEL_API_KEY=your_openai_api_key_here
AI_MODEL_NAME=gpt-4-turbo
AI_MODEL_PROVIDER=openai
AI_MODEL_TYPE=chat
AI_MODEL_REASONING_EFFORT=medium
AI_MODEL_MAX_THINKING_TOKENS=4000
AI_MODEL_MAX_TOKENS_OUT=4096
AI_MODEL_TEMPERATURE=0.0

# Google Search API (for web research)
GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
GOOGLE_SEARCH_API_CX_ID=your_google_search_cx_id_here

# Application Configuration
PORT=5029
NODE_ENV=development
DISABLE_FORCE_HTTPS=true
WORKER_LOG_LEVEL=debug
```

### 4. Start Docker Services (if using docker-compose)
```bash
cd docker
docker compose up -d
cd ..
```

### 5. Start the Server
```bash
./start.sh
```

## 🔧 Key Fixes Applied

### Puppeteer Version Alignment
- **Problem**: Type conflicts between Puppeteer v22.15.0 and v24.14.0
- **Solution**: Added `"overrides": { "puppeteer": "24.16.1" }` to package.json
- **Result**: All packages now use the same Puppeteer version

### TypeScript Error Fixes
- **Problem**: `count` variable of type 'unknown' in `countDuplicateUrls` method
- **Solution**: Added type assertion `(count as number)`
- **Result**: Clean TypeScript compilation with 0 errors

## ✅ Verification

After setup, you should see:
```
[3:23:48 PM] Found 0 errors. Watching for file changes.
App listening on the port 5029
```

## 🐛 Troubleshooting

### Puppeteer Issues
If you see Puppeteer type conflicts:
```bash
npm list puppeteer
```
Should show all packages using the same version (24.16.1).

### TypeScript Errors
If you see compilation errors:
```bash
npx tsc --noEmit
```
Should show 0 errors.

### Environment Issues
Make sure all required environment variables are set in `.env` file.

## 📁 Project Structure

```
webApi/
├── src/
│   ├── ingestion/          # Document processing and caching
│   ├── vectorstore/        # Weaviate integration
│   ├── chatbot/           # Chat functionality
│   └── controllers/       # API endpoints
├── package.json           # Dependencies with overrides
├── tsconfig.json          # TypeScript configuration
├── start.sh              # Startup script
└── .env                  # Environment variables
```

## 🚀 API Endpoints

Once running, the API will be available at:
- **HTTP Server**: http://localhost:5029
- **WebSocket**: ws://localhost:5029/ws

## 📝 Notes

- The server runs in watch mode, automatically recompiling on file changes
- All Puppeteer conflicts have been resolved
- TypeScript compilation is clean with 0 errors
- RAG functionality should work without issues
