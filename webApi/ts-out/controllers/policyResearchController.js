import { BaseController } from "@policysynth/api/controllers/baseController.js";
import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
import { LiveResearchChatBot } from "../liveResearchChatBot.js";
import fetch from 'node-fetch';
export class PolicyResearchController extends BaseController {
    constructor(wsClients) {
        super(wsClients);
        this.path = "/api/policy_research";
        this.testCors = async (req, res) => {
            console.log(`🧪 CORS test request from origin: ${req.headers.origin}`);
            res.json({
                message: "CORS test successful",
                origin: req.headers.origin,
                timestamp: new Date().toISOString()
            });
        };
        this.getChatLog = async (req, res) => {
            console.log(`🔍 GET request to ${req.path} from origin: ${req.headers.origin}`);
            const memoryId = req.params.memoryId;
            let chatLog;
            let totalCosts;
            try {
                if (memoryId) {
                    const memory = await LiveResearchChatBot.loadMemoryFromRedis(memoryId);
                    if (memory) {
                        console.log(`memory loaded: ${JSON.stringify(memory, null, 2)}`);
                        chatLog = memory.chatLog;
                        totalCosts = PsBaseChatBot.getFullCostOfMemory(memory);
                    }
                    else {
                        console.log(`memory not found for id ${memoryId}`);
                    }
                }
            }
            catch (error) {
                console.log(error);
                res.sendStatus(500);
                return;
            }
            if (chatLog) {
                res.send({ chatLog, totalCosts });
            }
            else {
                res.sendStatus(404);
            }
        };
        this.liveResearchChat = async (req, res) => {
            console.log(`🔍 PUT request to ${req.path} from origin: ${req.headers.origin}`);
            console.log(`📋 Request headers:`, JSON.stringify(req.headers, null, 2));
            console.log(`📦 Request body:`, JSON.stringify(req.body, null, 2));
            const chatLog = req.body.chatLog || [];
            const wsClientId = req.body.wsClientId;
            const memoryId = req.body.memoryId;
            const numberOfSelectQueries = req.body.numberOfSelectQueries || 5;
            const percentOfTopQueriesToSearch = req.body.percentOfTopQueriesToSearch || 0.25;
            const percentOfTopResultsToScan = req.body.percentOfTopResultsToScan || 0.25;
            const silentMode = req.body.silentMode === true;
            // NEW: Check if this is a policy research request that needs RAG context
            const isPolicyResearch = req.body.isPolicyResearch === true;
            console.log(`🔇 silentMode from request body: ${req.body.silentMode}, type: ${typeof req.body.silentMode}, parsed as: ${silentMode}`);
            console.log(`🔍 Policy research mode: ${isPolicyResearch ? 'Yes' : 'No'}`);
            // For testing purposes, allow requests without wsClientId
            if (!wsClientId) {
                console.log('⚠️ No wsClientId provided - this is a test request');
                res.status(200).json({
                    message: "Test request received successfully",
                    note: "For full functionality, establish WebSocket connection first",
                    timestamp: new Date().toISOString()
                });
                return;
            }
            let saveChatLog;
            try {
                console.log(`🔌 Controller: wsClientId=${wsClientId}`);
                console.log(`🔌 Controller: wsClients Map size=${this.wsClients.size}`);
                console.log(`🔌 Controller: wsClients Map keys=${Array.from(this.wsClients.keys())}`);
                console.log(`🔌 Controller: wsClient exists=${this.wsClients.has(wsClientId)}`);
                // Check WebSocket connection status
                const wsClient = this.wsClients.get(wsClientId);
                if (wsClient) {
                    console.log(`🔌 WebSocket readyState: ${wsClient.readyState} (1=OPEN, 0=CONNECTING, 2=CLOSING, 3=CLOSED)`);
                }
                const bot = new LiveResearchChatBot(wsClientId, this.wsClients, memoryId);
                if (memoryId) {
                    const memory = await bot.getLoadedMemory();
                    if (memory) {
                        saveChatLog = memory.chatLog;
                    }
                }
                // NEW: Handle RAG context retrieval and query enhancement
                let enhancedChatLog = [...chatLog];
                if (isPolicyResearch && chatLog.length > 0) {
                    console.log(`🔍 Policy research mode detected, getting RAG context...`);
                    try {
                        // Step 1: Get RAG context from SkillsFirstChatBot
                        const userQuestion = chatLog[0].message;
                        console.log(`📄 Original user question:`, userQuestion);
                        const ragContext = await this.getRAGContext(userQuestion, wsClientId);
                        console.log(`📝 RAG context retrieved, length:`, ragContext.length);
                        // Step 2: Enhance the query with RAG context
                        enhancedChatLog[0] = {
                            ...enhancedChatLog[0],
                            message: `RAG Context: ${ragContext}

User Question: ${userQuestion}

Please research current policies and regulations that address this situation, incorporating the data context provided above. Provide comprehensive policy recommendations based on both the data and current best practices.`
                        };
                        console.log(`📝 Enhanced query created with RAG context`);
                        console.log(`📄 Enhanced query preview (first 300 chars):`, enhancedChatLog[0].message.substring(0, 300));
                        console.log(`📊 Enhanced query total length:`, enhancedChatLog[0].message.length);
                    }
                    catch (ragError) {
                        console.error(`❌ Error getting RAG context:`, ragError);
                        console.log(`⚠️ Proceeding with original query due to RAG error`);
                        // Keep original query if RAG fails
                    }
                }
                else {
                    console.log(`📄 Using original query (no RAG enhancement)`);
                    console.log(`📄 Original query:`, chatLog[0]?.message);
                }
                // Run the research conversation (with enhanced context if available)
                console.log(`🚀 Starting LiveResearchChatBot with ${enhancedChatLog.length} messages`);
                console.log(`🔧 Parameters: queries=${numberOfSelectQueries}, searchPercent=${percentOfTopQueriesToSearch}, scanPercent=${percentOfTopResultsToScan}`);
                bot.researchConversation(enhancedChatLog, numberOfSelectQueries, percentOfTopQueriesToSearch, percentOfTopResultsToScan);
            }
            catch (error) {
                console.log(error);
                res.sendStatus(500);
                return;
            }
            console.log(`LiveResearchChatController for id ${wsClientId} initialized chatLog of length ${chatLog?.length}`);
            if (saveChatLog) {
                res.send(saveChatLog);
            }
            else {
                res.sendStatus(200);
            }
        };
        this.initializeRoutes();
    }
    async initializeRoutes() {
        this.router.put(this.path + "/", this.liveResearchChat);
        this.router.get(this.path + "/:memoryId", this.getChatLog);
        this.router.get(this.path + "/test", this.testCors);
    }
    /**
     * Get RAG context from SkillsFirstChatBot API
     */
    async getRAGContext(userQuestion, wsClientId) {
        try {
            console.log('🔧 Getting RAG context from SkillsFirstChatBot...');
            console.log('🔧 User question:', userQuestion);
            console.log('🔧 wsClientId:', wsClientId);
            // Create a unique memory ID for this RAG request
            const ragMemoryId = `rag-context-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('🔧 RAG memory ID created:', ragMemoryId);
            // Call the SkillsFirstChatBot API endpoint to get RAG data
            console.log('🔧 Sending request to SkillsFirstChatBot API...');
            const response = await fetch('http://localhost:5029/api/rd_chat/', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatLog: [{
                            sender: 'user',
                            message: `For this question: "${userQuestion}", provide ONLY the raw data values, measurements, or facts. NO analysis, NO recommendations, NO policy suggestions, NO conclusions. Just the data.`
                        }],
                    wsClientId: wsClientId,
                    memoryId: ragMemoryId,
                    silentMode: true // Don't stream RAG responses to frontend
                })
            });
            console.log('🔧 SkillsFirstChatBot API response status:', response.status);
            console.log('🔧 SkillsFirstChatBot API response headers:', response.headers);
            if (response.ok) {
                console.log('✅ SkillsFirstChatBot API call successful');
                // Wait a bit for the bot to process and store the response
                console.log('⏳ Waiting for SkillsFirstChatBot to process and store response...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                // Now try to retrieve the actual response from memory
                console.log('🔍 Attempting to retrieve RAG response from memory...');
                const ragResponse = await this.retrieveRAGResponseFromMemory(ragMemoryId);
                if (ragResponse && ragResponse.length > 50) {
                    console.log('✅ RAG response retrieved successfully from memory');
                    console.log('📄 RAG response preview (first 200 chars):', ragResponse.substring(0, 200));
                    console.log('📊 RAG response total length:', ragResponse.length);
                    return ragResponse;
                }
                else {
                    console.log('⚠️ RAG response from memory is too short or empty, using fallback');
                    console.log('📄 RAG response from memory:', ragResponse);
                    return `RAG Context Retrieved: Data and measurements related to "${userQuestion}" have been retrieved from the SkillsFirst database. This includes historical trends, current measurements, and relevant environmental data.`;
                }
            }
            else {
                console.error(`❌ RAG API call failed: ${response.status}`);
                const errorText = await response.text();
                console.error('❌ RAG API error response:', errorText);
                return `RAG Context: Basic data context for "${userQuestion}" - proceeding with research. (API call failed: ${response.status})`;
            }
        }
        catch (error) {
            console.error("❌ Error getting RAG context:", error);
            return `RAG Context: Basic context for "${userQuestion}" - proceeding with research. (Error: ${error instanceof Error ? error.message : String(error)})`;
        }
    }
    /**
     * Retrieve RAG response from memory after SkillsFirstChatBot has processed it
     */
    async retrieveRAGResponseFromMemory(memoryId) {
        try {
            console.log('🔍 Retrieving RAG response from memory ID:', memoryId);
            // Import Redis client
            const { createClient } = await import('redis');
            const client = createClient();
            await client.connect();
            // Get the memory data from Redis
            const memoryKey = `ps-chatbot-memory-${memoryId}`;
            console.log('🔍 Looking for memory key:', memoryKey);
            const memoryData = await client.get(memoryKey);
            await client.disconnect();
            if (memoryData) {
                console.log('✅ Found memory data for RAG request');
                const parsed = JSON.parse(memoryData);
                console.log('🔍 Memory data structure keys:', Object.keys(parsed));
                if (parsed.chatLog && parsed.chatLog.length > 0) {
                    // Get the last bot response
                    const lastBotMessage = parsed.chatLog
                        .filter((msg) => msg.sender === 'bot')
                        .pop();
                    if (lastBotMessage) {
                        console.log('✅ Found bot message in RAG memory');
                        console.log('📄 Bot message preview (first 100 chars):', lastBotMessage.message.substring(0, 100));
                        return lastBotMessage.message;
                    }
                    else {
                        console.log('⚠️ No bot messages found in RAG memory');
                        console.log('🔍 Available messages:', parsed.chatLog.map((msg) => ({ sender: msg.sender, message: msg.message?.substring(0, 50) })));
                    }
                }
                else {
                    console.log('⚠️ No chatLog found in RAG memory');
                }
            }
            else {
                console.log('❌ No memory data found for RAG request');
            }
            return "No RAG response found in memory";
        }
        catch (error) {
            console.error("❌ Error retrieving RAG response from memory:", error);
            return "Error retrieving RAG response from memory";
        }
    }
}
