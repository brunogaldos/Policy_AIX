import { customElement, property } from 'lit/decorators.js';
import { css } from 'lit';

import { PsChatAssistant } from '@policysynth/webapp/chatBot/ps-chat-assistant.js';
import { ResearchServerApi } from './researchServerApi.js';

@customElement('live-research-chat-bot')
export class LiveResearchChatBot extends PsChatAssistant {
  @property({ type: Number })
  defaultDevWsPort = 5029;

  @property({ type: Number })
  numberOfSelectQueries = 5;

  @property({ type: Number })
  percentOfTopQueriesToSearch = 0.25;

  @property({ type: Number })
  percentOfTopResultsToScan = 0.25;

  @property({ type: Array })
  chatLogFromServer: PsAiChatWsMessage[] | undefined;

  showCleanupButton = true;

  serverApi: ResearchServerApi;

  override connectedCallback(): void {
    super.connectedCallback(); 
    this.defaultInfoMessage = this.t("I'm your helpful web research assistant");
    this.textInputLabel = this.t('Please state your research question.');
    
    this.serverApi = new ResearchServerApi();
    
    // Initialize WebSocket connection if not already done
    //this.initializeWebSocketConnection();
  }

  private initializeWebSocketConnection(): void {
    if (!this.wsClientId) {
      const wsUrl = `ws://localhost:${this.defaultDevWsPort}`;
      console.log('Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          
          if (message.type === 'clientId') {
            this.wsClientId = message.data;
            console.log('WebSocket client ID set:', this.wsClientId);
          } else {
            // Handle other message types as needed
            this.handleWebSocketMessage(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (!this.wsClientId) {
            this.initializeWebSocketConnection();
          }
        }, 3000);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    }
  }

  private handleWebSocketMessage(message: any): void {
    // Handle other WebSocket messages from the server
    console.log('Received WebSocket message:', message);
    
    // Forward all non-clientId messages to parent's message handler
    // The parent class expects a MessageEvent object
    const mockEvent = {
      data: JSON.stringify(message)
    } as MessageEvent;
    
    // Call parent's onMessage method to handle chat responses
    this.onMessage(mockEvent);
  }

  static override get styles() {
    return [
      ...super.styles,
      css`
        .chat-window {
          height: 85vh;
          width: 100vw;
        }
      `,
    ];
  }

  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated(changedProperties);
    if (changedProperties.has('chatLogFromServer') && this.chatLogFromServer) {
      this.chatLog = this.chatLogFromServer;
    }
  }

  override async sendChatMessage() {
    const userMessage = this.chatInputField!.value;
    if (this.chatLog.length === 0) {
      this.fire('start-process');
    }
    super.sendChatMessage();

    this.addUserChatBotMessage(userMessage);

    await this.serverApi.conversation(
      this.serverMemoryId,
      this.simplifiedChatLog,
      this.wsClientId,
      this.numberOfSelectQueries,
      this.percentOfTopQueriesToSearch,
      this.percentOfTopResultsToScan
    );
  }
}
