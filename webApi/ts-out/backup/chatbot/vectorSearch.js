import { PolicySynthAgentBase } from "@policysynth/agents/baseAgent.js";
import { PsRagDocumentVectorStore } from "@policysynth/agents/rag/vectorstore/ragDocument.js";
import { PsRagChunkVectorStore } from "@policysynth/agents/rag/vectorstore/ragChunk.js";
export class PsRagVectorSearch extends PolicySynthAgentBase {
    constructor() {
        super();
        this.documentStore = new PsRagDocumentVectorStore();
        this.chunkStore = new PsRagChunkVectorStore();
    }
    async search(userQuestion, routingData, dataLayout) {
        try {
            const searchQuery = routingData.searchQuery || userQuestion;
            const maxResults = routingData.maxResults || 10;
            // Search in chunks first for more specific content
            // For now, return empty results - we'll implement search later
            const chunkResults = [];
            // Also search in documents for broader context
            // For now, return empty results - we'll implement search later
            const documentResults = [];
            // Combine and deduplicate results
            const allResults = [...chunkResults, ...documentResults];
            const uniqueResults = this.deduplicateResults(allResults);
            // Filter by category if specified
            let filteredResults = uniqueResults;
            if (routingData.primaryCategory && routingData.primaryCategory !== "General") {
                filteredResults = uniqueResults.filter(result => result.primaryCategory === routingData.primaryCategory ||
                    result.secondaryCategory === routingData.primaryCategory);
            }
            // If no category-specific results, fall back to all results
            if (filteredResults.length === 0) {
                filteredResults = uniqueResults;
            }
            // Sort by relevance (ELO rating)
            filteredResults.sort((a, b) => (b.relevanceEloRating || 0) - (a.relevanceEloRating || 0));
            return filteredResults.slice(0, maxResults);
        }
        catch (error) {
            console.error("Error in vector search:", error);
            return [];
        }
    }
    deduplicateResults(results) {
        const seen = new Set();
        return results.filter(result => {
            const key = result.url || result.title;
            if (key && seen.has(key)) {
                return false;
            }
            if (key)
                seen.add(key);
            return true;
        });
    }
}
