#!/usr/bin/env node

// Example script to run the complete Skills First RAG ingestion pipeline
// This will download, process, and embed all documents from the dataLayout.json

import { SkillsFirstIngestionProcessor } from './src/ingestion/agentProcessor.js';

async function main() {
    try {
        console.log('🚀 Starting Skills First RAG ingestion pipeline...');
        
        const processor = new SkillsFirstIngestionProcessor();
        await processor.processDataLayout();
        
        console.log('✅ RAG ingestion completed successfully!');
        console.log('📚 Documents have been processed and embedded in the vector store.');
        console.log('🤖 The RAG chatbot is now ready to answer questions.');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to run RAG ingestion:', error);
        process.exit(1);
    }
}

main();
