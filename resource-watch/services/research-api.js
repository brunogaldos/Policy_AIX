import axios from 'axios';

// utils
import { logger } from '../utils/logs.js';

/**
 * Research API Service
 * Handles communication with the WebApi backend for live research functionality
 */

// Configuration
const RESEARCH_API_BASE_URL = process.env.NEXT_PUBLIC_RESEARCH_API_URL || '/api';
const RESEARCH_WS_URL = process.env.NEXT_PUBLIC_RESEARCH_WS_URL || 'ws://localhost:5029/ws';

// Debug logging for configuration
logger.info('Research API Configuration:', {
  apiUrl: RESEARCH_API_BASE_URL,
  wsUrl: RESEARCH_WS_URL
});

// Create axios instance for research API
const researchAPI = axios.create({
  baseURL: RESEARCH_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 second timeout for research requests
});

/**
 * WebSocket connection manager
 */
class ResearchWebSocketManager {
  constructor() {
    this.ws = null;
    this.clientId = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.messageHandlers = new Map();
    this.connectionHandlers = new Set();
    this.errorHandlers = new Set();
  }

  /**
   * Establish WebSocket connection
   * @returns {Promise<string>} Promise that resolves with client ID
   */
  establishWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        logger.info('Establishing WebSocket connection to research service');
        
        this.ws = new WebSocket(RESEARCH_WS_URL);
        
        this.ws.onopen = () => {
          logger.info('WebSocket connected to research service');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          // Notify connection handlers
          this.connectionHandlers.forEach(handler => {
            try {
              handler({ type: 'connected' });
            } catch (error) {
              logger.error('Error in connection handler:', error);
            }
          });
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            logger.info('WebSocket message received:', message);
            
            // Handle client ID assignment
            if (message.clientId && !this.clientId) {
              this.clientId = message.clientId;
              logger.info('WebSocket client ID assigned:', this.clientId);
              resolve(this.clientId);
            }
            
            // Handle different message formats from the research pipeline
            let processedMessage = message;
            
            // Handle agent messages (from research pipeline)
            if (message.type === 'agentStart') {
              processedMessage = {
                type: 'agent_start',
                message: message.message,
                data: message.data || message
              };
            } else if (message.type === 'agentUpdate') {
              processedMessage = {
                type: 'agent_update',
                message: message.message,
                data: message.data || message
              };
            } else if (message.type === 'agentCompleted') {
              processedMessage = {
                type: 'agent_completed',
                message: message.message,
                data: message.data || message
              };
            } else if (message.type === 'streamResponse') {
              processedMessage = {
                type: 'stream_response',
                content: message.content,
                data: message.data || message
              };
            } else if (message.type === 'streamEnd') {
              processedMessage = {
                type: 'stream_end',
                data: message.data || message
              };
            } else if (message.type === 'chatResponse') {
              processedMessage = {
                type: 'chat_response',
                content: message.content,
                data: message.data || message
              };
            } else if (message.type === 'costUpdate') {
              processedMessage = {
                type: 'cost_update',
                data: message.data || message
              };
            } else if (message.type === 'error') {
              processedMessage = {
                type: 'error',
                message: message.message || message.error,
                data: message.data || message
              };
            }
            
            // Route message to appropriate handlers
            const messageType = processedMessage.type || 'unknown';
            const handlers = this.messageHandlers.get(messageType) || [];
            handlers.forEach(handler => {
              try {
                handler(processedMessage);
              } catch (error) {
                logger.error(`Error in message handler for type ${messageType}:`, error);
              }
            });
            
            // Also call generic message handlers
            const genericHandlers = this.messageHandlers.get('*') || [];
            genericHandlers.forEach(handler => {
              try {
                handler(processedMessage);
              } catch (error) {
                logger.error('Error in generic message handler:', error);
              }
            });
            
          } catch (error) {
            logger.error('Error parsing WebSocket message:', error);
            this.notifyErrorHandlers(new Error('Failed to parse WebSocket message'));
          }
        };
        
        this.ws.onclose = (event) => {
          logger.info('WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.clientId = null;
          
          // Notify connection handlers
          this.connectionHandlers.forEach(handler => {
            try {
              handler({ type: 'disconnected', code: event.code, reason: event.reason });
            } catch (error) {
              logger.error('Error in connection handler:', error);
            }
          });
          
          // Attempt reconnection with exponential backoff
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
              this.establishWebSocket()
                .catch(error => {
                  logger.error('Reconnection failed:', error);
                  if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    this.notifyErrorHandlers(new Error('Max reconnection attempts reached'));
                  }
                });
            }, delay);
          } else {
            this.notifyErrorHandlers(new Error('WebSocket connection lost and max reconnection attempts reached'));
          }
        };
        
        this.ws.onerror = (error) => {
          logger.error('WebSocket error:', error);
          this.notifyErrorHandlers(new Error('WebSocket connection error'));
          
          if (!this.clientId) {
            reject(new Error('Failed to establish WebSocket connection'));
          }
        };
        
      } catch (error) {
        logger.error('Error establishing WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Send message through WebSocket
   * @param {Object} message - Message to send
   * @returns {Promise<void>}
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.ws) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      if (!this.clientId) {
        reject(new Error('WebSocket client ID not available'));
        return;
      }
      
      try {
        const payload = {
          ...message,
          clientId: this.clientId,
        };
        
        this.ws.send(JSON.stringify(payload));
        resolve();
      } catch (error) {
        logger.error('Error sending WebSocket message:', error);
        reject(error);
      }
    });
  }

  /**
   * Add message handler for specific message type
   * @param {string} messageType - Type of message to handle ('*' for all messages)
   * @param {Function} handler - Handler function
   */
  onMessage(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType).push(handler);
  }

  /**
   * Remove message handler
   * @param {string} messageType - Type of message
   * @param {Function} handler - Handler function to remove
   */
  offMessage(messageType, handler) {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Add connection status handler
   * @param {Function} handler - Handler function
   */
  onConnection(handler) {
    this.connectionHandlers.add(handler);
  }

  /**
   * Remove connection status handler
   * @param {Function} handler - Handler function to remove
   */
  offConnection(handler) {
    this.connectionHandlers.delete(handler);
  }

  /**
   * Add error handler
   * @param {Function} handler - Handler function
   */
  onError(handler) {
    this.errorHandlers.add(handler);
  }

  /**
   * Remove error handler
   * @param {Function} handler - Handler function to remove
   */
  offError(handler) {
    this.errorHandlers.delete(handler);
  }

  /**
   * Notify error handlers
   * @private
   */
  notifyErrorHandlers(error) {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        logger.error('Error in error handler:', handlerError);
      }
    });
  }

  /**
   * Close WebSocket connection
   */
  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.clientId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Get connection status
   * @returns {Object} Connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      clientId: this.clientId,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Global WebSocket manager instance
let wsManager = null;

/**
 * Get or create WebSocket manager instance
 * @returns {ResearchWebSocketManager}
 */
const getWebSocketManager = () => {
  if (!wsManager) {
    wsManager = new ResearchWebSocketManager();
  }
  return wsManager;
};

/**
 * Send research conversation request
 * @param {Array} chatLog - Array of chat messages
 * @param {Object} options - Research options
 * @returns {Promise<Array>} Promise that resolves with saved chat log or empty array
 */
export const conversation = async (chatLog = [], options = {}) => {
  logger.info('Sending research conversation request');
  
  const wsManager = getWebSocketManager();
  
  // Ensure WebSocket connection is established to get client ID
  if (!wsManager.isConnected) {
    logger.info('WebSocket not connected, establishing connection...');
    await wsManager.establishWebSocket();
  }
  
  if (!wsManager.clientId) {
    throw new Error('WebSocket client ID not available');
  }
  
  // Prepare research request payload
  const requestPayload = {
    wsClientId: wsManager.clientId,
    chatLog: chatLog.map(msg => ({
      sender: msg.sender || (msg.type === 'user' ? 'user' : 'assistant'),
      message: msg.message || msg.text || msg.content || '',
      timestamp: msg.timestamp || new Date(),
    })),
    numberOfSelectQueries: options.numberOfSelectQueries || 7,
    percentOfTopQueriesToSearch: options.percentOfTopQueriesToSearch || 0.25,
    percentOfTopResultsToScan: options.percentOfTopResultsToScan || 0.25,
    memoryId: options.memoryId,
  };
  
  logger.info('Research request payload:', {
    wsClientId: requestPayload.wsClientId,
    chatLogLength: requestPayload.chatLog.length,
    numberOfSelectQueries: requestPayload.numberOfSelectQueries,
    percentOfTopQueriesToSearch: requestPayload.percentOfTopQueriesToSearch,
    percentOfTopResultsToScan: requestPayload.percentOfTopResultsToScan
  });
  
  try {
    // Send HTTP PUT request to initiate research conversation
    const response = await researchAPI.put('/live-research-chat/', requestPayload);
    
    logger.info('Research conversation request successful:', response.status);
    
    // Return the saved chat log if available, otherwise empty array
    return response.data || [];
  } catch (error) {
    logger.error('Error sending research conversation request:', error);
    
    let errorMessage = 'Failed to send research request';
    if (error.response) {
      const { status, statusText, data } = error.response;
      errorMessage = `${status} – ${statusText}`;
      logger.error('API error response:', data);
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Get chat log from server
 * @param {string} memoryId - Memory ID for the chat session
 * @returns {Promise<Object>} Object containing chatLog array and totalCosts
 */
export const getChatLog = async (memoryId) => {
  logger.info('Getting chat log for memory ID:', memoryId);
  
  if (!memoryId) {
    throw new Error('Memory ID is required');
  }
  
  try {
    const response = await researchAPI.get(`/live-research-chat/${memoryId}`);
    return response.data;
  } catch (error) {
    logger.error('Error getting chat log:', error);
    
    let errorMessage = 'Failed to get chat log';
    if (error.response) {
      const { status, statusText } = error.response;
      errorMessage = `${status} – ${statusText}`;
      
      // Return empty result for 404 (not found)
      if (status === 404) {
        return { chatLog: [], totalCosts: 0 };
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Establish WebSocket connection
 * @returns {Promise<string>} Promise that resolves with client ID
 */
export const establishWebSocket = () => {
  const wsManager = getWebSocketManager();
  return wsManager.establishWebSocket();
};

/**
 * Add message handler for WebSocket messages
 * @param {string} messageType - Type of message to handle
 * @param {Function} handler - Handler function
 */
export const onMessage = (messageType, handler) => {
  const wsManager = getWebSocketManager();
  wsManager.onMessage(messageType, handler);
};

/**
 * Remove message handler
 * @param {string} messageType - Type of message
 * @param {Function} handler - Handler function to remove
 */
export const offMessage = (messageType, handler) => {
  const wsManager = getWebSocketManager();
  wsManager.offMessage(messageType, handler);
};

/**
 * Add connection status handler
 * @param {Function} handler - Handler function
 */
export const onConnection = (handler) => {
  const wsManager = getWebSocketManager();
  wsManager.onConnection(handler);
};

/**
 * Remove connection status handler
 * @param {Function} handler - Handler function to remove
 */
export const offConnection = (handler) => {
  const wsManager = getWebSocketManager();
  wsManager.offConnection(handler);
};

/**
 * Add error handler
 * @param {Function} handler - Handler function
 */
export const onError = (handler) => {
  const wsManager = getWebSocketManager();
  wsManager.onError(handler);
};

/**
 * Remove error handler
 * @param {Function} handler - Handler function to remove
 */
export const offError = (handler) => {
  const wsManager = getWebSocketManager();
  wsManager.offError(handler);
};

/**
 * Send message through WebSocket
 * @param {Object} message - Message to send
 * @returns {Promise<void>}
 */
export const sendMessage = (message) => {
  const wsManager = getWebSocketManager();
  return wsManager.sendMessage(message);
};

/**
 * Close WebSocket connection
 */
export const closeConnection = () => {
  if (wsManager) {
    wsManager.close();
    wsManager = null;
  }
};

/**
 * Get WebSocket connection status
 * @returns {Object} Connection status
 */
export const getConnectionStatus = () => {
  const wsManager = getWebSocketManager();
  return wsManager.getStatus();
};

// Default export with all methods
export default {
  conversation,
  getChatLog,
  establishWebSocket,
  onMessage,
  offMessage,
  onConnection,
  offConnection,
  onError,
  offError,
  sendMessage,
  closeConnection,
  getConnectionStatus,
};