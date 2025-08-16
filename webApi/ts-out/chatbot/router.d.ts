import { BaseIngestionAgent } from "@policysynth/agents/rag/ingestion/baseAgent.js";
export declare class PsRagRouter extends BaseIngestionAgent {
    systemMessageFull: (schema: string, about: string, chatHistory: string) => PsModelMessage;
    systemMessage: (schema: string, about: string, chatHistory: string) => PsModelMessage;
    userMessage: (question: string) => PsModelMessage;
    getRoutingData(userQuestion: string, dataLayout: PsIngestionDataLayout, chatHistory: string): Promise<PsRagRoutingResponse>;
}
//# sourceMappingURL=router.d.ts.map