import { BaseController } from "@policysynth/api/controllers/baseController.js";
import express from "express";
import WebSocket from "ws";
import { SkillsFirstChatBot } from "../chatbot/chatBot.js";

export class ChatController extends BaseController {
  public path = "/api/rd_chat";

  constructor(wsClients: Map<string, WebSocket>) {
    super(wsClients);
    this.initializeRoutes();
  }

  public async initializeRoutes() {
    this.router.put(this.path + "/", this.skillsFirstChat);
    this.router.get(this.path + "/:memoryId", this.getChatLog);
  }

  private getChatLog = async (req: express.Request, res: express.Response) => {
    const memoryId = req.params.memoryId;
    let chatLog: PsSimpleChatLog[] | undefined;
    let totalCosts: number | undefined;

    try {
      if (memoryId) {
        const memory = await SkillsFirstChatBot.loadMemoryFromRedis(memoryId);
        if (memory) {
          console.log(`memory loaded: ${JSON.stringify(memory, null, 2)}`)
          chatLog = memory.chatLog;
          totalCosts = SkillsFirstChatBot.getFullCostOfMemory(memory);
        } else {
          console.log(`memory not found for id ${memoryId}`)
        }
      }
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
    if (chatLog) {
      res.send({ chatLog, totalCosts });
    } else {
      res.sendStatus(404);
    }
  };

  skillsFirstChat = async (req: express.Request, res: express.Response) => {
    const chatLog = req.body.chatLog;
    const wsClientId = req.body.wsClientId;
    const memoryId = req.body.memoryId;
    let saveChatLog: PsSimpleChatLog[] | undefined;

    try {
      const bot = new SkillsFirstChatBot(wsClientId, this.wsClients, memoryId);
      if (memoryId) {
        const memory = await bot.getLoadedMemory();
        if (memory) {
          saveChatLog = memory.chatLog;
        }
      }
      bot.skillsFirstConversation(
        chatLog,
        [] as any
      );
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
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
