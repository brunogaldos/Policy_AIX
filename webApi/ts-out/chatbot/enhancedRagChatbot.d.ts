export interface EnhancedChatMessage {
    sender: 'user' | 'assistant';
    message: string;
    timestamp: string;
    environmentalContext?: any;
}
export declare class EnhancedRagChatbot {
    private resourceWatchIntegration;
    constructor();
    processMessage(userMessage: string): Promise<EnhancedChatMessage>;
    private generateResponse;
    getEnvironmentalSummary(): Promise<string>;
    isEnvironmentalQuestion(question: string): Promise<boolean>;
}
//# sourceMappingURL=enhancedRagChatbot.d.ts.map