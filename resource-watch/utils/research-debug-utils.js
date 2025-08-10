/**
 * Research Integration Debug Utilities
 * Helper functions for debugging the research integration
 */

import { logger } from './logs.js';

/**
 * Debug WebSocket connection manually
 */
export const debugWebSocket = (wsUrl = 'ws://localhost:5029/ws') => {
  logger.info('🔍 Testing WebSocket connection to:', wsUrl);
  
  const ws = new WebSocket(wsUrl);
  let clientId = null;
  
  ws.onopen = () => {
    logger.info('✅ WebSocket connected successfully');
  };
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      logger.info('📨 WebSocket message received:', message);
      
      if (message.clientId && !clientId) {
        clientId = message.clientId;
        logger.info('🆔 Client ID assigned:', clientId);
      }
    } catch (error) {
      logger.error('❌ Error parsing WebSocket message:', error);
    }
  };
  
  ws.onclose = (event) => {
    logger.info('🔌 WebSocket closed:', event.code, event.reason);
  };
  
  ws.onerror = (error) => {
    logger.error('❌ WebSocket error:', error);
  };
  
  // Return WebSocket instance for manual testing
  return ws;
};

/**
 * Debug API endpoint manually
 */
export const debugAPIEndpoint = async (apiUrl = 'http://localhost:5029') => {
  logger.info('🔍 Testing API endpoint:', apiUrl);
  
  const testPayload = {
    wsClientId: 'debug-client-id',
    chatLog: [
      {
        sender: 'user',
        message: 'What is renewable energy?',
        timestamp: new Date()
      }
    ],
    numberOfSelectQueries: 2,
    percentOfTopQueriesToSearch: 0.5,
    percentOfTopResultsToScan: 0.5
  };
  
  try {
    const response = await fetch(`${apiUrl}/api/live_research_chat/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    logger.info('📡 API Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      logger.info('✅ API endpoint working, response:', data);
      return { success: true, data };
    } else {
      const errorText = await response.text();
      logger.error('❌ API endpoint error:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    logger.error('❌ API request failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test message parsing logic
 */
export const debugMessageParsing = () => {
  logger.info('🔍 Testing message parsing logic');
  
  const testMessages = [
    { type: 'agentStart', message: 'Starting research' },
    { type: 'agentUpdate', message: 'Processing queries' },
    { type: 'agentCompleted', message: 'Research completed' },
    { type: 'streamResponse', content: 'Partial response content' },
    { type: 'chatResponse', content: 'Final research results' },
    { type: 'error', message: 'Something went wrong' }
  ];
  
  testMessages.forEach(message => {
    let processedMessage = message;
    
    // Apply the same processing logic as in research-api.js
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
    } else if (message.type === 'chatResponse') {
      processedMessage = {
        type: 'chat_response',
        content: message.content,
        data: message.data || message
      };
    }
    
    logger.info('📝 Message transformation:', {
      original: message,
      processed: processedMessage
    });
  });
  
  logger.info('✅ Message parsing test completed');
};

/**
 * Check environment configuration
 */
export const debugEnvironmentConfig = () => {
  logger.info('🔍 Checking environment configuration');
  
  const config = {
    RESEARCH_API_URL: process.env.NEXT_PUBLIC_RESEARCH_API_URL || 'http://localhost:5029',
    RESEARCH_WS_URL: process.env.NEXT_PUBLIC_RESEARCH_WS_URL || 'ws://localhost:5029/ws',
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL
  };
  
  logger.info('⚙️ Current configuration:', config);
  
  // Check for common issues
  const issues = [];
  
  if (!config.RESEARCH_API_URL.startsWith('http')) {
    issues.push('RESEARCH_API_URL should start with http:// or https://');
  }
  
  if (!config.RESEARCH_WS_URL.startsWith('ws')) {
    issues.push('RESEARCH_WS_URL should start with ws:// or wss://');
  }
  
  if (config.RESEARCH_API_URL.includes('localhost') && config.NODE_ENV === 'production') {
    issues.push('Using localhost in production environment');
  }
  
  if (issues.length > 0) {
    logger.warn('⚠️ Configuration issues found:', issues);
  } else {
    logger.info('✅ Configuration looks good');
  }
  
  return { config, issues };
};

/**
 * Test component state simulation
 */
export const debugComponentState = () => {
  logger.info('🔍 Testing component state simulation');
  
  // Simulate the state changes that happen in ResearchChatbot component
  let state = {
    messages: [],
    isConnected: false,
    isLoading: false,
    wsClientId: null,
    connectionError: null
  };
  
  logger.info('📊 Initial state:', state);
  
  // Simulate connection
  state.isConnected = true;
  state.wsClientId = 'test-client-123';
  logger.info('📊 After connection:', state);
  
  // Simulate user message
  state.messages.push({
    id: 1,
    sender: 'user',
    message: 'What is climate change?',
    timestamp: new Date()
  });
  state.isLoading = true;
  logger.info('📊 After user message:', state);
  
  // Simulate research progress
  state.messages.push({
    id: 2,
    sender: 'system',
    message: '🔄 Starting research...',
    timestamp: new Date()
  });
  logger.info('📊 After research start:', state);
  
  // Simulate research completion
  state.messages.push({
    id: 3,
    sender: 'assistant',
    message: 'Climate change refers to long-term shifts in global temperatures...',
    messageType: 'research_result',
    timestamp: new Date()
  });
  state.isLoading = false;
  logger.info('📊 After research completion:', state);
  
  logger.info('✅ Component state simulation completed');
  return state;
};

/**
 * Performance monitoring helper
 */
export const debugPerformance = () => {
  const startTime = performance.now();
  
  return {
    mark: (label) => {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      logger.info(`⏱️ Performance mark [${label}]: ${elapsed.toFixed(2)}ms`);
      return elapsed;
    },
    
    end: () => {
      const totalTime = performance.now() - startTime;
      logger.info(`⏱️ Total execution time: ${totalTime.toFixed(2)}ms`);
      return totalTime;
    }
  };
};

/**
 * Network connectivity test
 */
export const debugNetworkConnectivity = async () => {
  logger.info('🔍 Testing network connectivity');
  
  const tests = [
    {
      name: 'WebApi Server',
      url: 'http://localhost:5029',
      method: 'GET'
    },
    {
      name: 'Resource Watch',
      url: 'http://localhost:3000',
      method: 'GET'
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const response = await fetch(test.url, {
        method: test.method,
        timeout: 5000
      });
      
      results.push({
        name: test.name,
        url: test.url,
        status: response.status,
        success: response.status < 500
      });
      
      logger.info(`✅ ${test.name}: ${response.status}`);
    } catch (error) {
      results.push({
        name: test.name,
        url: test.url,
        error: error.message,
        success: false
      });
      
      logger.error(`❌ ${test.name}: ${error.message}`);
    }
  }
  
  return results;
};

// Export all debug functions
export default {
  debugWebSocket,
  debugAPIEndpoint,
  debugMessageParsing,
  debugEnvironmentConfig,
  debugComponentState,
  debugPerformance,
  debugNetworkConnectivity
};

// Make functions available globally for browser console debugging
if (typeof window !== 'undefined') {
  window.researchDebug = {
    debugWebSocket,
    debugAPIEndpoint,
    debugMessageParsing,
    debugEnvironmentConfig,
    debugComponentState,
    debugPerformance,
    debugNetworkConnectivity
  };
}