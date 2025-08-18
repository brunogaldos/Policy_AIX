import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
import WebSocket from 'ws';
export declare class PolicyResearchAssistant extends PsBaseChatBot {
    persistMemory: boolean;
    private wsClients;
    private capturedResponses;
    private isLiveResearchActive;
    constructor(wsClientId: string, wsClients: Map<string, WebSocket>, memoryId?: string);
    mainSystemPrompt: string;
    userPromptTemplate: (userQuestion: string, ragData: string, policyResearch: string) => string;
    /**
     * Main method to process a city policy research request
     */
    processCityPolicyRequest(userQuestion: string, dataLayout: any): Promise<void>;
    /**
     * Get bot response from memory
     */
    private getBotResponseFromMemory;
    /**
     * Extract city name from user question
     */
    private extractLocationOrTopic;
    /**
     * Call SkillsFirstChatBot and get its response
     */
    private callSkillsFirstChatBotAndCaptureResponse;
    /**
     * Extract time context from user question
     */
    private extractTimeContext;
    /**
     * Extract key themes from user question for targeted research
     */
    private extractThemesFromQuestion;
    /**
     * Call LiveResearchChatBot via API but prevent frontend responses
     */
    private callLiveResearchChatBotAndCaptureResponse;
    /**
     * Create a contextualized research question that incorporates RAG data
     */
    private createContextualizedResearchQuestion;
    /**
     * Extract the main topic from user question for simple research
     */
    private extractMainTopic;
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