import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
export declare class EnhancedSkillsFirstChatBot extends PsBaseChatBot {
    persistMemory: boolean;
    private resourceWatchIntegration;
    constructor(wsClientId: string, wsClients: Map<string, any>, memoryId?: string);
    mainSreamingSystemPrompt: string;
    mainStreamingUserPrompt: (latestQuestion: string, context: string, environmentalContext?: string) => string;
    sendSourceDocuments(document: any[]): void;
    enhancedSkillsFirstConversation(chatLog: any[], dataLayout: any): Promise<void>;
    skillsFirstConversation(chatLog: any[], dataLayout: any): Promise<void>;
}
//# sourceMappingURL=enhancedSkillsFirstChatBot.d.ts.map