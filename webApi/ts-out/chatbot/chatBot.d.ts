import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
export declare class SkillsFirstChatBot extends PsBaseChatBot {
    persistMemory: boolean;
    mainSreamingSystemPrompt: string;
    mainStreamingUserPrompt: (latestQuestion: string, context: string) => string;
    sendSourceDocuments(document: any[]): void;
    skillsFirstConversation(chatLog: PsSimpleChatLog[], dataLayout: PsIngestionDataLayout): Promise<void>;
    updateUrls(searchContext: any): Promise<any>;
}
//# sourceMappingURL=chatBot.d.ts.map