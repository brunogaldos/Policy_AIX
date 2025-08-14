import { BaseController } from "@policysynth/api/controllers/baseController.js";
import { WebResearchRagChatBot } from "../chatbot/chatBot.js";
export class RagChatController extends BaseController {
    constructor(wsClients) {
        super(wsClients);
        this.getChatLog = async (req, res) => {
            const memoryId = req.params.memoryId;
            let chatLog;
            let totalCosts;
            try {
                if (memoryId) {
                    const memory = await WebResearchRagChatBot.loadMemoryFromRedis(memoryId);
                    if (memory) {
                        console.log(`memory loaded: ${JSON.stringify(memory, null, 2)}`);
                        chatLog = memory.chatLog;
                        totalCosts = WebResearchRagChatBot.getFullCostOfMemory(memory);
                    }
                    else {
                        console.log(`memory not found for id ${memoryId}`);
                    }
                }
            }
            catch (error) {
                console.log(error);
                res.sendStatus(500);
                return;
            }
            if (chatLog) {
                res.send({ chatLog, totalCosts });
            }
            else {
                res.sendStatus(404);
            }
        };
        this.ragChat = async (req, res) => {
            const chatLog = req.body.chatLog;
            const wsClientId = req.body.wsClientId;
            const memoryId = req.body.memoryId;
            let saveChatLog;
            try {
                const bot = new WebResearchRagChatBot(wsClientId, this.wsClients, memoryId);
                if (memoryId) {
                    const memory = await bot.getLoadedMemory();
                    if (memory) {
                        saveChatLog = memory.chatLog;
                    }
                }
                const dataLayout = await this.loadDataLayout();
                await bot.webResearchConversation(chatLog, dataLayout);
            }
            catch (error) {
                console.log(error);
                res.sendStatus(500);
                return;
            }
            console.log(`RagChatController for id ${wsClientId} initialized chatLog of length ${chatLog?.length}`);
            if (saveChatLog) {
                res.send(saveChatLog);
            }
            else {
                res.sendStatus(200);
            }
        };
        this.path = "/api/rag_chat";
    }
    async initializeRoutes() {
        this.router.put(this.path + "/", this.ragChat);
        this.router.get(this.path + "/:memoryId", this.getChatLog);
    }
    async loadDataLayout() {
        try {
            const fs = await import('fs/promises');
            const dataLayoutPath = './src/ingestion/dataLayout.json';
            const dataLayoutContent = await fs.readFile(dataLayoutPath, 'utf-8');
            return JSON.parse(dataLayoutContent);
        }
        catch (error) {
            console.error('Failed to load data layout:', error);
            // Return empty data layout as fallback
            return {
                documentUrls: [],
                jsonUrls: [],
                categories: [],
                aboutProject: "Web Research Tool RAG System"
            };
        }
    }
}
