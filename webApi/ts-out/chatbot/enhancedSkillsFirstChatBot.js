import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
import { PsRagRouter } from "./router.js";
import { PsRagVectorSearch } from "./vectorSearch.js";
import { ResourceWatchSimpleIntegration } from "../services/resourceWatchSimpleIntegration.js";
export class EnhancedSkillsFirstChatBot extends PsBaseChatBot {
    constructor(wsClientId, wsClients, memoryId) {
        super(wsClientId, wsClients, memoryId);
        this.persistMemory = true;
        this.mainSreamingSystemPrompt = `You are the Skills First Research Tool chatbot, a friendly AI that helps users find information from a large database of documents about skills development, workforce training, and environmental factors affecting employment.

Instructions:
- The user will ask a question, we will search a large database in a vector store and bring information connected to the user question into your <CONTEXT_TO_ANSWER_USERS_QUESTION_FROM> to provide a thoughtful answer from.
- If environmental context is provided, consider how environmental factors (air quality, climate change, etc.) impact skills development and workforce training.
- If not enough information is available, you can ask the user for more information.
- Never provide information that is not backed by your context or is common knowledge.
- Look carefully at all in your context before you present the information to the user.
- Be optimistic and cheerful but keep a professional nordic style of voice.
- For longer outputs use bullet points and markdown to make the information easy to read.
- Do not reference your contexts and the different document sources just provide the information based on those sources.
- For all document sources we will provide the user with those you do not need to link or reference them.
- If there are inline links in the actual document chunks, you can provide those to the user in a markdown link format.
- Use markdown to format your answers, always use formatting so the response comes alive to the user.
- Keep your answers short and to the point except when the user asks for detail.
- When environmental data is available, integrate it naturally into your skills development recommendations.
`;
        this.mainStreamingUserPrompt = (latestQuestion, context, environmentalContext) => `<CONTEXT_TO_ANSWER_USERS_QUESTION_FROM>
${context}
</CONTEXT_TO_ANSWER_USERS_QUESTION_FROM>

${environmentalContext ? `<ENVIRONMENTAL_CONTEXT>
${environmentalContext}
</ENVIRONMENTAL_CONTEXT>` : ''}

<LATEST_USER_QUESTION>
${latestQuestion}
</LATEST_USER_QUESTION>

Your thoughtful answer in markdown:
`;
        this.resourceWatchIntegration = new ResourceWatchSimpleIntegration();
    }
    sendSourceDocuments(document) {
        document.forEach((d, i) => {
            if (d.contentType && d.contentType.includes("json")) {
                try {
                    const refurls = JSON.parse(d.allReferencesWithUrls);
                    if (refurls.length > 0 && refurls[0].url) {
                        document[i].url = refurls[0].url;
                    }
                }
                catch (error) {
                    console.error("Error parsing allReferencesWithUrls:", error);
                }
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
    async enhancedSkillsFirstConversation(chatLog, dataLayout) {
        this.setChatLog(chatLog);
        const userLastMessage = chatLog[chatLog.length - 1].message;
        console.log(`userLastMessage: ${userLastMessage}`);
        const chatLogWithoutLastUserMessage = chatLog.slice(0, -1);
        console.log(`chatLogWithoutLastUserMessage: ${JSON.stringify(chatLogWithoutLastUserMessage, null, 2)}`);
        // Check for environmental context
        let environmentalContext = null;
        try {
            const envContext = await this.resourceWatchIntegration.getEnvironmentalContext(userLastMessage);
            if (envContext) {
                environmentalContext = envContext.summary;
                console.log(`Environmental context detected: ${envContext.category}`);
                // Send environmental context to user
                this.sendAgentStart(`🌍 Detected environmental context: ${envContext.category}`);
            }
        }
        catch (error) {
            console.error('Error getting environmental context:', error);
        }
        this.sendAgentStart("Thinking...");
        const router = new PsRagRouter();
        const routingData = await router.getRoutingData(userLastMessage, dataLayout, JSON.stringify(chatLogWithoutLastUserMessage));
        this.sendAgentStart("Searching Skills First Research...");
        const vectorSearch = new PsRagVectorSearch();
        const searchContextRaw = await vectorSearch.search(userLastMessage, routingData, dataLayout);
        this.sendAgentStart("Analyzing environmental factors...");
        // Enhance the search context with environmental data if relevant
        let enhancedContext = searchContextRaw;
        if (environmentalContext) {
            enhancedContext = `${searchContextRaw}

**Current Environmental Context:**
${environmentalContext}

*This environmental data can help inform skills development strategies and workforce training approaches.*`;
        }
        this.sendSourceDocuments(searchContextRaw);
        this.sendAgentStart("Generating response...");
        // Use the enhanced prompt with environmental context
        const userPrompt = this.mainStreamingUserPrompt(userLastMessage, enhancedContext, environmentalContext);
        const messages = [
            {
                role: "system",
                content: this.mainSreamingSystemPrompt,
            },
            {
                role: "user",
                content: userPrompt,
            },
        ];
        try {
            const stream = await this.openaiClient.chat.completions.create({
                model: "gpt-4-0125-preview",
                messages,
                max_tokens: 4000,
                temperature: 0.7,
                stream: true,
            });
            await this.streamWebSocketResponses(stream);
        }
        catch (error) {
            console.error("Error in enhanced conversation:", error);
            this.sendAgentStart("Error generating response");
        }
    }
    // Keep the original method for backward compatibility
    async skillsFirstConversation(chatLog, dataLayout) {
        return this.enhancedSkillsFirstConversation(chatLog, dataLayout);
    }
}
