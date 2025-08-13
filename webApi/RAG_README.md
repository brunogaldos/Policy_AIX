# Skills First Research Tool - RAG System

This document describes the Retrieval-Augmented Generation (RAG) system implemented in the Skills First Research Tool project.

## Quick Start

### 1. Prerequisites
- Node.js 18+
- Docker and Docker Compose
- OpenAI API key
- Weaviate vector database

### 2. Environment Setup
```bash
# Copy environment variables
cp .env.example .env

# Edit .env with your API keys
nano .env
```

Required environment variables:
- `OPENAI_API_KEY` - Your OpenAI API key
- `WEAVIATE_HOST` - Weaviate host (default: localhost:8080)
- `WEAVIATE_HTTP_SCHEME` - Weaviate scheme (default: http)
- `WEAVIATE_API_KEY` - Weaviate API key (if using authentication)

### 3. Start Vector Database
```bash
cd src/vectorstore
docker-compose up -d
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Run Ingestion Pipeline
```bash
# Run the complete ingestion pipeline
node example-complete-rag.js

# Or run the ingestion directly
npm run ingest
```

### 6. Start the Server
```bash
npm run start
```

### 7. Test the RAG Chat
```bash
curl -X PUT http://localhost:5029/api/rag_chat \
  -H "Content-Type: application/json" \
  -d '{
    "chatLog": [{"sender": "user", "message": "What are the benefits of skills-first hiring?"}],
    "wsClientId": "test-user"
  }'
```

## Document Ingestion

The RAG system uses a sophisticated AI processing pipeline with 8 specialized agents:

### 1. **Document Analyzer Agent**
- Analyzes document structure and content
- Extracts metadata and key information
- Determines document type and format

### 2. **Document Cleanup Agent**
- Removes noise and irrelevant content
- Standardizes formatting
- Improves text quality for processing

### 3. **Document Classifier Agent**
- Categorizes documents by topic
- Assigns primary and secondary categories
- Helps with targeted retrieval

### 4. **Document Tree Split Agent**
- Splits documents into logical chunks
- Maintains document hierarchy
- Creates structured content segments

### 5. **Chunk Analyzer Agent**
- Analyzes individual chunks for relevance
- Extracts key concepts and themes
- Prepares chunks for compression

### 6. **Chunk Compressor Agent**
- Compresses chunk content while preserving meaning
- Creates summary versions for efficient storage
- Maintains semantic relationships

### 7. **Chunk Ranker Agent**
- Ranks chunks by relevance and quality
- Assigns importance scores
- Optimizes retrieval order

### 8. **Document Ranker Agent**
- Ranks entire documents by overall quality
- Assigns ELO ratings for relevance, substance, and quality
- Helps prioritize document retrieval

## Architecture

### Components

1. **Ingestion Pipeline** (`src/ingestion/`)
   - `agentProcessor.ts` - Main orchestration of AI agents
   - `ingestContent.ts` - Entry point for ingestion
   - `dataLayout.json` - Configuration for document sources

2. **Chatbot** (`src/chatbot/`)
   - `chatBot.ts` - Main conversation handler
   - `router.ts` - Question analysis and routing
   - `vectorSearch.ts` - Semantic search implementation

3. **Vector Store** (`src/vectorstore/`)
   - `ragDocument.ts` - Document vector operations
   - `ragChunk.ts` - Chunk vector operations
   - `docker-compose.yml` - Weaviate database setup

4. **API Controllers** (`src/controllers/`)
   - `ragChatController.ts` - RAG chat endpoint

### Data Flow

1. **Ingestion**: Documents → AI Processing → Vector Embeddings → Weaviate
2. **Query**: User Question → Router → Vector Search → Context Retrieval
3. **Response**: Context + Question → LLM → Formatted Answer

## Features

### Document Processing
- **Multi-format support**: PDFs, web pages, JSON data
- **AI-powered analysis**: Automatic categorization and ranking
- **Hierarchical chunking**: Maintains document structure
- **Compression**: Efficient storage with semantic preservation

### Search Capabilities
- **Semantic search**: Find relevant content by meaning
- **Multi-category routing**: Target specific document types
- **Context-aware**: Considers conversation history
- **Ranked results**: Prioritize most relevant content

### Chat Interface
- **Real-time streaming**: WebSocket-based responses
- **Memory persistence**: Redis-backed conversation history
- **Source attribution**: Links to original documents
- **Markdown formatting**: Rich text responses

## Configuration

### dataLayout.json
```json
{
  "documentUrls": [
    "https://www.oecd.org/education/skills-first-policy.html",
    "https://www.worldbank.org/en/topic/education/publication/skills-for-the-future"
  ],
  "jsonUrls": [
    "https://raw.githubusercontent.com/owid/owid-datasets/master/datasets/Education%20Statistics/Education%20Statistics.json"
  ],
  "categories": [
    "Skills Development",
    "Education Policy",
    "Employment Training",
    "Skills First Research"
  ],
  "aboutProject": "The Skills First Research Tool chatbot..."
}
```

### Environment Variables
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_key

# Weaviate Configuration
WEAVIATE_HOST=localhost:8080
WEAVIATE_HTTP_SCHEME=http
WEAVIATE_API_KEY=your_weaviate_key

# Redis Configuration (for memory persistence)
REDIS_URL=redis://localhost:6379
```

## Development

### Adding New Documents
1. Add URLs to `dataLayout.json`
2. Run ingestion: `node example-complete-rag.js`
3. Test with chat endpoint

### Customizing AI Agents
- Modify agent prompts in `src/ingestion/agentProcessor.ts`
- Adjust processing parameters in agent constructors
- Update categorization logic in `src/chatbot/router.ts`

### Extending Search
- Add new search strategies in `src/chatbot/vectorSearch.ts`
- Implement custom ranking algorithms
- Add filters for specific document types

## Troubleshooting

### Common Issues

1. **Weaviate Connection Errors**
   ```bash
   # Check if Weaviate is running
   docker ps | grep weaviate
   
   # Restart Weaviate
   cd src/vectorstore && docker-compose restart
   ```

2. **OpenAI API Errors**
   ```bash
   # Verify API key
   echo $OPENAI_API_KEY
   
   # Check API quota
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/usage
   ```

3. **Memory Issues**
   ```bash
   # Clear Redis cache
   redis-cli flushall
   
   # Check Redis connection
   redis-cli ping
   ```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run start

# Check specific component logs
DEBUG=policysynth:* npm run start
```

## API Reference

### RAG Chat Endpoint

**PUT** `/api/rag_chat`

Request body:
```json
{
  "chatLog": [
    {"sender": "user", "message": "What is skills-first hiring?"}
  ],
  "wsClientId": "user-123",
  "memoryId": "optional-memory-id"
}
```

Response:
```json
{
  "chatLog": [
    {"sender": "user", "message": "What is skills-first hiring?"},
    {"sender": "bot", "message": "Skills-first hiring..."}
  ],
  "totalCosts": 0.15
}
```

### Get Chat History

**GET** `/api/rag_chat/:memoryId`

Response:
```json
{
  "chatLog": [...],
  "totalCosts": 0.15
}
```

## Performance

### Optimization Tips
- Use document compression for large files
- Implement caching for frequently accessed content
- Batch process documents during ingestion
- Use appropriate chunk sizes for your use case

### Monitoring
- Track API usage and costs
- Monitor vector search performance
- Check memory usage and Redis performance
- Log user interactions for improvement

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation for changes
4. Use TypeScript for type safety
5. Follow the established naming conventions

## License

This RAG system is part of the Skills First Research Tool project.
