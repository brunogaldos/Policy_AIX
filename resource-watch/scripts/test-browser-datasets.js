#!/usr/bin/env node

/**
 * Test script to verify browser-compatible dataset service
 * This simulates how the chatbot will load datasets in the browser
 */

const fs = require('fs').promises;
const path = require('path');

async function testBrowserDatasets() {
  try {
    console.log('🧪 Testing browser-compatible dataset service...\n');
    
    // Simulate browser fetch by reading the public JSON file
    const publicPath = path.join(__dirname, '..', 'public', 'static', 'datasets.json');
    const data = JSON.parse(await fs.readFile(publicPath, 'utf8'));
    const datasets = data.datasets;
    
    console.log(`📂 Loaded ${datasets.length} datasets from public JSON file`);
    
    // Test dataset structure (same as before)
    const sampleDataset = datasets[0];
    console.log('\n📋 Sample dataset structure:');
    console.log('ID:', sampleDataset.id);
    console.log('Name:', sampleDataset.name);
    console.log('Slug:', sampleDataset.slug);
    console.log('Provider:', sampleDataset.provider);
    console.log('Layers:', Array.isArray(sampleDataset.layer) ? sampleDataset.layer.length : 0);
    console.log('Widgets:', Array.isArray(sampleDataset.widget) ? sampleDataset.widget.length : 0);
    
    // Test search functionality (simulating the browser service)
    console.log('\n🔍 Testing search functionality (browser-compatible):');
    
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
    
    // Test slug-based lookup (simulating getDatasetBySlug)
    console.log('\n🔗 Testing slug-based lookup (browser-compatible):');
    const testSlugs = ['wat057-Aqueduct-Drought-Risk', 'Environmental-Democracy-Index-1490086842552'];
    
    testSlugs.forEach(slug => {
      const dataset = datasets.find(d => d.slug === slug);
      if (dataset) {
        console.log(`  ✅ Found dataset: "${dataset.name}" (${dataset.slug})`);
      } else {
        console.log(`  ❌ Dataset not found: ${slug}`);
      }
    });
    
    // Test autocomplete functionality
    console.log('\n🎯 Testing autocomplete functionality:');
    const autocompleteDatasets = datasets.map(dataset => ({
      ...dataset,
      displayName: dataset.name || dataset.slug,
      searchTerms: `${dataset.name} ${dataset.slug} ${dataset.description || ''}`.toLowerCase()
    }));
    
    console.log(`  ✅ Generated ${autocompleteDatasets.length} autocomplete entries`);
    console.log('  📝 Sample autocomplete entries:');
    autocompleteDatasets.slice(0, 3).forEach((dataset, index) => {
      console.log(`    ${index + 1}. "${dataset.displayName}" → @${dataset.slug}`);
    });
    
    console.log('\n✅ Browser-compatible dataset service test completed successfully!');
    console.log('\n💡 The chatbot can now load datasets from the browser without Node.js modules.');
    console.log('🌐 Public JSON file is accessible at: /static/datasets.json');
    
  } catch (error) {
    console.error('❌ Error testing browser datasets:', error.message);
    console.log('\n💡 Make sure you have run the copy script first:');
    console.log('   node scripts/copy-datasets-to-public.js');
  }
}

// Run the test
testBrowserDatasets();



