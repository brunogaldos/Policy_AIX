import { BaseController } from "@policysynth/api/controllers/baseController.js";
import express from "express";
import WebSocket from 'ws';
import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
import { LiveResearchChatBot } from "../liveResearchChatBot.js";
import { SkillsFirstChatBot } from "../chatbot/chatBot.js";
import fetch from 'node-fetch';

export class PolicyResearchController extends BaseController {
  public path = "/api/policy_research";

  constructor(wsClients: Map<string, WebSocket>) {
    super(wsClients);
    this.initializeRoutes();
  }

  public async initializeRoutes() {
    this.router.put(this.path + "/", this.liveResearchChat);
    this.router.get(this.path + "/:memoryId", this.getChatLog);
    this.router.get(this.path + "/test", this.testCors);
  }

  private testCors = async (req: express.Request, res: express.Response) => {
    console.log(`🧪 CORS test request from origin: ${req.headers.origin}`);
    res.json({ 
      message: "CORS test successful", 
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
  };

  private getChatLog = async (req: express.Request, res: express.Response) => {
    console.log(`🔍 GET request to ${req.path} from origin: ${req.headers.origin}`);
    
    const memoryId = req.params.memoryId;
    let chatLog: PsSimpleChatLog[] | undefined;
    let totalCosts: number | undefined;

    try {
      if (memoryId) {
        const memory = await LiveResearchChatBot.loadMemoryFromRedis(memoryId);
        if (memory) {
          console.log(`memory loaded: ${JSON.stringify(memory, null, 2)}`)
          chatLog = memory.chatLog;
          totalCosts = PsBaseChatBot.getFullCostOfMemory(memory);
        } else {
          console.log(`memory not found for id ${memoryId}`)
        }
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
      return;
    }
    
    if (chatLog) {
      res.send({ chatLog, totalCosts });
    } else {
      res.sendStatus(404);
    }
  };

  liveResearchChat = async (req: express.Request, res: express.Response) => {
    console.log(`🔍 PUT request to ${req.path} from origin: ${req.headers.origin}`);
    console.log(`📋 Request headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`📦 Request body:`, JSON.stringify(req.body, null, 2));
    console.log(`📦 Request body keys:`, Object.keys(req.body));
    console.log(`📦 Request body types:`, Object.fromEntries(
      Object.entries(req.body).map(([key, value]) => [key, typeof value])
    ));
    
    const chatLog = req.body.chatLog || [];
    const wsClientId = req.body.wsClientId;
    const memoryId = req.body.memoryId;
    const numberOfSelectQueries = req.body.numberOfSelectQueries || 5;
    const percentOfTopQueriesToSearch = req.body.percentOfTopQueriesToSearch || 0.25;
    const percentOfTopResultsToScan = req.body.percentOfTopResultsToScan || 0.25;
    const silentMode = req.body.silentMode === true;
    
    console.log(`🔇 silentMode from request body: ${req.body.silentMode}, type: ${typeof req.body.silentMode}, parsed as: ${silentMode}`);

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

    let saveChatLog: PsSimpleChatLog[] | undefined;

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
      
      if (chatLog.length > 0) {
        console.log(`🔍 Getting RAG context for all requests...`);
        console.log(`🔍 Chat log length: ${chatLog.length}`);
        console.log(`🔍 First message: ${chatLog[0]?.message}`);
        
        try {
          // Step 1: Get RAG context from SkillsFirstChatBot
          const userQuestion = chatLog[0].message;
          console.log(`📄 Original user question:`, userQuestion);
          
          // Check if this is a follow-up question (more than 1 message)
          let ragContext: string;
          if (chatLog.length === 1) {
            // First question - get initial RAG context
            console.log(`📝 Getting RAG context for FIRST question:`, userQuestion);
            ragContext = await this.getRAGContext(userQuestion, wsClientId);
            console.log(`📝 Initial RAG context retrieved, length:`, ragContext.length);
            console.log(`🔍 First question RAG success:`, ragContext.length > 50 ? 'YES' : 'NO');
          } else {
            // Follow-up question - use the SAME approach as first question (which works)
            // Get fresh RAG context for the follow-up question
            const followUpQuestion = chatLog[chatLog.length - 1].message;
            console.log(`📝 Follow-up question detected:`, followUpQuestion);
            console.log(`📝 Getting RAG context for FOLLOW-UP question:`, followUpQuestion);
            ragContext = await this.getRAGContext(followUpQuestion, wsClientId);
            console.log(`📝 Fresh RAG context for follow-up retrieved, length:`, ragContext.length);
            console.log(`🔍 Follow-up question RAG success:`, ragContext.length > 50 ? 'YES' : 'NO');
          }
          
          console.log(`📝 RAG context preview (first 500 chars):`, ragContext.substring(0, 500));
          console.log(`📊 RAG context length:`, ragContext.length);
          console.log(`🔍 RAG context contains data:`, ragContext.length > 50 ? 'YES' : 'NO');
          
          // Step 2: Enhance the query with RAG context
          if (chatLog.length === 1) {
            // First question - use original enhancement
            enhancedChatLog[0] = {
              ...enhancedChatLog[0],
              message: `CRITICAL INSTRUCTION: You MUST use the RAG data below to provide specific, detailed answers. Do NOT give generic responses.

RAG DATA CONTEXT:
${ragContext}

USER QUESTION: ${userQuestion}

REQUIRED: Use the RAG data above to provide:
1. Specific data points, statistics, and findings from the RAG context: density population, district, Annual average nighttime lights intensity, Irradiation (GHI) Average daily solar energy potential, inventory of scale solar energy stations, etc
2. Concrete examples and evidence from the retrieved information
3. Detailed analysis based on the actual data, not generic statements
4. Specific policy recommendations grounded in the RAG data
5. District rankings and scores based on the retrieved information

DO NOT provide vague, generic answers. Every response must reference specific data from the RAG context above.

EXAMPLES OF WHAT NOT TO DO:
- "Begin with quick wins like solar installations" (too generic)
- "Expand to more complex projects" (too vague)
- "Strengthen the overall energy infrastructure" (too generic)

EXAMPLES OF WHAT TO DO:
- "Based on the RAG data showing District A has 8,500 people/km² density and 15% energy burden, prioritize solar installations in District A"
- "According to the infrastructure data, District B has 75% existing coverage, making it suitable for battery storage expansion"
- "The RAG data indicates District C has security score 0.8, supporting wind power development"

EVERY PARAGRAPH MUST START WITH "Based on the dataset provided..." and reference specific numbers, facts, or data points.

MANDATORY DATA INJECTION: If the RAG data is insufficient, you MUST use your web research capabilities to find specific data and statistics. You are FORBIDDEN from giving generic policy statements without concrete data backing. Every recommendation must include specific numbers, percentages, or measurable facts.`
            };
          } else {
            // Follow-up question - enhance with fresh RAG context
            enhancedChatLog[enhancedChatLog.length - 1] = {
              ...enhancedChatLog[enhancedChatLog.length - 1],
              message: `CRITICAL INSTRUCTION: You MUST use the RAG data below to provide specific, detailed answers. Do NOT give generic responses.

RAG DATA CONTEXT (from initial research):
${ragContext}

FOLLOW-UP QUESTION: ${chatLog[chatLog.length - 1].message}

REQUIRED: Use the RAG data above to provide:
1. Specific data points, statistics, and findings from the RAG context: density population, district, Annual average nighttime lights intensity, Irradiation (GHI) Average daily solar energy potential, inventory of scale solar energy stations, etc.
2. Concrete examples and evidence from the retrieved information
3. Detailed analysis based on the actual data, not generic statements
4. Specific policy recommendations grounded in the RAG data
5. District rankings and scores based on the retrieved information

DO NOT provide vague, generic answers. Every response must reference specific data from the RAG context above.

EXAMPLES OF WHAT NOT TO DO:
- "Begin with quick wins like solar installations" (too generic)
- "Expand to more complex projects" (too vague)
- "Strengthen the overall energy infrastructure" (too generic)

EXAMPLES OF WHAT TO DO:
- "Based on the RAG data showing District A has 8,500 people/km² density and 15% energy burden, prioritize solar installations in District A"
- "According to the infrastructure data, District B has 75% existing coverage, making it suitable for battery storage expansion"
- "The RAG data indicates District C has security score 0.8, supporting wind power development"

EVERY PARAGRAPH MUST START WITH "Based on the dataset provided..." and reference specific numbers, facts, or data points.

MANDATORY DATA INJECTION: If the RAG data is insufficient, you MUST use your web research capabilities to find specific data and statistics. You are FORBIDDEN from giving generic policy statements without concrete data backing. Every recommendation must include specific numbers, percentages, or measurable facts.`
            };
          }
          
          console.log(`📝 Enhanced query created with RAG context`);
          console.log(`📄 Enhanced query preview (first 300 chars):`, enhancedChatLog[enhancedChatLog.length - 1].message.substring(0, 300));
          console.log(`📊 Enhanced query total length:`, enhancedChatLog[enhancedChatLog.length - 1].message.length);
          console.log(`🔍 RAG data is in enhanced query:`, enhancedChatLog[enhancedChatLog.length - 1].message.includes('RAG DATA CONTEXT') ? 'YES' : 'NO');
          console.log(`🔍 RAG data length in enhanced query:`, enhancedChatLog[enhancedChatLog.length - 1].message.length - enhancedChatLog[enhancedChatLog.length - 1].message.indexOf('RAG DATA CONTEXT'));
          
        } catch (ragError) {
          console.error(`❌ Error getting RAG context:`, ragError);
          console.error(`❌ RAG error details:`, ragError);
          if (ragError instanceof Error) {
            console.error(`❌ RAG error stack:`, ragError.stack);
          }
          console.log(`⚠️ Proceeding with original query due to RAG error`);
          // Keep original query if RAG fails
        }
      } else {
        console.log(`📄 No chat log available for RAG enhancement`);
      }
      
      // Run the research conversation (with enhanced context if available)
      console.log(`🚀 Starting LiveResearchChatBot with ${enhancedChatLog.length} messages`);
      console.log(`🔧 Parameters: queries=${numberOfSelectQueries}, searchPercent=${percentOfTopQueriesToSearch}, scanPercent=${percentOfTopResultsToScan}`);
      
      bot.researchConversation(
        enhancedChatLog,
        numberOfSelectQueries,
        percentOfTopQueriesToSearch,
        percentOfTopResultsToScan
      );
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
      return;
    }

    console.log(
      `LiveResearchChatController for id ${wsClientId} initialized chatLog of length ${chatLog?.length}`
    );

    if (saveChatLog) {
      res.send(saveChatLog);
    } else {
      res.sendStatus(200);
    }
  };

  /**
   * Get RAG context from SkillsFirstChatBot API
   */
  private async getRAGContext(userQuestion: string, wsClientId: string): Promise<string> {
    try {
      console.log('🔧 Getting RAG context from SkillsFirstChatBot...');
      console.log('🔧 User question:', userQuestion);
      console.log('🔧 wsClientId:', wsClientId);
      
      // Create a unique memory ID for this RAG request
      const ragMemoryId = `rag-context-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('🔧 RAG memory ID created:', ragMemoryId);
      
      // Call the SkillsFirstChatBot API endpoint to get RAG data
      console.log('🔧 Sending request to SkillsFirstChatBot API...');
      console.log('🔧 API URL: http://localhost:5029/api/rd_chat/');
      
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
      console.log('🔧 SkillsFirstChatBot API response headers:', JSON.stringify(response.headers, null, 2));

      if (response.ok) {
        console.log('✅ SkillsFirstChatBot API call successful');
        
        // Wait a bit for the bot to process and store the response
        console.log('⏳ Waiting for SkillsFirstChatBot to process and store response...');
        await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds to ensure data is loaded
        
        // Now try to retrieve the actual response from memory
        console.log('🔍 Attempting to retrieve RAG response from memory...');
        let ragResponse = await this.retrieveRAGResponseFromMemory(ragMemoryId);
        
        // If first attempt fails, wait a bit more and try again
        if (!ragResponse || ragResponse.length < 50) {
          console.log('⏳ First attempt failed, waiting 5 more seconds and retrying...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          ragResponse = await this.retrieveRAGResponseFromMemory(ragMemoryId);
        }
        
        // If second attempt also fails, try one more time with even more time
        if (!ragResponse || ragResponse.length < 50) {
          console.log('⏳ Second attempt failed, waiting 8 more seconds for final retry...');
          await new Promise(resolve => setTimeout(resolve, 8000));
          ragResponse = await this.retrieveRAGResponseFromMemory(ragMemoryId);
        }
        
        if (ragResponse && ragResponse.length > 50) {
          console.log('✅ RAG response retrieved successfully from memory');
          console.log('📄 RAG response preview (first 200 chars):', ragResponse.substring(0, 200));
          console.log('📊 RAG response total length:', ragResponse.length);
          return ragResponse;
        } else {
          console.log('⚠️ RAG response from memory is too short or empty, using fallback');
          console.log('📄 RAG response from memory:', ragResponse);
          return `RAG Context: Data retrieval in progress. The SkillsFirstChatBot is processing your request for: "${userQuestion}". Please wait for the data to be fully loaded, then provide specific analysis based on the retrieved information.`;
        }
      } else {
        console.error(`❌ RAG API call failed: ${response.status}`);
        const errorText = await response.text();
        console.error('❌ RAG API error response:', errorText);
        return `RAG Context: API call failed (${response.status}). Use web research to find specific data and statistics. Every response must include concrete numbers, facts, and specific examples.`;
      }
      
    } catch (error) {
      console.error("❌ Error getting RAG context:", error);
      console.error("❌ Error details:", error);
      if (error instanceof Error) {
        console.error("❌ Error stack:", error.stack);
      }
      return `RAG Context: Error occurred (${error instanceof Error ? error.message : String(error)}). Use web research to find specific data and statistics. Every response must include concrete numbers, facts, and specific examples.`;
    }
  }

  /**
   * Retrieve RAG response from memory after SkillsFirstChatBot has processed it
   */
  private async retrieveRAGResponseFromMemory(memoryId: string): Promise<string> {
    try {
      console.log('🔍 Retrieving RAG response from memory ID:', memoryId);
      
      // Import Redis client
      const { createClient } = await import('redis');
      const client = createClient();
      await client.connect();
      
      // Get the memory data from Redis - try multiple key formats
      const possibleKeys = [
        `ps-chatbot-memory-${memoryId}`,
        `ps-chatbot-memory:${memoryId}`,
        `rag-context-${memoryId}`,
        memoryId
      ];
      
      let memoryData = null;
      let foundKey = null;
      
      for (const key of possibleKeys) {
        console.log('🔍 Trying memory key:', key);
        memoryData = await client.get(key);
        if (memoryData) {
          foundKey = key;
          console.log('✅ Found memory data with key:', foundKey);
          break;
        }
      }
      await client.disconnect();
      
      if (memoryData) {
        console.log('✅ Found memory data for RAG request');
        const parsed = JSON.parse(memoryData);
        console.log('🔍 Memory data structure keys:', Object.keys(parsed));
        
        if (parsed.chatLog && parsed.chatLog.length > 0) {
          console.log('🔍 Chat log length:', parsed.chatLog.length);
          console.log('🔍 Chat log messages:', parsed.chatLog.map((msg: any) => ({ 
            sender: msg.sender, 
            message: msg.message?.substring(0, 100),
            timestamp: msg.timestamp 
          })));
          
          // Get the last bot response
          const lastBotMessage = parsed.chatLog
            .filter((msg: any) => msg.sender === 'bot')
            .pop();
          
          if (lastBotMessage) {
            console.log('✅ Found bot message in RAG memory');
            console.log('📄 Bot message preview (first 100 chars):', lastBotMessage.message.substring(0, 100));
            console.log('📄 Bot message timestamp:', lastBotMessage.timestamp);
            return lastBotMessage.message;
          } else {
            console.log('⚠️ No bot messages found in RAG memory');
            console.log('🔍 Available messages:', parsed.chatLog.map((msg: any) => ({ sender: msg.sender, message: msg.message?.substring(0, 50) })));
          }
        } else {
          console.log('⚠️ No chatLog found in RAG memory');
          console.log('🔍 Memory data structure:', JSON.stringify(parsed, null, 2));
        }
      } else {
        console.log('❌ No memory data found for RAG request');
        console.log('🔍 Memory keys tried:', possibleKeys);
      }
      
      return "No RAG response found in memory";
    } catch (error) {
      console.error("❌ Error retrieving RAG response from memory:", error);
      console.error("❌ Error details:", error);
      if (error instanceof Error) {
        console.error("❌ Error stack:", error.stack);
      }
      return "Error retrieving RAG response from memory";
    }
  }
}
