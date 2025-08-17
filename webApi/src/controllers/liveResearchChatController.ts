import { BaseController } from "@policysynth/api/controllers/baseController.js";
import express from "express";
import WebSocket from "ws";
import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js"; //NEW
import { LiveResearchChatBot } from "../liveResearchChatBot.js";

export class LiveResearchChatController extends BaseController {
  public path = "/api/live_research_chat";

  constructor(wsClients: Map<string, WebSocket>) {
    super(wsClients);
    this.initializeRoutes();
  }

  public async initializeRoutes() {
    this.router.put(this.path + "/", this.liveResearchChat);
    this.router.get(this.path + "/:memoryId", this.getChatLog);
    this.router.get(this.path + "/test", this.testCors); // Add test endpoint
  }

  private testCors = async (req: express.Request, res: express.Response) => {
    console.log(`🧪 CORS test request from origin: ${req.headers.origin}`);
    res.json({ 
      message: "CORS test successful", 
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
  };

  private getChatLog = async (req: express.Request, res: express.Response) => {
    console.log(`🔍 GET request to ${req.path} from origin: ${req.headers.origin}`);
    
    const memoryId = req.params.memoryId;
    let chatLog: PsSimpleChatLog[] | undefined;
    let totalCosts: number | undefined;

    try {
      if (memoryId) {
        const memory = await LiveResearchChatBot.loadMemoryFromRedis(memoryId);
        if (memory) {
          console.log(`memory loaded: ${JSON.stringify(memory, null, 2)}`)
          chatLog = memory.chatLog;
          //totalCosts = LiveResearchChatBot.getFullCostOfMemory(memory);
          totalCosts = PsBaseChatBot.getFullCostOfMemory(memory);
        } else {
          console.log(`memory not found for id ${memoryId}`)
        }
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
      return;
    }
    
    if (chatLog) {
      res.send({ chatLog, totalCosts });
    } else {
      res.sendStatus(404);
    }
  };

  liveResearchChat = async (req: express.Request, res: express.Response) => {
    console.log(`🔍 PUT request to ${req.path} from origin: ${req.headers.origin}`);
    console.log(`📋 Request headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`📦 Request body:`, JSON.stringify(req.body, null, 2));
    
    const chatLog = req.body.chatLog || [];
    const wsClientId = req.body.wsClientId;
    const memoryId = req.body.memoryId;
    const numberOfSelectQueries = req.body.numberOfSelectQueries || 5;
    const percentOfTopQueriesToSearch = req.body.percentOfTopQueriesToSearch || 0.25;
    const percentOfTopResultsToScan = req.body.percentOfTopResultsToScan || 0.25;
    const silentMode = req.body.silentMode || false;

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

    let saveChatLog: PsSimpleChatLog[] | undefined;

    try {
      const bot = new LiveResearchChatBot(wsClientId, this.wsClients, memoryId);
      
      // Enable silent mode if this is a policy research call (check by memory ID pattern)
      if (memoryId && memoryId.startsWith('live-research-')) {
        console.log('🔇 Enabling silent mode for policy research call');
        bot.silentMode = true;
      }
      
      if (memoryId) {
        const memory = await bot.getLoadedMemory();
        if (memory) {
          saveChatLog = memory.chatLog;
        }
      }
      
      // Run the research conversation normally
      bot.researchConversation(
        chatLog,
        numberOfSelectQueries,
        percentOfTopQueriesToSearch,
        percentOfTopResultsToScan
      );
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
      return;
    }

    console.log(
      `LiveResearchChatController for id ${wsClientId} initialized chatLog of length ${chatLog?.length}`
    );

    if (saveChatLog) {
      res.send(saveChatLog);
    } else {
      res.sendStatus(200);
    }
  };
}
