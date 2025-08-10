#!/usr/bin/env node

/**
 * Research Integration Test Runner
 * Simple script to run research integration tests
 */

import { runAllTests } from '../test/research-integration-debug.js';
import { logger } from '../utils/logs.js';

async function main() {
  try {
    logger.info('🔬 Research Integration Test Runner');
    logger.info('This script will test the complete research integration workflow');
    logger.info('');
    
    // Check if WebApi server should be started
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
Usage: node scripts/test-research-integration.js [options]

Options:
  --help, -h     Show this help message
  --verbose, -v  Enable verbose logging

Prerequisites:
  1. Start the WebApi server: cd webApi && npm start
  2. Ensure Resource Watch is running: npm run dev

The test will verify:
  ✓ WebApi server availability
  ✓ WebSocket connection
  ✓ Research API endpoints
  ✓ Complete research workflow
  ✓ Environmental query processing
  ✓ Error handling and connection issues
`);
      process.exit(0);
    }
    
    if (args.includes('--verbose') || args.includes('-v')) {
      process.env.LOG_LEVEL = 'debug';
    }
    
    // Run the tests
    const results = await runAllTests();
    
    // Exit with appropriate code
    const allPassed = Object.values(results).every(Boolean);
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    logger.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

main();