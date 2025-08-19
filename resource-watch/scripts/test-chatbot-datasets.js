#!/usr/bin/env node

/**
 * Test script to verify chatbot dataset loading
 * This tests the local dataset service that the chatbot now uses
 */

const fs = require('fs').promises;
const path = require('path');

async function testChatbotDatasets() {
  try {
    console.log('🧪 Testing chatbot dataset loading...\n');
    
    // Load the JSON data
    const jsonPath = path.join(__dirname, '..', 'data', 'all-datasets-simple.json');
    const data = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    const datasets = data.datasets;
    
    console.log(`📂 Loaded ${datasets.length} datasets from local JSON file`);
    
    // Test dataset structure
    const sampleDataset = datasets[0];
    console.log('\n📋 Sample dataset structure:');
    console.log('ID:', sampleDataset.id);
    console.log('Name:', sampleDataset.name);
    console.log('Slug:', sampleDataset.slug);
    console.log('Provider:', sampleDataset.provider);
    console.log('Layers:', Array.isArray(sampleDataset.layer) ? sampleDataset.layer.length : 0);
    console.log('Widgets:', Array.isArray(sampleDataset.widget) ? sampleDataset.widget.length : 0);
    
    // Test search functionality
    console.log('\n🔍 Testing search functionality:');
    
    const searchTests = ['climate', 'water', 'forest', 'population'];
    
    searchTests.forEach(searchTerm => {
      const results = datasets.filter(dataset => {
        const name = (dataset.name || '').toLowerCase();
        const slug = (dataset.slug || '').toLowerCase();
        const description = (dataset.description || '').toLowerCase();
        
        return name.includes(searchTerm) || 
               slug.includes(searchTerm) || 
               description.includes(searchTerm);
      });
      
      console.log(`  "${searchTerm}": ${results.length} datasets found`);
      if (results.length > 0) {
        console.log(`    Examples: ${results.slice(0, 3).map(d => d.name).join(', ')}`);
      }
    });
    
    // Test slug-based lookup
    console.log('\n🔗 Testing slug-based lookup:');
    const testSlugs = ['wat057-Aqueduct-Drought-Risk', 'Environmental-Democracy-Index-1490086842552'];
    
    testSlugs.forEach(slug => {
      const dataset = datasets.find(d => d.slug === slug);
      if (dataset) {
        console.log(`  ✅ Found dataset: "${dataset.name}" (${dataset.slug})`);
      } else {
        console.log(`  ❌ Dataset not found: ${slug}`);
      }
    });
    
    // Show dataset name examples
    console.log('\n📝 Dataset name examples (first 10):');
    datasets.slice(0, 10).forEach((dataset, index) => {
      console.log(`  ${index + 1}. "${dataset.name}" → @${dataset.slug}`);
    });
    
    console.log('\n✅ Chatbot dataset loading test completed successfully!');
    console.log('\n💡 The chatbot will now use these dataset names and slugs for @ mentions.');
    
  } catch (error) {
    console.error('❌ Error testing chatbot datasets:', error.message);
    console.log('\n💡 Make sure you have run the fetch script first:');
    console.log('   node scripts/fetch-all-datasets-simple.js');
  }
}

// Run the test
testChatbotDatasets();



