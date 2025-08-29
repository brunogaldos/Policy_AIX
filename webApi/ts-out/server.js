import { AnalyticsController } from '@policysynth/api/controllers/analyticsController.js';
import { CustomPolicySynthApiApp } from './customApp.js';
import { ChatController } from './controllers/chatController.js';
import { PolicyResearchController } from './controllers/policyResearchController.js';
const app = new CustomPolicySynthApiApp([
    AnalyticsController,
    ChatController,
    PolicyResearchController
], 5029);
app.listen();
