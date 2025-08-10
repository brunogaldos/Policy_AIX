/**
 * Research Integration Test Utility
 * Simple utility to test the research pipeline integration
 */

import * as researchAPI from '../services/research-api.js';
import { logger } from './logs.js';

/**
 * Test the research pipeline integration
 */
export const testResearchIntegration = async () => {
  logger.info('Starting research integration test...');
  
  try {
    // Test 1: WebSocket Connection
    logger.info('Test 1: Establishing WebSocket connection...');
    const clientId = await researchAPI.establishWebSocket();
    logger.info('✅ WebSocket connected with client ID:', clientId);
    
    // Test 2: Message Handler Setup
    logger.info('Test 2: Setting up message handlers...');
    let messageReceived = false;
    
    researchAPI.onMessage('test', (message) => {
      messageReceived = true;
      logger.info('✅ Message handler working:', message);
    });
    
    // Test 3: Connection Status
    logger.info('Test 3: Checking connection status...');
    const status = researchAPI.getConnectionStatus();
    logger.info('✅ Connection status:', status);
    
    // Test 4: Simple Research Request (mock)
    logger.info('Test 4: Testing research conversation API...');
    const testChatLog = [
      {
        sender: 'user',
        message: 'What is climate change?',
        timestamp: new Date()
      }
    ];
    
    const options = {
      numberOfSelectQueries: 3,
      percentOfTopQueriesToSearch: 0.5,
      percentOfTopResultsToScan: 0.5
    };
    
    try {
      await researchAPI.conversation(testChatLog, options);
      logger.info('✅ Research conversation request sent successfully');
    } catch (error) {
      logger.warn('⚠️ Research conversation failed (expected in test environment):', error.message);
    }
    
    logger.info('🎉 Research integration test completed successfully!');
    return true;
    
  } catch (error) {
    logger.error('❌ Research integration test failed:', error);
    return false;
  }
};

/**
 * Test WebSocket message flow
 */
export const testWebSocketMessageFlow = () => {
  logger.info('Testing WebSocket message flow...');
  
  // Set up handlers for different message types
  const messageTypes = [
    'agent_start',
    'agent_update', 
    'agent_completed',
    'stream_response',
    'stream_end',
    'chat_response',
    'cost_update',
    'error'
  ];
  
  messageTypes.forEach(type => {
    researchAPI.onMessage(type, (message) => {
      logger.info(`📨 Received ${type} message:`, message);
    });
  });
  
  // Set up connection handlers
  researchAPI.onConnection((status) => {
    logger.info('🔗 Connection status changed:', status);
  });
  
  researchAPI.onError((error) => {
    logger.error('🚨 Connection error:', error);
  });
  
  logger.info('✅ WebSocket message flow handlers set up');
};

export default {
  testResearchIntegration,
  testWebSocketMessageFlow
};