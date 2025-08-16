import { BaseIngestionAgent } from "@policysynth/agents/rag/ingestion/baseAgent.js";
export class PsRagRouter extends BaseIngestionAgent {
    constructor() {
        super(...arguments);
        this.systemMessageFull = (schema, about, chatHistory) => this.createSystemMessage(`You are an expert user question analyzer for a RAG based chatbot. We will use the information to decide what documents to retrieve for the user through a vector database search.

Instructions:
- Use the available categories to classify the question the user will provide you with in the LATEST_QUESTION_FROM_USER tag
- Always output one primary category
- Output one or more secondary categories if those could help answer the user question if there is any chance it could help, even if small
- Always keep a track of what topic you are discussing with the user from your chat history and include that topic in the "rewrittenUserQuestionVectorDatabaseSearch" JSON field.
- Still allow the user to change the topic if they want to in a middle of the converstation, when it's clear and in that case do not include the old topic in the new user question.
- Always rewrite the user question based on your conversation history with the user as needed for the best possible vector search query and include it in "rewrittenUserQuestionVectorDatabaseSearch" JSON field.


Your conversation history with the user:
${chatHistory}

About this project:
${about}

Available primary and secondary categories:
${schema}

JSON Output:
{
  primaryCategory: string;
  secondaryCategories: string[];
  userIsAskingForLatestContent: boolean;
  isAskingAboutOneSpecificDetail: string;
  isAskingAboutOneSpecificProject: string;
  rewrittenUserQuestionVectorDatabaseSearch: string;
}
`);
        this.systemMessage = (schema, about, chatHistory) => this.createSystemMessage(`You are an expert user question analyzer for a RAG based chatbot. We will use the information to decide what documents to retrieve for the user through a vector database search.

Instructions:
- Always keep a track of what topic you are discussing with the user from your chat history and include that topic in the "rewrittenUserQuestionVectorDatabaseSearch" JSON field.
- Still allow the user to change the topic if they want to in a middle of the converstation, when it's clear and in that case do not include the old topic in the new user question.
- Always rewrite the user question based on your conversation history with the user as needed for the best possible vector search query and include it in "rewrittenUserQuestionVectorDatabaseSearch" JSON field.
- If the user question does not need rewriting, you can leave the "rewrittenUserQuestionVectorDatabaseSearch" JSON with "".

Your conversation history with the user:
${chatHistory}

About this project:
${about}

Available primary and secondary categories:
${schema}

JSON Output:
{
rewrittenUserQuestionVectorDatabaseSearch: string;
}
`);
        this.userMessage = (question) => this.createHumanMessage(`<LATEST_QUESTION_FROM_USER>${question}</LATEST_QUESTION_FROM_USER>

Your JSON classification:
`);
    }
    async getRoutingData(userQuestion, dataLayout, chatHistory) {
        // Fix the callLLM signature - messages should be the second parameter
        const routingInformation = await this.callLLM("ingestion-agent", this.getFirstMessages(this.systemMessage(JSON.stringify(dataLayout.categories), dataLayout.aboutProject, chatHistory), this.userMessage(userQuestion)));
        console.log(`Routing information: ${JSON.stringify(routingInformation, null, 2)}`);
        return routingInformation;
    }
}
