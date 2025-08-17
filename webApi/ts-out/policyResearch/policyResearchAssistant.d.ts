import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
import WebSocket from 'ws';
export declare class PolicyResearchAssistant extends PsBaseChatBot {
    persistMemory: boolean;
    private wsClients;
    private capturedResponses;
    constructor(wsClientId: string, wsClients: Map<string, WebSocket>, memoryId?: string);
    mainSystemPrompt: string;
    userPromptTemplate: (userQuestion: string, no2Data: string, policyResearch: string) => string;
    /**
     * Main method to process a city policy research request
     */
    processCityPolicyRequest(userQuestion: string, dataLayout: any): Promise<void>;
    /**
     * Extract city name from user question
     */
    private extractCityName;
    /**
     * Get NO₂ data from the RAG bot via API call
     */
    private getNO2DataFromRAG;
    /**
     * Generate research queries based on NO₂ data
     */
    private generateResearchQueries;
    /**
     * Perform live research using the research bot via API call
     */
    private performLiveResearch;
    /**
     * Synthesize the results and provide final response
     */
    private synthesizeAndRespond;
    /**
     * Handle follow-up questions in the conversation
     */
    handleFollowUpQuestion(chatLog: any[], userQuestion: string): Promise<void>;
}
//# sourceMappingURL=policyResearchAssistant.d.ts.map