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

  // Override parent WebSocket initialization to prevent conflicts
  override initWebSockets(): void {
    console.log('initWebSockets called - using custom WebSocket');
    // Use our custom WebSocket initialization instead of parent's
    this.initializeWebSocketConnection();
  }

  // Override to prevent parent from closing our WebSocket
  override disconnectedCallback(): void {
    console.log('disconnectedCallback called - keeping WebSocket open');
    // Call parent but don't let it close our WebSocket
    // super.disconnectedCallback();
  }

  override connectedCallback(): void {
    super.connectedCallback(); 
    this.defaultInfoMessage = this.t("I'm your helpful web research assistant");
    this.textInputLabel = this.t('Please state your research question.');
    
    this.serverApi = new ResearchServerApi();
  }

  private initializeWebSocketConnection(): void {
    if (!this.wsClientId) {
      const wsUrl = `ws://localhost:${this.defaultDevWsPort}/ws`;
      console.log('Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          
          if (message.clientId) {
            this.wsClientId = message.clientId;
            console.log('WebSocket client ID set:', this.wsClientId);
            console.log('Chat bot is now ready to send messages!');
          }
          
          // Always forward messages to parent handler (including clientId)
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected - code:', event.code, 'reason:', event.reason);
        console.log('wsClientId at disconnect:', this.wsClientId);
        // Clear the clientId since connection is lost
        this.wsClientId = '';
        // Attempt to reconnect after a delay
        setTimeout(() => {
          console.log('Attempting reconnection...');
          this.initializeWebSocketConnection();
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
    // Ensure WebSocket is connected and wsClientId is set
    if (!this.wsClientId) {
      console.error('WebSocket not connected yet. Please wait for connection to establish.');
      return;
    }

    const userMessage = this.chatInputField!.value;
    if (this.chatLog.length === 0) {
      this.fire('start-process');
    }
    super.sendChatMessage();

    this.addUserChatBotMessage(userMessage);

    console.log('Sending conversation request with wsClientId:', this.wsClientId);
    
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
