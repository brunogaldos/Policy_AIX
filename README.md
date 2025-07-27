## Live Web Research Example

# Steps
- Get Express API running
- Run the Web App

![image](https://github.com/CitizensFoundation/policy-synth/assets/43699/cc5165b0-7774-47dc-8d97-add17bde9a76)

![image](https://github.com/CitizensFoundation/policy-synth/assets/43699/4652a7ea-aaa5-4fd7-a098-bef4ce22af45)

![image](https://github.com/CitizensFoundation/policy-synth/assets/43699/b2cefd06-8bd7-4718-8850-923f7f844633)

![image](https://github.com/CitizensFoundation/policy-synth/assets/43699/8a31ed41-7c04-4f29-8a26-1fd4cdcac145)

![image](https://github.com/CitizensFoundation/policy-synth/assets/43699/0e5caa9d-1626-4440-afda-8b8d950b068d)

![image](https://github.com/CitizensFoundation/policy-synth/assets/43699/425c41b1-f9eb-41f4-b494-d35d41830a38)

[image](https://github.com/CitizensFoundation/policy-synth/assets/43699/495a0cd3-bc10-41d4-95f5-1cbbb6ef99c1)

![image](https://github.com/CitizensFoundation/policy-synth/assets/43699/24cb1672-0f0b-4241-a131-77a3bee2556d)

![image](https://github.com/CitizensFoundation/policy-synth/assets/43699/19e96ab2-fbc8-4d01-8ec2-1a16926d7d7e)





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
