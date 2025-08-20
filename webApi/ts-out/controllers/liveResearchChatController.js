import { BaseController } from "@policysynth/api/controllers/baseController.js";
import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js"; //NEW
import { LiveResearchChatBot } from "../liveResearchChatBot.js";
export class LiveResearchChatController extends BaseController {
    constructor(wsClients) {
        super(wsClients);
        this.path = "/api/live_research_chat";
        this.testCors = async (req, res) => {
            console.log(`🧪 CORS test request from origin: ${req.headers.origin}`);
            res.json({
                message: "CORS test successful",
                origin: req.headers.origin,
                timestamp: new Date().toISOString()
            });
        };
        this.getChatLog = async (req, res) => {
            console.log(`🔍 GET request to ${req.path} from origin: ${req.headers.origin}`);
            const memoryId = req.params.memoryId;
            let chatLog;
            let totalCosts;
            try {
                if (memoryId) {
                    const memory = await LiveResearchChatBot.loadMemoryFromRedis(memoryId);
                    if (memory) {
                        console.log(`memory loaded: ${JSON.stringify(memory, null, 2)}`);
                        chatLog = memory.chatLog;
                        //totalCosts = LiveResearchChatBot.getFullCostOfMemory(memory);
                        totalCosts = PsBaseChatBot.getFullCostOfMemory(memory);
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
        this.liveResearchChat = async (req, res) => {
            console.log(`🔍 PUT request to ${req.path} from origin: ${req.headers.origin}`);
            console.log(`📋 Request headers:`, JSON.stringify(req.headers, null, 2));
            console.log(`📦 Request body:`, JSON.stringify(req.body, null, 2));
            const chatLog = req.body.chatLog || [];
            const wsClientId = req.body.wsClientId;
            const memoryId = req.body.memoryId;
            const numberOfSelectQueries = req.body.numberOfSelectQueries || 5;
            const percentOfTopQueriesToSearch = req.body.percentOfTopQueriesToSearch || 0.25;
            const percentOfTopResultsToScan = req.body.percentOfTopResultsToScan || 0.25;
            const silentMode = Boolean(req.body.silentMode);
            // For testing purposes, allow requests without wsClientId
            if (!wsClientId) {
                console.log('⚠️ No wsClientId provided - this is a test request');
                res.status(200).json({
                    message: "Test request received successfully",
                    note: "For full functionality, establish WebSocket connection first",
                    timestamp: new Date().toISOString()
                });
                return;
            }
            let saveChatLog;
            try {
                const bot = new LiveResearchChatBot(wsClientId, this.wsClients, memoryId);
                if (silentMode) {
                    console.log('🔇 Enabling silent mode for live research');
                    bot.silentMode = true;
                }
                if (memoryId) {
                    const memory = await bot.getLoadedMemory();
                    if (memory) {
                        saveChatLog = memory.chatLog;
                    }
                }
                // Run the research conversation normally
                bot.researchConversation(chatLog, numberOfSelectQueries, percentOfTopQueriesToSearch, percentOfTopResultsToScan);
            }
            catch (error) {
                console.log(error);
                res.sendStatus(500);
                return;
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
        this.router.put(this.path + "/", this.liveResearchChat);
        this.router.get(this.path + "/:memoryId", this.getChatLog);
        this.router.get(this.path + "/test", this.testCors); // Add test endpoint
    }
}
