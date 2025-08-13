import { AnalyticsController } from '@policysynth/api/controllers/analyticsController.js';
import { CustomPolicySynthApiApp } from './customApp.js';
import { LiveResearchChatController } from './controllers/liveResearchChatController.js';
import { ChatController } from './controllers/chatController.js';
const app = new CustomPolicySynthApiApp([
    AnalyticsController,
    LiveResearchChatController,
    ChatController
], 5029);
app.listen();
