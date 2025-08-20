import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
export declare class SkillsFirstChatBot extends PsBaseChatBot {
    persistMemory: boolean;
    silentMode: boolean;
    mainSreamingSystemPrompt: string;
    mainStreamingUserPrompt: (latestQuestion: string, context: string) => string;
    sendSourceDocuments(document: any[]): void;
    sendAgentStart(message: string): void;
    sendAgentCompleted(message: string, final?: boolean): void;
    sendAgentUpdate(message: string): void;
    sendToClient(message: any): void;
    skillsFirstConversation(chatLog: PsSimpleChatLog[], dataLayout: PsIngestionDataLayout): Promise<void>;
    updateUrls(searchContext: any): Promise<any>;
}
//# sourceMappingURL=chatBot.d.ts.map