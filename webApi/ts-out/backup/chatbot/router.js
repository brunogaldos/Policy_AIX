import { PolicySynthAgentBase } from "@policysynth/agents/baseAgent.js";
export class PsRagRouter extends PolicySynthAgentBase {
    async getRoutingData(userQuestion, dataLayout, chatHistory) {
        // For now, return a simple routing structure
        return {
            searchQuery: userQuestion,
            primaryCategory: "General",
            secondaryCategory: "",
            searchStrategy: "semantic",
            maxResults: 10,
            confidence: 0.8,
            rewrittenUserQuestionVectorDatabaseSearch: userQuestion
        };
    }
}
