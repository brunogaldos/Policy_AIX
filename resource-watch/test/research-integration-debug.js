/**
 * Research Integration Debug and Test Script
 * Comprehensive testing of the research integration prototype
 */

import { logger } from '../utils/logs.js';

// Test configuration
const TEST_CONFIG = {
  webApiUrl: process.env.NEXT_PUBLIC_RESEARCH_API_URL || 'http://localhost:5029',
  wsUrl: process.env.NEXT_PUBLIC_RESEARCH_WS_URL || 'ws://localhost:5029/ws',
  testQueries: [
    'What are the main causes of deforestation in the Amazon rainforest?',
    'How does climate change affect ocean acidification?',
    'What are the environmental impacts of renewable energy sources?',
    'How do microplastics affect marine ecosystems?'
  ],
  timeout: 60000, // 60 seconds timeout for research requests
};

/**
 * Test WebApi server availability
 */
async function testWebApiAvailability() {
  logger.info('🔍 Testing WebApi server availability...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.webApiUrl}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      logger.info('✅ WebApi server is available');
      return true;
    } else {
      logger.error(`❌ WebApi server returned status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logger.error('❌ WebApi server is not available:', error.message);
    logger.info('💡 Make sure to start the WebApi server with: cd webApi && npm start');
    return false;
  }
}

/**
 * Test WebSocket connection
 */
async function testWebSocketConnection() {
  logger.info('🔍 Testing WebSocket connection...');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(TEST_CONFIG.wsUrl);
    let clientId = null;
    let connected = false;
    
    const timeout = setTimeout(() => {
      if (!connected) {
        logger.error('❌ WebSocket connection timeout');
        ws.close();
        resolve(false);
      }
    }, 10000);
    
    ws.onopen = () => {
      logger.info('🔗 WebSocket connection opened');
      connected = true;
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        logger.info('📨 WebSocket message received:', message);
        
        if (message.clientId && !clientId) {
          clientId = message.clientId;
          logger.info('✅ WebSocket client ID received:', clientId);
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
      } catch (error) {
        logger.error('❌ Error parsing WebSocket message:', error);
      }
    };
    
    ws.onclose = (event) => {
      logger.info('🔌 WebSocket connection closed:', event.code, event.reason);
      if (!clientId) {
        clearTimeout(timeout);
        resolve(false);
      }
    };
    
    ws.onerror = (error) => {
      logger.error('❌ WebSocket error:', error);
      clearTimeout(timeout);
      resolve(false);
    };
  });
}

/**
 * Test research API endpoint
 */
async function testResearchAPI() {
  logger.info('🔍 Testing research API endpoint...');
  
  try {
    // First establish WebSocket to get client ID
    const clientId = await new Promise((resolve, reject) => {
      const ws = new WebSocket(TEST_CONFIG.wsUrl);
      let id = null;
      
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.clientId && !id) {
            id = message.clientId;
            clearTimeout(timeout);
            ws.close();
            resolve(id);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
    
    logger.info('✅ Got WebSocket client ID for API test:', clientId);
    
    // Test the research API endpoint
    const testPayload = {
      wsClientId: clientId,
      chatLog: [
        {
          sender: 'user',
          message: 'What is renewable energy?',
          timestamp: new Date()
        }
      ],
      numberOfSelectQueries: 3,
      percentOfTopQueriesToSearch: 0.5,
      percentOfTopResultsToScan: 0.5
    };
    
    const response = await fetch(`${TEST_CONFIG.webApiUrl}/api/live_research_chat/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    if (response.ok) {
      const data = await response.json();
      logger.info('✅ Research API endpoint is working');
      logger.info('📊 API response:', data);
      return true;
    } else {
      logger.error(`❌ Research API returned status: ${response.status}`);
      const errorText = await response.text();
      logger.error('Error response:', errorText);
      return false;
    }
    
  } catch (error) {
    logger.error('❌ Research API test failed:', error.message);
    return false;
  }
}

/**
 * Test complete research workflow
 */
async function testCompleteWorkflow() {
  logger.info('🔍 Testing complete research workflow...');
  
  return new Promise(async (resolve) => {
    try {
      // Establish WebSocket connection
      const ws = new WebSocket(TEST_CONFIG.wsUrl);
      let clientId = null;
      let researchCompleted = false;
      let messagesReceived = [];
      
      const timeout = setTimeout(() => {
        if (!researchCompleted) {
          logger.error('❌ Research workflow timeout');
          ws.close();
          resolve(false);
        }
      }, TEST_CONFIG.timeout);
      
      ws.onopen = () => {
        logger.info('🔗 WebSocket connected for workflow test');
      };
      
      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          messagesReceived.push(message);
          logger.info('📨 Workflow message:', message.type || 'unknown', message.message || '');
          
          // Get client ID
          if (message.clientId && !clientId) {
            clientId = message.clientId;
            logger.info('✅ Got client ID for workflow test:', clientId);
            
            // Send research request
            const testQuery = TEST_CONFIG.testQueries[0];
            logger.info('🚀 Sending research request:', testQuery);
            
            const payload = {
              wsClientId: clientId,
              chatLog: [
                {
                  sender: 'user',
                  message: testQuery,
                  timestamp: new Date()
                }
              ],
              numberOfSelectQueries: 3,
              percentOfTopQueriesToSearch: 0.5,
              percentOfTopResultsToScan: 0.5
            };
            
            const response = await fetch(`${TEST_CONFIG.webApiUrl}/api/live_research_chat/`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
              logger.error('❌ Failed to send research request:', response.status);
              clearTimeout(timeout);
              ws.close();
              resolve(false);
            }
          }
          
          // Check for research completion
          if (message.type === 'chatResponse' || message.type === 'streamEnd') {
            logger.info('✅ Research workflow completed successfully!');
            logger.info('📊 Total messages received:', messagesReceived.length);
            researchCompleted = true;
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          }
          
        } catch (error) {
          logger.error('❌ Error processing workflow message:', error);
        }
      };
      
      ws.onclose = () => {
        logger.info('🔌 Workflow WebSocket closed');
        if (!researchCompleted) {
          clearTimeout(timeout);
          resolve(false);
        }
      };
      
      ws.onerror = (error) => {
        logger.error('❌ Workflow WebSocket error:', error);
        clearTimeout(timeout);
        resolve(false);
      };
      
    } catch (error) {
      logger.error('❌ Complete workflow test failed:', error);
      resolve(false);
    }
  });
}

/**
 * Test environmental query processing
 */
async function testEnvironmentalQueries() {
  logger.info('🔍 Testing environmental query processing...');
  
  const results = [];
  
  for (const query of TEST_CONFIG.testQueries) {
    logger.info(`🌍 Testing query: "${query}"`);
    
    try {
      const result = await new Promise((resolve) => {
        const ws = new WebSocket(TEST_CONFIG.wsUrl);
        let clientId = null;
        let queryProcessed = false;
        
        const timeout = setTimeout(() => {
          if (!queryProcessed) {
            logger.warn(`⏰ Query timeout: "${query}"`);
            ws.close();
            resolve(false);
          }
        }, 30000); // 30 second timeout per query
        
        ws.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.clientId && !clientId) {
              clientId = message.clientId;
              
              // Send the environmental query
              const payload = {
                wsClientId: clientId,
                chatLog: [
                  {
                    sender: 'user',
                    message: query,
                    timestamp: new Date()
                  }
                ],
                numberOfSelectQueries: 2,
                percentOfTopQueriesToSearch: 0.5,
                percentOfTopResultsToScan: 0.5
              };
              
              await fetch(`${TEST_CONFIG.webApiUrl}/api/live_research_chat/`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
              });
            }
            
            if (message.type === 'chatResponse' || message.type === 'streamEnd') {
              logger.info(`✅ Environmental query processed: "${query}"`);
              queryProcessed = true;
              clearTimeout(timeout);
              ws.close();
              resolve(true);
            }
            
          } catch (error) {
            logger.error(`❌ Error processing environmental query "${query}":`, error);
            clearTimeout(timeout);
            resolve(false);
          }
        };
        
        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
      
      results.push({ query, success: result });
      
      // Small delay between queries
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      logger.error(`❌ Environmental query test failed for "${query}":`, error);
      results.push({ query, success: false });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  logger.info(`📊 Environmental queries test results: ${successCount}/${results.length} successful`);
  
  return successCount > 0;
}

/**
 * Test connection and communication issues
 */
async function testConnectionIssues() {
  logger.info('🔍 Testing connection and communication issues...');
  
  const tests = [
    {
      name: 'Invalid WebSocket URL',
      test: async () => {
        try {
          const ws = new WebSocket('ws://localhost:9999/invalid');
          return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(true), 2000);
            ws.onerror = () => {
              clearTimeout(timeout);
              resolve(true); // Error is expected
            };
            ws.onopen = () => {
              clearTimeout(timeout);
              resolve(false); // Should not connect
            };
          });
        } catch (error) {
          return true; // Error is expected
        }
      }
    },
    {
      name: 'Invalid API endpoint',
      test: async () => {
        try {
          const response = await fetch(`${TEST_CONFIG.webApiUrl}/api/invalid_endpoint/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          return !response.ok; // Should return error
        } catch (error) {
          return true; // Error is expected
        }
      }
    },
    {
      name: 'Malformed request payload',
      test: async () => {
        try {
          const response = await fetch(`${TEST_CONFIG.webApiUrl}/api/live_research_chat/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invalid: 'payload' })
          });
          return !response.ok; // Should return error
        } catch (error) {
          return true; // Error is expected
        }
      }
    }
  ];
  
  let passedTests = 0;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        logger.info(`✅ ${name}: Handled correctly`);
        passedTests++;
      } else {
        logger.error(`❌ ${name}: Not handled correctly`);
      }
    } catch (error) {
      logger.error(`❌ ${name}: Test failed:`, error);
    }
  }
  
  logger.info(`📊 Connection issue tests: ${passedTests}/${tests.length} passed`);
  return passedTests === tests.length;
}

/**
 * Main test runner
 */
async function runAllTests() {
  logger.info('🚀 Starting Research Integration Debug and Test Suite');
  logger.info('=' .repeat(60));
  
  const testResults = {
    webApiAvailability: false,
    webSocketConnection: false,
    researchAPI: false,
    completeWorkflow: false,
    environmentalQueries: false,
    connectionIssues: false
  };
  
  // Test 1: WebApi server availability
  testResults.webApiAvailability = await testWebApiAvailability();
  
  if (!testResults.webApiAvailability) {
    logger.error('❌ Cannot proceed with tests - WebApi server is not available');
    return testResults;
  }
  
  // Test 2: WebSocket connection
  testResults.webSocketConnection = await testWebSocketConnection();
  
  // Test 3: Research API endpoint
  testResults.researchAPI = await testResearchAPI();
  
  // Test 4: Complete workflow (only if basic tests pass)
  if (testResults.webSocketConnection && testResults.researchAPI) {
    testResults.completeWorkflow = await testCompleteWorkflow();
  }
  
  // Test 5: Environmental queries
  if (testResults.completeWorkflow) {
    testResults.environmentalQueries = await testEnvironmentalQueries();
  }
  
  // Test 6: Connection and communication issues
  testResults.connectionIssues = await testConnectionIssues();
  
  // Summary
  logger.info('=' .repeat(60));
  logger.info('📊 TEST RESULTS SUMMARY:');
  logger.info('=' .repeat(60));
  
  Object.entries(testResults).forEach(([test, result]) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    logger.info(`${status} ${testName}`);
  });
  
  const passedTests = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.keys(testResults).length;
  
  logger.info('=' .repeat(60));
  logger.info(`🎯 OVERALL RESULT: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    logger.info('🎉 All tests passed! Research integration is working correctly.');
  } else {
    logger.error('⚠️ Some tests failed. Please check the issues above.');
  }
  
  return testResults;
}

// Export for use in other modules
export {
  runAllTests,
  testWebApiAvailability,
  testWebSocketConnection,
  testResearchAPI,
  testCompleteWorkflow,
  testEnvironmentalQueries,
  testConnectionIssues,
  TEST_CONFIG
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    logger.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}