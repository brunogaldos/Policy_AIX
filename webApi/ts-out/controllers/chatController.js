import { BaseController } from "@policysynth/api/controllers/baseController.js";
import { SkillsFirstChatBot } from "../chatbot/chatBot.js";
export class ChatController extends BaseController {
    constructor(wsClients) {
        super(wsClients);
        this.path = "/api/rd_chat";
        this.getChatLog = async (req, res) => {
            const memoryId = req.params.memoryId;
            let chatLog;
            let totalCosts;
            try {
                if (memoryId) {
                    const memory = await SkillsFirstChatBot.loadMemoryFromRedis(memoryId);
                    if (memory) {
                        console.log(`memory loaded: ${JSON.stringify(memory, null, 2)}`);
                        chatLog = memory.chatLog;
                        totalCosts = SkillsFirstChatBot.getFullCostOfMemory(memory);
                    }
                    else {
                        console.log(`memory not found for id ${memoryId}`);
                    }
                }
            }
            catch (error) {
                console.log(error);
                res.sendStatus(500);
            }
            if (chatLog) {
                res.send({ chatLog, totalCosts });
            }
            else {
                res.sendStatus(404);
            }
        };
        this.skillsFirstChat = async (req, res) => {
            const chatLog = req.body.chatLog;
            const wsClientId = req.body.wsClientId;
            const memoryId = req.body.memoryId;
            let saveChatLog;
            try {
                const bot = new SkillsFirstChatBot(wsClientId, this.wsClients, memoryId);
                if (memoryId) {
                    const memory = await bot.getLoadedMemory();
                    if (memory) {
                        saveChatLog = memory.chatLog;
                    }
                }
                bot.skillsFirstConversation(chatLog, []);
            }
            catch (error) {
                console.log(error);
                res.sendStatus(500);
            }
            console.log(`LiveResearchChatController for id ${wsClientId} initialized chatLog of length ${chatLog?.length}`);
            if (saveChatLog) {
                res.send(saveChatLog);
            }
            else {
                res.sendStatus(200);
            }
        };
        this.initializeRoutes();
    }
    async initializeRoutes() {
        this.router.put(this.path + "/", this.skillsFirstChat);
        this.router.get(this.path + "/:memoryId", this.getChatLog);
    }
}
