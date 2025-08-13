import { BaseController } from "@policysynth/api/controllers/baseController.js";
import express from "express";
import WebSocket from "ws";
export declare class RagChatController extends BaseController {
    path: string;
    constructor(wsClients: Map<string, WebSocket>);
    initializeRoutes(): Promise<void>;
    private getChatLog;
    ragChat: (req: express.Request, res: express.Response) => Promise<void>;
    private loadDataLayout;
}
//# sourceMappingURL=ragChatController.d.ts.map