import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
import WebSocket from 'ws';
export declare class LiveResearchChatBot extends PsBaseChatBot {
    numberOfQueriesToGenerate: number;
    percentOfQueriesToSearch: number;
    percentOfResultsToScan: number;
    persistMemory: boolean;
    constructor(wsClientId: string, wsClients: Map<string, WebSocket>, memoryId?: string);
    summarySystemPrompt: string;
    jsonWebPageResearchSchema: string;
    renderFollowupSystemPrompt(): string;
    doLiveResearch(question: string): Promise<void>;
    renderResultsToUser(research: object[], question: string): Promise<void>;
    researchConversation: (chatLog: PsSimpleChatLog[], numberOfSelectQueries: number, percentOfTopQueriesToSearch: number, percentOfTopResultsToScan: number) => Promise<void>;
}
//# sourceMappingURL=liveResearchChatBot.d.ts.map