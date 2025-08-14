import { BaseController } from "@policysynth/api/controllers/baseController.js";
export declare class RagChatController extends BaseController {
    constructor(wsClients: Map<string, any>);
    getChatLog: (req: any, res: any) => Promise<void>;
    ragChat: (req: any, res: any) => Promise<void>;
    initializeRoutes(): Promise<void>;
    loadDataLayout(): Promise<any>;
}
//# sourceMappingURL=ragChatController.d.ts.map