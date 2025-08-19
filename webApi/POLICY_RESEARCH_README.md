# Policy Research Assistant - Integrated System

## Overview

The Policy Research Assistant is a hybrid system that combines the capabilities of both the RAG bot (for NO₂ data retrieval) and the live research bot (for policy recommendations) to provide comprehensive policy analysis for governments and policymakers.

## Architecture

### Components

1. **PolicyResearchAssistant** (`src/policyResearch/policyResearchAssistant.ts`)
   - Main orchestrator class that coordinates both RAG and live research
   - Handles city name extraction, data retrieval, and response synthesis
   - Manages conversation flow and follow-up questions

2. **PolicyResearchController** (`src/controllers/policyResearchController.ts`)
   - REST API controller for the integrated system
   - Handles HTTP requests and WebSocket communication
   - Manages memory persistence and chat history

3. **Test Script** (`test-policy-research.js`)
   - Demonstrates the integrated functionality
   - Tests basic requests, follow-ups, and CORS

## Features

### ✅ Integrated Workflow
- **Step 1**: Extract city name from user query
- **Step 2**: Retrieve NO₂ data from RAG database
- **Step 3**: Generate research queries based on NO₂ levels
- **Step 4**: Perform live web research for policies
- **Step 5**: Synthesize comprehensive recommendations

### ✅ Smart City Detection
- Automatic extraction of city names from natural language queries
- Pattern matching for various query formats
- Fallback mechanisms for ambiguous city names

### ✅ Contextual Research
- Research queries tailored to specific NO₂ levels
- Focus on relevant policy areas (transportation, urban planning, etc.)
- Real-time web search for current policies and regulations

### ✅ Professional Output
- Structured responses with markdown formatting
- Clear sections: Data Summary, Policy Analysis, Recommendations, Timeline, Sources
- Evidence-based recommendations with citations

## API Endpoints

### Main Policy Research Endpoint
```
PUT /api/policy_research/
```

**Request Body:**
```json
{
  "chatLog": [
    {
      "sender": "user",
      "message": "What policies should Cali implement based on NO₂ levels?",
      "date": "2025-08-16T21:30:00.000Z"
    }
  ],
  "wsClientId": "client-123",
  "memoryId": "memory-456",
  "dataLayout": {
    "categories": ["Air Quality", "Transportation", "Urban Planning"],
    "aboutProject": "Skills First Policy Research Assistant"
  }
}
```

### Chat History Retrieval
```
GET /api/policy_research/:memoryId
```

### CORS Test
```
GET /api/policy_research/test
```

## Usage Examples

### Example 1: Basic Policy Research
```javascript
const response = await fetch('/api/policy_research/', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chatLog: [{
      sender: 'user',
      message: 'What policies should Cali implement based on NO₂ levels?',
      date: new Date().toISOString()
    }],
    wsClientId: 'test-client',
    memoryId: 'test-memory'
  })
});
```

### Example 2: Follow-up Question
```javascript
const response = await fetch('/api/policy_research/', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chatLog: [
      // Previous conversation...
      {
        sender: 'user',
        message: 'What are the implementation costs?',
        date: new Date().toISOString()
      }
    ],
    wsClientId: 'test-client',
    memoryId: 'test-memory'
  })
});
```

## Response Format

The system provides structured responses with the following sections:

### 1. City NO₂ Data Summary
- Current NO₂ levels and trends
- Historical data comparison
- Health impact assessment

### 2. Policy Analysis
- Relevant existing policies
- Effectiveness evaluation
- Implementation challenges

### 3. Recommendations
- Specific policy actions
- Prioritization framework
- Expected outcomes

### 4. Implementation Timeline
- Short-term actions (0-6 months)
- Medium-term initiatives (6-18 months)
- Long-term strategies (18+ months)

### 5. Sources
- Data citations
- Policy document references
- Research paper links

## Testing

### Run the Test Script
```bash
cd webApi
node test-policy-research.js
```

### Manual Testing
1. Start the server: `npm run start`
2. Use the test script or make direct API calls
3. Monitor WebSocket connections for real-time updates

## Configuration

### Environment Variables
Ensure these are set in your `.env` file:
```bash
AI_MODEL_API_KEY=your_openai_key
AI_MODEL_NAME=gpt-4-turbo
AI_MODEL_PROVIDER=openai
AI_MODEL_TEMPERATURE=0.3
AI_MODEL_MAX_TOKENS_OUT=4000
```

### Research Parameters
The system uses configurable research parameters:
- `numberOfSelectQueries`: 5 (default)
- `percentOfTopQueriesToSearch`: 0.25 (25%)
- `percentOfTopResultsToScan`: 0.25 (25%)

## Integration with Existing Systems

### Backward Compatibility
- Original RAG bot (`/api/rd_chat`) remains functional
- Live research bot (`/api/live_research_chat`) remains functional
- New integrated system (`/api/policy_research`) provides enhanced experience

### Memory Management
- Each conversation maintains its own memory
- Redis persistence for conversation history
- Cost tracking across all operations

## Development

### Adding New Features
1. Extend `PolicyResearchAssistant` class
2. Add new methods for specific functionality
3. Update controller to handle new endpoints
4. Add tests to `test-policy-research.js`

### Customizing Research Queries
Modify the `generateResearchQueries` method in `PolicyResearchAssistant` to add domain-specific queries.

### Enhancing City Detection
Improve the `extractCityName` method with more sophisticated NLP or add a city database.

## Troubleshooting

### Common Issues

1. **Memory Errors**: Ensure all agents have proper memory objects
2. **API Key Issues**: Verify OpenAI API key is set correctly
3. **WebSocket Errors**: Check WebSocket connection and client ID
4. **Research Failures**: Monitor research bot logs for query generation issues

### Debug Mode
Enable debug logging by setting:
```bash
WINSTON_LOG_LEVEL=debug
```

## Future Enhancements

### Planned Features
- [ ] Multi-city comparison analysis
- [ ] Policy effectiveness scoring
- [ ] Implementation cost estimation
- [ ] Stakeholder analysis
- [ ] Risk assessment framework
- [ ] International policy benchmarking

### Technical Improvements
- [ ] Enhanced city name extraction with NLP
- [ ] Caching for frequently requested cities
- [ ] Parallel research query execution
- [ ] Advanced result ranking algorithms
- [ ] Real-time policy monitoring

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs for error details
3. Test with the provided test script
4. Verify environment configuration

---

**Note**: This integrated system maintains all functionalities of both the original RAG bot and live research bot while providing a seamless experience for policy research queries.







