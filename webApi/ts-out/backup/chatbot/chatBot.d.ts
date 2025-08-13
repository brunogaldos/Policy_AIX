import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
export declare class WebResearchRagChatBot extends PsBaseChatBot {
    persistMemory: boolean;
    mainSreamingSystemPrompt: string;
    mainStreamingUserPrompt: (latestQuestion: string, context: string) => string;
    sendSourceDocuments(document: PsSimpleDocumentSource[]): void;
    webResearchConversation(chatLog: PsSimpleChatLog[], dataLayout: PsIngestionDataLayout): Promise<void>;
    updateUrls(searchContext: PsSimpleDocumentSource[]): Promise<string>;
    streamResponse(systemPrompt: string, userPrompt: string, chatHistory: any[]): Promise<void>;
}
//# sourceMappingURL=chatBot.d.ts.map