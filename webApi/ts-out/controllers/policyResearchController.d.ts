import { BaseController } from "@policysynth/api/controllers/baseController.js";
import express from "express";
import WebSocket from "ws";
export declare class PolicyResearchController extends BaseController {
    path: string;
    constructor(wsClients: Map<string, WebSocket>);
    initializeRoutes(): Promise<void>;
    private testCors;
    private getChatLog;
    policyResearchChat: (req: express.Request, res: express.Response) => Promise<void>;
    private extractCityName;
    private getRealNO2Data;
    private getRealPolicyResearch;
    private synthesizeRealResponses;
}
//# sourceMappingURL=policyResearchController.d.ts.map