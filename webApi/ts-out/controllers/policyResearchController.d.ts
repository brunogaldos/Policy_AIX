import { BaseController } from "@policysynth/api/controllers/baseController.js";
import express from "express";
import WebSocket from 'ws';
export declare class PolicyResearchController extends BaseController {
    path: string;
    constructor(wsClients: Map<string, WebSocket>);
    initializeRoutes(): Promise<void>;
    private testCors;
    private getChatLog;
    liveResearchChat: (req: express.Request, res: express.Response) => Promise<void>;
    /**
     * Get RAG context from SkillsFirstChatBot API
     */
    private getRAGContext;
    /**
     * Retrieve RAG response from memory after SkillsFirstChatBot has processed it
     */
    private retrieveRAGResponseFromMemory;
}
//# sourceMappingURL=policyResearchController.d.ts.map