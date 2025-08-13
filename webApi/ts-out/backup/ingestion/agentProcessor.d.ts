import { IngestionAgentProcessor } from "@policysynth/agents/rag/ingestion/processor.js";
import { DocumentCleanupAgent } from "@policysynth/agents/rag/ingestion/docCleanup.js";
import { DocumentTreeSplitAgent } from "@policysynth/agents/rag/ingestion/docTreeSplitter.js";
import { IngestionChunkCompressorAgent } from "@policysynth/agents/rag/ingestion/chunkCompressorAgent.js";
import { DocumentAnalyzerAgent } from "@policysynth/agents/rag/ingestion/docAnalyzer.js";
import { IngestionChunkAnalzyerAgent } from "@policysynth/agents/rag/ingestion/chunkAnalyzer.js";
export declare class WebResearchIngestionProcessor extends IngestionAgentProcessor {
    dataLayoutPath: string;
    cachedFiles: string[];
    fileMetadataPath: string;
    fileMetadata: Record<string, PsRagDocumentSource>;
    initialFileMetadata: Record<string, PsRagDocumentSource>;
    cleanupAgent: DocumentCleanupAgent;
    splitAgent: DocumentTreeSplitAgent;
    chunkCompressor: IngestionChunkCompressorAgent;
    chunkAnalysisAgent: IngestionChunkAnalzyerAgent;
    docAnalysisAgent: DocumentAnalyzerAgent;
    constructor(dataLayoutPath?: string);
    processDataLayout(): Promise<void>;
    processAllCachedFiles(): Promise<void>;
    processCachedFile(filePath: string): Promise<void>;
    processFilePartTree(fileId: string, cleanedUpData: string, weaviateDocumentId: string): Promise<void>;
    readDataLayout(): Promise<PsIngestionDataLayout>;
    private loadFileMetadata;
    private saveFileMetadata;
    private downloadAndCache;
    private downloadAndCacheUrl;
    private extractYouTubeContent;
    private processJsonUrls;
    private processJsonUrl;
    createTreeChunks(metadata: PsRagDocumentSource, cleanedUpData: string): Promise<void>;
    rankChunks(metadata: PsRagDocumentSource): Promise<void>;
    aggregateChunkData: (chunks: LlmDocumentChunksStrategy[]) => string;
}
//# sourceMappingURL=agentProcessor.d.ts.map