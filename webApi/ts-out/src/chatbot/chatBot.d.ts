import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
export declare class SkillsFirstChatBot extends PsBaseChatBot {
    persistMemory: boolean;
    mainSreamingSystemPrompt: string;
    mainStreamingUserPrompt: (latestQuestion: string, context: string) => string;
    sendSourceDocuments(document: PsSimpleDocumentSource[]): void;
    skillsFirstConversation(chatLog: PsSimpleChatLog[], dataLayout: PsIngestionDataLayout): Promise<void>;
    updateUrls(searchContext: []): Promise<[]>;
}
//# sourceMappingURL=chatBot.d.ts.map