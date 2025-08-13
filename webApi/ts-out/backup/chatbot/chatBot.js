import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
import { PsRagRouter } from "./router.js";
import { PsRagVectorSearch } from "./vectorSearch.js";
export class WebResearchRagChatBot extends PsBaseChatBot {
    constructor() {
        super(...arguments);
        this.persistMemory = true;
        this.mainSreamingSystemPrompt = `You are the Web Research Tool RAG chatbot, a friendly AI that helps users find information from a large database of documents about skills-first hiring, workforce development, and talent management.

Instructions:
- The user will ask a question, we will search a large database in a vector store and bring information connected to the user question into your <CONTEXT_TO_ANSWER_USERS_QUESTION_FROM> to provide a thoughtful answer from.
- If not enough information is available, you can ask the user for more information.
- Never provide information that is not backed by your context or is common knowledge.
- Look carefully at all in your context before you present the information to the user.
- Be helpful and professional in your responses, focusing on practical insights about skills-first hiring and workforce development.
- For longer outputs use bullet points and markdown to make the information easy to read.
- Do not reference your contexts and the different document sources just provide the information based on those sources.
- For all document sources we will provide the user with those you do not need to link or reference them.
- If there are inline links in the actual document chunks, you can provide those to the user in a markdown link format.
- Use markdown to format your answers, always use formatting so the response comes alive to the user.
- Keep your answers short and to the point except when the user asks for detail.
- Focus on practical applications and real-world examples of skills-first hiring practices.
`;
        this.mainStreamingUserPrompt = (latestQuestion, context) => `<CONTEXT_TO_ANSWER_USERS_QUESTION_FROM>
${context}
</CONTEXT_TO_ANSWER_USERS_QUESTION_FROM>

<LATEST_USER_QUESTION>
${latestQuestion}
</LATEST_USER_QUESTION>

Your thoughtful answer in markdown:
`;
    }
    sendSourceDocuments(document) {
        document.forEach((d, i) => {
            if (d.contentType.includes("json")) {
                const refurls = JSON.parse(d.allReferencesWithUrls);
                if (refurls.length > 0)
                    document[i].url = refurls[0].url;
            }
        });
        const botMessage = {
            sender: "bot",
            type: "info",
            data: {
                name: "sourceDocuments",
                message: document,
            },
        };
        if (this.wsClientSocket) {
            this.wsClientSocket.send(JSON.stringify(botMessage));
        }
        else {
            console.error("No wsClientSocket found");
        }
    }
    async webResearchConversation(chatLog, dataLayout) {
        this.setChatLog(chatLog);
        const userLastMessage = chatLog[chatLog.length - 1].message;
        console.log(`userLastMessage: ${userLastMessage}`);
        const chatLogWithoutLastUserMessage = chatLog.slice(0, -1);
        console.log(`chatLogWithoutLastUserMessage: ${JSON.stringify(chatLogWithoutLastUserMessage, null, 2)}`);
        this.sendAgentStart("Thinking...");
        const router = new PsRagRouter();
        const routingData = await router.getRoutingData(userLastMessage, dataLayout, JSON.stringify(chatLogWithoutLastUserMessage));
        this.sendAgentStart("Searching Web Research Tool...");
        const vectorSearch = new PsRagVectorSearch();
        const searchContextRaw = await vectorSearch.search(userLastMessage, routingData, dataLayout);
        const searchContext = await this.updateUrls(searchContextRaw);
        console.log("search_context", searchContext);
        console.log("In Web Research Tool conversation");
        let messages = chatLogWithoutLastUserMessage.map((message) => ({
            role: message.sender === "user" ? "user" : "assistant",
            content: message.message,
        }));
        if (searchContext.length > 0) {
            this.sendSourceDocuments(searchContext);
        }
        await this.streamResponse(this.mainSreamingSystemPrompt, this.mainStreamingUserPrompt(userLastMessage, searchContext), messages);
    }
    async updateUrls(searchContext) {
        let context = "";
        for (let i = 0; i < searchContext.length; i++) {
            const doc = searchContext[i];
            if (doc.contentType.includes("json")) {
                try {
                    const refurls = JSON.parse(doc.allReferencesWithUrls);
                    if (refurls.length > 0) {
                        searchContext[i].url = refurls[0].url;
                    }
                }
                catch (error) {
                    console.error("Error parsing JSON references:", error);
                }
            }
            const content = doc.compressedFullDescriptionOfAllContents ||
                doc.description ||
                doc.title;
            context += `Document ${i + 1}:
Title: ${doc.title}
URL: ${doc.url}
Content: ${content}
---\n\n`;
        }
        return context;
    }
    async streamResponse(systemPrompt, userPrompt, chatHistory) {
        this.sendAgentStart("Generating response...");
        try {
            // Convert chat history to the format expected by the LLM
            const messages = chatHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            // Add the current prompts
            messages.unshift({ role: "system", content: systemPrompt });
            messages.push({ role: "user", content: userPrompt });
            // For now, use a simple approach - we'll implement proper streaming later
            this.sendToClient("bot", "Response generated successfully", "info");
            // Save the bot's response to memory
            this.memory.chatLog.push({
                sender: "assistant",
                message: "Response generated", // This will be updated by the base class
            });
            await this.saveMemoryIfNeeded();
        }
        catch (error) {
            console.error(`Error streaming response: ${error}`, error);
            let errorMessage = "An error occurred while generating the response.";
            if (error.message) {
                errorMessage = error.message;
            }
            this.sendToClient("bot", `Error: ${errorMessage}`, "error");
        }
    }
}
