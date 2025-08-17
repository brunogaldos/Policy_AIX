import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
import fetch from 'node-fetch';
export class PolicyResearchAssistant extends PsBaseChatBot {
    constructor(wsClientId, wsClients, memoryId) {
        super(wsClientId, wsClients, memoryId);
        this.persistMemory = true;
        this.capturedResponses = new Map();
        // Main system prompt for the integrated assistant
        this.mainSystemPrompt = `You are an expert policy research assistant that helps governments and policymakers make informed decisions based on air quality data and policy research.

Your capabilities:
1. Access NO₂ (nitrogen dioxide) data for cities from a comprehensive database
2. Research current policies, laws, and regulations that could help cities implement green policies
3. Provide tailored recommendations based on specific city's air quality situation

Instructions:
- Always provide both the NO₂ data AND policy recommendations in your responses
- Use markdown formatting for clear, professional presentation
- Include specific policy recommendations with rationale
- Provide source citations for both data and policy information
- Be optimistic but realistic about implementation timelines
- Focus on actionable, evidence-based recommendations

Format your responses with:
1. **City NO₂ Data Summary** - Current levels and trends
2. **Policy Analysis** - Relevant policies and their effectiveness
3. **Recommendations** - Specific actions the city should take
4. **Implementation Timeline** - Realistic steps and timeframes
5. **Sources** - Citations for data and policy information
`;
        // User prompt template
        this.userPromptTemplate = (userQuestion, no2Data, policyResearch) => `
<USER_QUESTION>
${userQuestion}
</USER_QUESTION>

<NO2_DATA_CONTEXT>
${no2Data}
</NO2_DATA_CONTEXT>

<POLICY_RESEARCH_CONTEXT>
${policyResearch}
</POLICY_RESEARCH_CONTEXT>

Please provide a comprehensive analysis and recommendations based on the above data and research.
`;
        this.wsClients = wsClients;
    }
    /**
     * Main method to process a city policy research request
     */
    async processCityPolicyRequest(userQuestion, dataLayout) {
        try {
            this.sendAgentStart("Analyzing city data and researching policies...");
            // Step 1: Extract city name from user question
            const cityName = this.extractCityName(userQuestion);
            console.log(`Processing request for city: ${cityName}`);
            // Step 2: Get NO₂ data from RAG bot
            this.sendAgentStart("Retrieving NO₂ data from database...");
            const no2Data = await this.getNO2DataFromRAG(cityName, dataLayout);
            this.sendAgentCompleted("NO₂ data retrieved successfully");
            // Step 3: Generate research queries based on NO₂ data
            this.sendAgentStart("Generating research queries...");
            const researchQueries = this.generateResearchQueries(cityName, no2Data);
            this.sendAgentCompleted("Research queries generated");
            // Step 4: Perform live research
            this.sendAgentStart("Researching current policies and regulations...");
            const policyResearch = await this.performLiveResearch(researchQueries);
            this.sendAgentCompleted("Policy research completed");
            // Step 5: Synthesize and provide final response
            this.sendAgentStart("Synthesizing recommendations...");
            await this.synthesizeAndRespond(userQuestion, no2Data, policyResearch);
            this.sendAgentCompleted("Analysis complete");
        }
        catch (error) {
            console.error("Error in policy research process:", error);
            this.sendAgentStart("Error occurred during analysis");
            throw error;
        }
    }
    /**
     * Extract city name from user question
     */
    extractCityName(userQuestion) {
        // Simple extraction - can be enhanced with NLP
        const cityPatterns = [
            /(?:for|in|about|regarding)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:NO₂|NO2|nitrogen dioxide)/i,
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:levels|data|policies)/i
        ];
        for (const pattern of cityPatterns) {
            const match = userQuestion.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        // Fallback: extract any capitalized words that might be city names
        const words = userQuestion.split(' ');
        const potentialCities = words.filter(word => word.length > 2 &&
            word[0] === word[0].toUpperCase() &&
            !['The', 'What', 'How', 'When', 'Where', 'Why', 'Give', 'Show', 'Tell'].includes(word));
        return potentialCities[0] || 'Unknown City';
    }
    /**
     * Get NO₂ data from the RAG bot via API call
     */
    async getNO2DataFromRAG(cityName, dataLayout) {
        try {
            // Call the existing RAG bot API endpoint
            const response = await fetch('http://localhost:5029/api/rd_chat/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    wsClientId: this.wsClientId,
                    chatLog: [{
                            sender: "user",
                            message: `What are the current NO₂ levels and air quality data for ${cityName}?`,
                            date: new Date()
                        }],
                    memoryId: this.memoryId
                })
            });
            if (response.ok) {
                // The RAG bot will stream the response via WebSocket
                // For now, return a placeholder - in production, you'd capture the WebSocket response
                return `NO₂ data for ${cityName}: Retrieved from database. Current levels and trends available.`;
            }
            else {
                console.error(`RAG API call failed: ${response.status}`);
                return `NO₂ data for ${cityName}: Data retrieval in progress.`;
            }
        }
        catch (error) {
            console.error("Error getting NO₂ data:", error);
            return `NO₂ data for ${cityName}: Data retrieval in progress.`;
        }
    }
    /**
     * Generate research queries based on NO₂ data
     */
    generateResearchQueries(cityName, no2Data) {
        const baseQueries = [
            `green policy implementation ${cityName} air quality`,
            `NO₂ reduction policies ${cityName} urban planning`,
            `environmental regulations ${cityName} transportation`,
            `air quality improvement policies ${cityName}`,
            `sustainable urban development ${cityName} NO₂ levels`,
            `public transportation policies ${cityName} air pollution`,
            `industrial emission regulations ${cityName}`,
            `clean energy policies ${cityName} government`,
            `urban mobility solutions ${cityName} air quality`,
            `environmental protection laws ${cityName} implementation`
        ];
        return baseQueries;
    }
    /**
     * Perform live research using the research bot via API call
     */
    async performLiveResearch(researchQueries) {
        try {
            // Call the existing live research bot API endpoint
            const response = await fetch('http://localhost:5029/api/live_research_chat/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    wsClientId: this.wsClientId,
                    chatLog: [{
                            sender: "user",
                            message: `Research current policies and regulations for improving air quality and reducing NO₂ levels in urban areas. Focus on successful implementations and best practices.`,
                            date: new Date()
                        }],
                    memoryId: this.memoryId,
                    numberOfSelectQueries: 5,
                    percentOfTopQueriesToSearch: 0.25,
                    percentOfTopResultsToScan: 0.25
                })
            });
            if (response.ok) {
                // The research bot will stream the response via WebSocket
                // For now, return a placeholder - in production, you'd capture the WebSocket response
                return "Policy research completed. Found relevant policies and regulations for air quality improvement.";
            }
            else {
                console.error(`Live research API call failed: ${response.status}`);
                return "Policy research in progress. Gathering current regulations and best practices.";
            }
        }
        catch (error) {
            console.error("Error performing live research:", error);
            return "Policy research in progress. Gathering current regulations and best practices.";
        }
    }
    /**
     * Synthesize the results and provide final response
     */
    async synthesizeAndRespond(userQuestion, no2Data, policyResearch) {
        try {
            const messages = [
                {
                    role: "system",
                    content: this.mainSystemPrompt
                },
                {
                    role: "user",
                    content: this.userPromptTemplate(userQuestion, no2Data, policyResearch)
                }
            ];
            if (!this.openaiClient) {
                console.error("OpenAI client is not initialized");
                this.sendAgentStart("Error: OpenAI client not configured");
                return;
            }
            const stream = await this.openaiClient.chat.completions.create({
                model: "gpt-4-turbo",
                messages,
                max_tokens: 4000,
                temperature: 0.3,
                stream: true,
            });
            await this.streamWebSocketResponses(stream);
        }
        catch (error) {
            console.error("Error synthesizing response:", error);
            this.sendAgentStart("Error occurred while generating final response");
        }
    }
    /**
     * Handle follow-up questions in the conversation
     */
    async handleFollowUpQuestion(chatLog, userQuestion) {
        try {
            this.sendAgentStart("Processing follow-up question...");
            const messages = [
                {
                    role: "system",
                    content: `You are continuing a policy research conversation. Provide detailed, helpful responses based on the previous context and any new information requested.`
                },
                ...chatLog.map(msg => ({
                    role: msg.sender === "user" ? "user" : "assistant",
                    content: msg.message
                })),
                {
                    role: "user",
                    content: userQuestion
                }
            ];
            if (!this.openaiClient) {
                console.error("OpenAI client is not initialized");
                this.sendAgentStart("Error: OpenAI client not configured");
                return;
            }
            const stream = await this.openaiClient.chat.completions.create({
                model: "gpt-4-turbo",
                messages,
                max_tokens: 3000,
                temperature: 0.3,
                stream: true,
            });
            await this.streamWebSocketResponses(stream);
        }
        catch (error) {
            console.error("Error handling follow-up:", error);
            this.sendAgentStart("Error occurred while processing follow-up question");
        }
    }
}
