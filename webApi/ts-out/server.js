import { AnalyticsController } from '@policysynth/api/controllers/analyticsController.js';
import { CustomPolicySynthApiApp } from './customApp.js';
import { LiveResearchChatController } from './controllers/liveResearchChatController.js';
const app = new CustomPolicySynthApiApp([
    AnalyticsController,
    LiveResearchChatController
], 5029);
app.listen();
