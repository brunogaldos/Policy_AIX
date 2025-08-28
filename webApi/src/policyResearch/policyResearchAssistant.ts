import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
import WebSocket from 'ws';
import { SkillsFirstChatBot } from "../chatbot/chatBot.js";
import { LiveResearchChatBot } from "../liveResearchChatBot.js";
import fetch from 'node-fetch';

export class PolicyResearchAssistant extends PsBaseChatBot {
  persistMemory = true;
  private wsClients: Map<string, WebSocket>;
  private capturedResponses: Map<string, string> = new Map();
  private isLiveResearchActive: boolean = false;

  constructor(
    wsClientId: string,
    wsClients: Map<string, WebSocket>,
    memoryId?: string
  ) {
    super(wsClientId, wsClients, memoryId);
    this.wsClients = wsClients;
  }

  // Main system prompt for the integrated assistant
  mainSystemPrompt = `You are an expert policy research assistant that helps governments and policymakers make informed decisions based on data and policy research.

Your capabilities:
1. Access data for locations from a comprehensive database
2. Research current policies, laws, and regulations that could help implement sustainable policies
3. Give accurate sources for the policies and regulations you find

Instructions:

- Be professional and accurate
- Provide sources for the policies and regulations you find
- Provide links to the original webpages, if they are relevant, in markdown format as citations`;

  // User prompt template
  userPromptTemplate = (userQuestion: string, ragData: string, policyResearch: string) => `
<USER_QUESTION>
${userQuestion}
</USER_QUESTION>

<RAG_DATA_CONTEXT>
${ragData}
</RAG_DATA_CONTEXT>

<POLICY_RESEARCH_CONTEXT>
${policyResearch}
</POLICY_RESEARCH_CONTEXT>

Please provide a comprehensive analysis and recommendations based on the above data and research. The RAG system provides data values from its database, while the live research system provides policy analysis and recommendations. Synthesize both sources into actionable insights for policymakers.
`;

  /**
   * Main method to process a city policy research request
   */
  async processCityPolicyRequest(
    userQuestion: string,
    dataLayout: any
  ): Promise<void> {
    try {
      this.sendAgentStart("Analyzing data and researching policies...");

      // Step 1: Process the user's question
      console.log(`Processing request: ${userQuestion}`);

      // Step 2: Call SkillsFirstChatBot with a data-focused question
      this.sendAgentStart("Retrieving data from database...");
      console.log('🚀 Starting SkillsFirstChatBot...');
      const dataQuestion = `For this question: "${userQuestion}", provide ONLY the raw data values, measurements, or facts. NO analysis, NO recommendations, NO policy suggestions, NO conclusions. Just the data.`;
      const skillsFirstResponse = await this.callSkillsFirstChatBotAndCaptureResponse(dataQuestion);
      console.log('✅ SkillsFirstChatBot completed with response length:', skillsFirstResponse.length);
      this.sendAgentCompleted("Data retrieved successfully");

      // Step 3: Use the SkillsFirstChatBot response as input for LiveResearchChatBot
      this.sendAgentStart("Researching current policies and regulations...");
      console.log('🔍 SkillsFirstChatBot response captured:', skillsFirstResponse);
      console.log('🔍 Starting LiveResearchChatBot with data length:', skillsFirstResponse.length);
      
      // Add a longer delay to ensure SkillsFirstChatBot is completely finished
      console.log('⏳ Waiting for SkillsFirstChatBot to complete...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log('✅ SkillsFirstChatBot should be completely finished');
      
      console.log('🚀 Starting LiveResearchChatBot...');
      const liveResearchResponse = await this.callLiveResearchChatBotAndCaptureResponse(userQuestion, skillsFirstResponse);
      console.log('✅ LiveResearchChatBot completed with response length:', liveResearchResponse.length);
      console.log('📄 LiveResearchChatBot response preview:', liveResearchResponse.substring(0, 200));
      this.sendAgentCompleted("Policy research completed");

      // Step 4: Send raw combined output (no synthesis)
      this.sendAgentStart("Preparing final results...");
      
      // Combine raw outputs: first bot's data + live research final response
      const combinedContent = `${skillsFirstResponse}\n\n${liveResearchResponse}`;
      
      // Emit using server-native shape so frontend mapping recognizes it
      const botMessage = {
        sender: "bot",
        type: "chatResponse",
        content: combinedContent,
        data: { content: combinedContent },
      } as any;
      
      if (this.wsClientSocket) {
        this.wsClientSocket.send(JSON.stringify(botMessage));
      } else if (this.wsClients && this.wsClientId && this.wsClients.has(this.wsClientId)) {
        const socket = this.wsClients.get(this.wsClientId);
        socket?.send(JSON.stringify(botMessage));
      }
      this.sendAgentCompleted("Results ready");

    } catch (error) {
      console.error("Error in policy research process:", error);
      this.sendAgentStart("Error occurred during analysis");
      throw error;
    }
  }

  /**
   * Get bot response from memory
   */
  private async getBotResponseFromMemory(memoryId: string): Promise<string> {
    try {
      // Import Redis client
      const { createClient } = await import('redis');
      const client = createClient();
      await client.connect();
      
      // Get the memory data from Redis
      const memoryKey = `ps-chatbot-memory-${memoryId}`;
      console.log(`🔍 Looking for memory key: ${memoryKey}`);
      const memoryData = await client.get(memoryKey);
      await client.disconnect();
      
      if (memoryData) {
        console.log(`✅ Found memory data for ${memoryId}`);
        const parsed = JSON.parse(memoryData);
        if (parsed.chatLog && parsed.chatLog.length > 0) {
          // Get the last bot response
          const lastBotMessage = parsed.chatLog
            .filter((msg: any) => msg.sender === 'bot')
            .pop();
          
          if (lastBotMessage) {
            console.log(`📤 Returning bot message (first 100 chars): ${lastBotMessage.message.substring(0, 100)}...`);
            return lastBotMessage.message;
          }
        }
      } else {
        console.log(`❌ No memory data found for ${memoryId}`);
      }
      
      return "No response found in memory";
    } catch (error) {
      console.error("Error getting bot response from memory:", error);
      return "Error retrieving response from memory";
    }
  }

  /**
   * Extract city name from user question
   */
  private extractLocationOrTopic(userQuestion: string): string {
    // Generic extraction of location or topic from the question
    // This is a basic fallback - the actual data will come from RAG
    const words = userQuestion.split(' ');
    const locationWords = words.filter(word => 
      word.length > 2 && /^[A-Z]/.test(word)
    );
    
    if (locationWords.length > 0) {
      return locationWords.slice(0, 2).join(' '); // Take first two capitalized words
    }
    
    // Generic fallback
    return "the specified location";
  }



  /**
   * Call SkillsFirstChatBot and get its response
   */
  private async callSkillsFirstChatBotAndCaptureResponse(userQuestion: string): Promise<string> {
    try {
      console.log('🔧 SkillsFirstChatBot: Method called, isLiveResearchActive =', this.isLiveResearchActive);
      

      
      console.log('🔧 SkillsFirstChatBot: Creating memory ID...');
      // Create a unique memory ID for this conversation
      const memoryId = `policy-research-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('🔧 SkillsFirstChatBot: Memory ID created:', memoryId);
      
      // Use an internal WS client id so responses are NOT streamed to the user-facing frontend
      const internalSilentWsClientId = `${this.wsClientId}-internal-${Date.now()}`;
      
      console.log('🔧 SkillsFirstChatBot: Sending API request...');
      // Send the chat message via HTTP API
      const response = await fetch('http://localhost:5029/api/rd_chat/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatLog: [{
            sender: 'user',
            message: userQuestion
          }],
          // Use the real wsClientId but force silent mode so websocket sends are suppressed in backend
          wsClientId: this.wsClientId,
          memoryId: memoryId,
          silentMode: true
        })
      });

      if (!response.ok) {
        throw new Error(`SkillsFirstChatBot API call failed: ${response.status}`);
      }
      console.log('🔧 SkillsFirstChatBot: API request successful');

      console.log('🔧 SkillsFirstChatBot: Waiting for processing...');
      // Wait for the bot to process and get the response from memory
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      console.log('🔧 SkillsFirstChatBot: Retrieving response from memory...');
      // Get the response from the bot's memory
      const botResponse = await this.getBotResponseFromMemory(memoryId);
      
      console.log('🔧 SkillsFirstChatBot: Response retrieved, length:', botResponse.length);
      return botResponse || "Data retrieved from database";
      
    } catch (error) {
      console.error("Error calling SkillsFirstChatBot:", error);
      return "Error retrieving data from SkillsFirstChatBot";
    }
  }



  /**
   * Extract time context from user question
   */
  private extractTimeContext(userQuestion: string): string {
    const lowerQuestion = userQuestion.toLowerCase();
    
    if (lowerQuestion.includes('recent') || lowerQuestion.includes('current') || lowerQuestion.includes('latest')) {
      return 'recent';
    }
    if (lowerQuestion.includes('trend') || lowerQuestion.includes('change') || lowerQuestion.includes('improvement')) {
      return 'long-term trends';
    }
    if (lowerQuestion.includes('historical') || lowerQuestion.includes('past')) {
      return 'historical';
    }
    
    return 'current and recent';
  }



  /**
   * Extract key themes from user question for targeted research
   */
  private extractThemesFromQuestion(userQuestion: string): string[] {
    const themes: string[] = [];
    const lowerQuestion = userQuestion.toLowerCase();

    // Transportation-related themes
    if (lowerQuestion.includes('transport') || lowerQuestion.includes('vehicle') || lowerQuestion.includes('traffic')) {
      themes.push('transportation policies', 'vehicle emissions', 'public transit');
    }

    // Industrial themes
    if (lowerQuestion.includes('industrial') || lowerQuestion.includes('factory') || lowerQuestion.includes('manufacturing')) {
      themes.push('industrial emissions', 'factory regulations', 'manufacturing policies');
    }

    // Energy themes
    if (lowerQuestion.includes('energy') || lowerQuestion.includes('renewable') || lowerQuestion.includes('clean energy')) {
      themes.push('clean energy policies', 'renewable energy', 'energy efficiency');
    }

    // Urban planning themes
    if (lowerQuestion.includes('urban') || lowerQuestion.includes('planning') || lowerQuestion.includes('development')) {
      themes.push('urban planning', 'sustainable development', 'city planning');
    }

    // Health themes
    if (lowerQuestion.includes('health') || lowerQuestion.includes('medical') || lowerQuestion.includes('respiratory')) {
      themes.push('public health policies', 'air quality health impacts', 'respiratory health');
    }

    // Economic themes
    if (lowerQuestion.includes('economic') || lowerQuestion.includes('cost') || lowerQuestion.includes('investment')) {
      themes.push('economic impact', 'policy cost analysis', 'investment strategies');
    }

    // If no specific themes found, add general air quality themes
    if (themes.length === 0) {
      themes.push('air quality policies', 'pollution control', 'environmental regulations');
    }

    return themes;
  }

  /**
   * Call LiveResearchChatBot via API but prevent frontend responses
   */
  private async callLiveResearchChatBotAndCaptureResponse(userQuestion: string, skillsFirstResponse: string): Promise<string> {
    try {
      console.log('🔧 LiveResearchChatBot: API call method');
      
      // Create a unique memory ID for this conversation
      const memoryId = `live-research-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('🔧 LiveResearchChatBot: Memory ID created:', memoryId);
      
      // Use the SkillsFirstChatBot response as the research question
      const researchQuestion = `Based on this data: "${skillsFirstResponse}", research current policies and regulations that could address this situation. Provide comprehensive policy recommendations.`;
      
      console.log('🔧 LiveResearchChatBot: Sending API request...');
      // Send the chat message via HTTP API
      const response = await fetch('http://localhost:5029/api/live_research_chat/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatLog: [{
            sender: 'user',
            message: researchQuestion
          }],
          // Use the real wsClientId so frontend receives interim streams
          wsClientId: this.wsClientId,
          memoryId: memoryId,
          numberOfSelectQueries: 5,
          percentOfTopQueriesToSearch: 0.25,
          percentOfTopResultsToScan: 0.25,
          silentMode: false
        })
      });

      if (!response.ok) {
        throw new Error(`LiveResearchChatBot API call failed: ${response.status}`);
      }
      console.log('🔧 LiveResearchChatBot: API request successful');

      // Wait and poll for the bot to process (up to ~90s)
      console.log('🔧 LiveResearchChatBot: Waiting for processing with polling...');
      let botResponse = "";
      const maxAttempts = 35; // 30 * 5s = 150s
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        botResponse = await this.getBotResponseFromMemory(memoryId);
        console.log(`🔧 LiveResearchChatBot: Poll ${attempt}/${maxAttempts}, length: ${botResponse?.length || 0}`);
        if (botResponse && botResponse.length > 100 && !botResponse.includes("No response found in memory")) {
          break;
        }
      }
      return botResponse && !botResponse.includes("No response found in memory") ? botResponse : "";
      
    } catch (error) {
      console.error("Error calling LiveResearchChatBot:", error);
      return "Error in LiveResearchChatBot processing";
    }
  }

  /**
   * Create a contextualized research question that incorporates RAG data
   */
  private createContextualizedResearchQuestion(userQuestion: string, no2Data: string, researchQueries: string[]): string {
    // Extract the main topic from user question
    const mainTopic = this.extractMainTopic(userQuestion);
    const locationOrTopic = this.extractLocationOrTopic(userQuestion);
    
    // Create a research question that explicitly references the RAG data
    return `Based on the following data for ${locationOrTopic}: "${no2Data}", what are the current policies and regulations for ${mainTopic}? Focus on successful implementations and best practices that address the specific challenges identified in the data. Please research policies specifically for ${locationOrTopic} and similar locations.`;
  }

  /**
   * Extract the main topic from user question for simple research
   */
  private extractMainTopic(userQuestion: string): string {
    const lowerQuestion = userQuestion.toLowerCase();
    
    // Extract location or topic first
    const locationOrTopic = this.extractLocationOrTopic(userQuestion);
    
    // Determine the main policy area
    if (lowerQuestion.includes('transport') || lowerQuestion.includes('vehicle') || lowerQuestion.includes('traffic')) {
      return `improving transportation and reducing vehicle emissions in ${locationOrTopic}`;
    }
    if (lowerQuestion.includes('industrial') || lowerQuestion.includes('factory')) {
      return `regulating industrial emissions in ${locationOrTopic}`;
    }
    if (lowerQuestion.includes('energy') || lowerQuestion.includes('renewable')) {
      return `implementing clean energy policies in ${locationOrTopic}`;
    }
    if (lowerQuestion.includes('urban') || lowerQuestion.includes('planning')) {
      return `sustainable urban development in ${locationOrTopic}`;
    }
    if (lowerQuestion.includes('health') || lowerQuestion.includes('medical')) {
      return `public health policies related to air quality in ${locationOrTopic}`;
    }
    if (lowerQuestion.includes('economic') || lowerQuestion.includes('cost')) {
      return `economic policies for air quality improvement in ${locationOrTopic}`;
    }
    
    // Default to general policies
    return `improving overall conditions in ${locationOrTopic}`;
  }

  /**
   * Synthesize the results and provide final response
   */
  private async synthesizeAndRespond(
    userQuestion: string, 
    ragData: string, 
    policyResearch: string
  ): Promise<void> {
    try {
      const messages: any[] = [
        {
          role: "system",
          content: this.mainSystemPrompt
        },
        {
          role: "user",
          content: this.userPromptTemplate(userQuestion, ragData, policyResearch)
        }
      ];

      if (!this.openaiClient) {
        console.error("OpenAI client is not initialized");
        this.sendAgentStart("Error: OpenAI client not configured");
        return;
      }

      // Generate final response without streaming so frontend only sees the result at the end
      const completion = await this.openaiClient.chat.completions.create({
        model: "gpt-4-turbo",
        messages,
        max_tokens: 4000,
        temperature: 0.3,
        stream: false,
      });

      const finalText = completion.choices?.[0]?.message?.content || "";

      // Send a clear marker that this is the final response and then emit a single chat_response
      this.sendAgentStart("Final Policy Research Analysis");

      const botMessage = {
        sender: "bot",
        type: "chat_response",
        data: { content: finalText },
      } as any;

      if (this.wsClientSocket) {
        this.wsClientSocket.send(JSON.stringify(botMessage));
      } else if (this.wsClients && this.wsClientId && this.wsClients.has(this.wsClientId)) {
        const socket = this.wsClients.get(this.wsClientId);
        socket?.send(JSON.stringify(botMessage));
      }

      this.sendAgentCompleted("Policy Research Complete");

    } catch (error) {
      console.error("Error synthesizing response:", error);
      this.sendAgentStart("Error occurred while generating final response");
    }
  }

  /**
   * Handle follow-up questions in the conversation
   */
  async handleFollowUpQuestion(chatLog: any[], userQuestion: string): Promise<void> {
    try {
      this.sendAgentStart("Processing follow-up question...");

      const messages: any[] = [
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

    } catch (error) {
      console.error("Error handling follow-up:", error);
      this.sendAgentStart("Error occurred while processing follow-up question");
    }
  }
}