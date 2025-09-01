#!/bin/bash

# Skills First RAG Ingestion Pipeline Script
# This script automatically sets up environment variables and runs the complete RAG ingestion

echo "🚀 Setting up Skills First RAG Ingestion Pipeline..."

# Export AI Model Configuration
export AI_MODEL_API_KEY=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
export AI_MODEL_NAME=gpt-4-turbo
export AI_MODEL_PROVIDER=openai
export AI_MODEL_TYPE=chat
export AI_MODEL_REASONING_EFFORT=medium
export AI_MODEL_MAX_THINKING_TOKENS=4000
export AI_MODEL_MAX_TOKENS_OUT=4096
export AI_MODEL_TEMPERATURE=0.0

# Export Weaviate Configuration
export WEAVIATE_APIKEY=bC80K2dPTEV0N2tkaXdLdV9BYU4wNVJkeFRIelRiSUJoRHlsUGNHWHkzTkNlRjVkSlh1UUJYbFA3ZXBrPV92MjAw

echo "✅ Environment variables configured:"
echo "   - AI Model: $AI_MODEL_NAME ($AI_MODEL_PROVIDER)"
echo "   - Weaviate API Key: Configured"

# Create cache directory if it doesn't exist
echo "📁 Ensuring cache directory exists..."
mkdir -p src/ingestion/cache

# Run the RAG ingestion pipeline directly
echo "🤖 Starting RAG ingestion pipeline..."
node -e "
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
"

# Check if the script completed successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 RAG Ingestion Pipeline completed successfully!"
    echo "📚 Documents have been processed and embedded in the vector store."
    echo "🤖 The RAG chatbot is now ready to answer questions."
else
    echo ""
    echo "❌ RAG Ingestion Pipeline failed. Please check the error messages above."
    exit 1
fi
