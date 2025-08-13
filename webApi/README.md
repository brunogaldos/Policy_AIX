# Live Web Research Example - ExpressJS API

## 🚀 Quick Start

**For complete setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)**

### Requirements
- OPENAI API KEY
- GOOGLE custom search setup without scoping
- Redis running on localhost (optional for persistence of research conversations)
- PostgreSQL database
- Weaviate vector database (optional)

### Quick Start
```bash
# Install dependencies (includes Puppeteer version fixes)
npm install

# Copy environment file
cp .env.example_FINAL .env
# Edit .env with your API keys

# Start the server
./start.sh
```

**Note**: This project includes fixes for Puppeteer version conflicts and TypeScript compilation errors. See SETUP_GUIDE.md for detailed information.
# websearch_AI


---

````markdown
# 🧠 Backend Architecture Overview

This document provides a detailed explanation of the backend structure, module usage, and data flow powering the Live Research System.

---

## 1. Core Node Modules & Dependencies

### 📦 Primary Dependencies (`package.json`)
- **`@policysynth/agents`** – Core research agents, database models, base classes.
- **`@policysynth/api`** – API framework, routing controllers, base chatbot logic.
- **`@langchain/openai`** – LangChain + OpenAI integration for structured LLM usage.
- **`html-to-text`** – Converts HTML pages into readable plain text.

### 🔁 Key Transitive Dependencies (Installed Automatically)
- `express` – Web framework for HTTP endpoints.
- `ws` – WebSocket server for live communications.
- `ioredis` – Redis client for memory and session management.
- `sequelize` – ORM for PostgreSQL database.
- `pg` – PostgreSQL client driver.
- `openai` – API wrapper for GPT models.
- `puppeteer` – Headless Chromium browser for web scraping.
- `connect-redis` – Redis session store integration for Express.
- `body-parser` – Middleware for parsing JSON request bodies.
- `uuid` – Unique identifier generation (used for WebSocket clients).

---

## 2. Application Startup Flow

The backend system initializes in the following order:

### 🚀 Bootstrapping
- **`server.ts`** – Creates the main `PolicySynthApiApp` instance.
- **`PolicySynthApiApp`** – Handles system-wide setup:
  - HTTP server on **port `5029`**
  - WebSocket server on **path `/ws`**
  - Redis clients for memory and session storage
  - Database connection via `connectToDatabase()`
  - All controllers including `LiveResearchChatController`

---

## 3. PostgreSQL Database Integration

### 🔌 Connection Setup
Configured in `sequelize.js`:
```ts
const sequelize = new Sequelize(
  process.env.PSQL_DB_NAME,
  process.env.PSQL_DB_USER,
  process.env.PSQL_DB_PASS,
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: "postgres",
    dialectModule: pg
  }
);
````

### 🗃 Tables Created

| Table Name              | Description                      |
| ----------------------- | -------------------------------- |
| `ps_agents`             | Research agent instances/configs |
| `ps_agent_audit_logs`   | Logs of agent actions            |
| `ps_model_usage`        | Tracks OpenAI API usage          |
| `ps_external_api_usage` | Tracks calls to external APIs    |
| `yp_users`              | Registered users                 |
| `yp_groups`             | Organization/group memberships   |
| `ps_agent_classes`      | Agent class/type definitions     |
| `ps_ai_models`          | LLM model configuration          |

### 💾 Usage Summary

| Data Type                | Storage    |
| ------------------------ | ---------- |
| Chat logs & memory       | Redis      |
| Research agent configs   | PostgreSQL |
| Usage stats (OpenAI/API) | PostgreSQL |
| Session info             | Redis + PG |

---

## 4. Research Pipeline & Node Dependencies

### 🔍 Research Agent Breakdown

| Agent/Module             | Purpose                               |
| ------------------------ | ------------------------------------- |
| `SearchQueriesGenerator` | Generates search queries using OpenAI |
| `SearchQueriesRanker`    | Ranks queries via LLM pairwise logic  |
| `ResearchWeb`            | Interfaces with Google/Bing APIs      |
| `SearchResultsRanker`    | Scores results using GPT              |
| `WebPageScanner`         | Scrapes and extracts webpage content  |

### 🔧 Supporting Libraries

* `html-to-text` – Cleans up HTML for analysis
* `axios` – Makes HTTP API requests
* `cheerio` – Parses and manipulates HTML DOM
* `marked` – Markdown-to-HTML renderer

---

## 5. WebSocket & Real-time Communication

### 🔄 Communication Workflow

* WebSocket server created via `ws` package
* On connect:

  * A `clientId` is generated via `uuid`
  * Stored in a `wsClients` map: `clientId → WebSocket`
  * Used for streaming real-time bot responses

### 🧠 Real-time Streaming

* Bot outputs streamed through `PsBaseChatBot.streamWebSocketResponses()`
* Token usage, costs, and status updates delivered live
* Client listens using `PsChatAssistant.onMessage()`

### 🔐 Session Management

* `express-session` + `connect-redis` handle HTTP session persistence
* WebSocket sessions are **separate** and identified via `clientId`

---

## 6. Memory & Persistence Strategy

### 🧠 Redis (Short-term)

| Key Pattern                    | Purpose                       |
| ------------------------------ | ----------------------------- |
| `ps-chatbot-memory-{memoryId}` | Stores chat + research memory |
| `ps:{sessionId}`               | HTTP session state            |
| `live-costs:{session}`         | Token cost tracking           |

### 🗃 PostgreSQL (Long-term)

| Data                   | Stored In      |
| ---------------------- | -------------- |
| Agent configurations   | PostgreSQL     |
| OpenAI/API usage stats | PostgreSQL     |
| Audit logs             | PostgreSQL     |
| Chat memory            | ❌ *Not stored* |

---

## 7. Environment Variables

### 📂 PostgreSQL Config

```env
PSQL_DB_NAME=your_database
PSQL_DB_USER=your_user
PSQL_DB_PASS=your_password
DB_HOST=localhost
DB_PORT=5432
```

### 🧠 Redis Config

```env
REDIS_MEMORY_URL=redis://localhost:6379
REDIS_AGENT_URL=redis://localhost:6379
```

### 🤖 OpenAI Config

```env
OPENAI_API_KEY=your_openai_key
```

### 🔐 Session Security

```env
SESSION_SECRET=your_session_secret
```

---
