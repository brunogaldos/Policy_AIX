import { PolicySynthAgentBase } from "@policysynth/agents/baseAgent.js";
import { PsRagDocumentVectorStore } from "@policysynth/agents/rag/vectorstore/ragDocument.js";
import { PsRagChunkVectorStore } from "@policysynth/agents/rag/vectorstore/ragChunk.js";
export declare class PsRagVectorSearch extends PolicySynthAgentBase {
    documentStore: PsRagDocumentVectorStore;
    chunkStore: PsRagChunkVectorStore;
    constructor();
    search(userQuestion: string, routingData: any, dataLayout: PsIngestionDataLayout): Promise<PsSimpleDocumentSource[]>;
    private deduplicateResults;
}
//# sourceMappingURL=vectorSearch.d.ts.map