#!/usr/bin/env node

// Script to show ingested NO₂ data in human-readable format
import fetch from 'node-fetch';

async function showIngestedData() {
    console.log('🔍 **INGESTED NO₂ DATA OVERVIEW**');
    console.log('='.repeat(60));
    
    try {
        // Get documents from Weaviate
        const response = await fetch('http://localhost:8080/v1/objects?class=RagDocument&limit=10', {
            headers: {
                'Authorization': 'Bearer bC80K2dPTEV0N2tkaXdLdV9BYU4wNVJkeFRIelRiSUJoRHlsUGNHWHkzTkNlRjVkSlh1UUJYbFA3ZXBrPV92MjAw'
            }
        });
        
        const data = await response.json();
        
        console.log(`📊 Found ${data.objects.length} documents in Weaviate\n`);
        
        data.objects.forEach((doc, index) => {
            console.log(`📄 **Document ${index + 1}:**`);
            console.log(`   Title: ${doc.properties.title}`);
            console.log(`   URL: ${doc.properties.url}`);
            console.log(`   Description: ${doc.properties.shortDescription}`);
            console.log(`   Date: ${doc.properties.date}`);
            console.log(`   Size: ${doc.properties.size} bytes`);
            console.log('');
        });
        
        // Get chunks from Weaviate
        console.log('🔍 **NO₂ DATA CHUNKS:**');
        console.log('='.repeat(60));
        
        const chunksResponse = await fetch('http://localhost:8080/v1/objects?class=RagDocumentChunk&limit=10', {
            headers: {
                'Authorization': 'Bearer bC80K2dPTEV0N2tkaXdLdV9BYU4wNVJkeFRIelRiSUJoRHlsUGNHWHkzTkNlRjVkSlh1UUJYbFA3ZXBrPV92MjAw'
            }
        });
        
        const chunksData = await chunksResponse.json();
        
        console.log(`📊 Found ${chunksData.objects.length} chunks in Weaviate\n`);
        
        chunksData.objects.forEach((chunk, index) => {
            console.log(`📝 **Chunk ${index + 1}:**`);
            console.log(`   Title: ${chunk.properties.title}`);
            console.log(`   Summary: ${chunk.properties.shortSummary}`);
            console.log(`   Full Summary: ${chunk.properties.fullSummary}`);
            console.log(`   Compressed Content: ${chunk.properties.compressedContent}`);
            console.log(`   Uncompressed Content: ${chunk.properties.uncompressedContent}`);
            console.log(`   Meta Data: ${JSON.stringify(chunk.properties.metaData, null, 2)}`);
            console.log(`   Relevance Rating: ${chunk.properties.relevanceEloRating}`);
            console.log(`   Substance Rating: ${chunk.properties.substanceEloRating}`);
            console.log(`   Quality Rating: ${chunk.properties.qualityEloRating}`);
            console.log('');
        });
        
        console.log('🎯 **KEY NO₂ DATA POINTS:**');
        console.log('='.repeat(60));
        console.log('✅ Global tropospheric NO₂ data from Copernicus Sentinel project');
        console.log('✅ 30-day average measurements (July 4 - August 3, 2025)');
        console.log('✅ Measurement units: mol/m² (millionths of a mole per square meter)');
        console.log('✅ Color-coded legend with 5 concentration levels:');
        console.log('   • ≤5 mol/m² (Very Low) - Color: #000003');
        console.log('   • 10 mol/m² (Low) - Color: #550F6D');
        console.log('   • 30 mol/m² (Moderate) - Color: #BA3655');
        console.log('   • 100 mol/m² (High) - Color: #F98C09');
        console.log('   • ≥300 mol/m² (Very High) - Color: #FCFEA4');
        console.log('✅ Interactive API endpoints for querying specific coordinates');
        console.log('✅ Multiple visualization widgets with different zoom levels');
        console.log('✅ Real-time data querying capabilities');
        
        console.log('\n⚠️  **NOTE:** This is global satellite data, not country-specific data.');
        console.log('   The chatbot should explain what data is available and how to query it.');
        
    } catch (error) {
        console.error('❌ Error fetching data:', error.message);
    }
}

showIngestedData();
