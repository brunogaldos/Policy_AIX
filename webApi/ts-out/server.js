import { AnalyticsController } from '@policysynth/api/controllers/analyticsController.js';
import { PolicySynthApiApp } from '@policysynth/api/app.js';
import { LiveResearchChatController } from './controllers/liveResearchChatController.js';
import { ChatController } from './controllers/chatController.js';
import { PolicyResearchController } from './controllers/policyResearchController.js';
const app = new PolicySynthApiApp([
    AnalyticsController,
    ChatController,
    LiveResearchChatController,
    PolicyResearchController
], 5029);
app.listen();
