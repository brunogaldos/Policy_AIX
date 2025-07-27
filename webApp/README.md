# Live Web Research Example - Web App

## To run (will open browser)
```
npm install
GOOGLE_SEARCH_API_KEY=... GOOGLE_SEARCH_API_CX_ID=...OPENAI_API_KEY=... DISABLE_FORCE_HTTPS=true npm run watch-start
```

file:///home/athena/Downloads/policy_AI_COMPLETE.jpg



# Pipeline Flow Explanation

## 1. Initial Setup & WebSocket Connection

- **Frontend:** `PsChatAssistant` connects to `ws://localhost:5029/ws`
- **Backend:** `PolicySynthApiApp` sets up a WebSocket server at `/ws`
- **Handshake:** Server generates a `clientId` and sends it to the frontend
- **Storage:** Frontend stores `wsClientId` for future API interactions

## 2. User Interaction Flow

- **User Input:** Sent from `LiveResearchChatBot`
- **HTTP Call:** `ResearchServerApi.conversation()` → `PUT /api/live_research_chat/`
- **Payload:** Includes `wsClientId`, `chatLog`, and configuration

## 3. Backend Processing

- **Controller:** `LiveResearchChatController.liveResearchChat()` receives the request
- **Bot Instantiation:** `LiveResearchChatBot` is created and linked to WebSocket client
- **WebSocket Lookup:** Bot uses `wsClientId` to stream results to frontend

## 4. Research Pipeline (Sequential)

- `SearchQueriesGenerator`: Generates relevant queries
- `SearchQueriesRanker`: Ranks them using LLM-based pairwise comparison
- `ResearchWeb`: Conducts the web search
- `SearchResultsRanker`: Scores the results
- `WebPageScanner`: Scrapes and extracts content
- `OpenAI`: Summarizes final output from gathered context

## 5. Real-time Updates via WebSocket

- Status messages (`agentStart`, `agentCompleted`)
- Token usage cost tracking
- Live streaming of LLM final output (character-by-character)
- `PsChatAssistant` listens and displays all messages

## 6. Key Components Mapping

| Frontend Component                  | Backend Component                          | Purpose                             |
|-----------------------------------|-------------------------------------------|-----------------------------------|
| `wsClientId`                      | `wsClients.get(clientId)`                  | WebSocket client mapping           |
| `ResearchServerApi.conversation()` | `LiveResearchChatController.liveResearchChat()` | API endpoint for triggering research |
| `PsChatAssistant.onMessage()`     | `PsBaseChatBot.streamWebSocketResponses()` | Handle and display WebSocket messages |
| `serverMemoryId`                  | Redis                                     | Persistent memory for chat/costs   |
| Research parameters               | Research agent config                      | Control pipeline behavior          |

## 7. Data Flow Summary

- **HTTP:** Request/response for triggering research
- **WebSocket:** Bidirectional stream for updates and final result
- **Redis:** Long-term memory for research sessions
- **OpenAI API:** All LLM-based logic (ranking, summarization, etc.)

# System Design Highlights

- **Separation of Concerns:**
  - HTTP for command-style actions
  - WebSocket for real-time feedback
  - Redis for state/memory

- **Modular Research Agents:** Query generation, search, ranking, and summarization are isolated
- **Scalable WebSocket Handling:** Uses a centralized `wsClients` map
- **LLM-powered Reasoning:** GPT-4 drives query scoring and content summarization

# Requirements

- Node.js
- Redis
- OpenAI API Key
- WebSocket-compatible frontend (tested on modern browsers)
