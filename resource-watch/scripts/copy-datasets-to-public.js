#!/usr/bin/env node

/**
 * Copy datasets JSON to public folder for browser access
 * This allows the chatbot to load datasets from the browser
 */

const fs = require('fs').promises;
const path = require('path');

async function copyDatasetsToPublic() {
  try {
    console.log('📋 Copying datasets to public folder for browser access...\n');
    
    // Source: our extracted datasets
    const sourcePath = path.join(__dirname, '..', 'data', 'all-datasets-simple.json');
    const targetPath = path.join(__dirname, '..', 'public', 'static', 'datasets.json');
    
    // Read the source file
    const data = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
    
    // Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    await fs.mkdir(targetDir, { recursive: true });
    
    // Write to public folder
    await fs.writeFile(targetPath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Copied ${data.datasets.length} datasets to: ${targetPath}`);
    console.log('🌐 Chatbot can now access datasets from browser!');
    
  } catch (error) {
    console.error('❌ Error copying datasets:', error.message);
    console.log('\n💡 Make sure you have run the fetch script first:');
    console.log('   node scripts/fetch-all-datasets-simple.js');
  }
}

// Run the copy
copyDatasetsToPublic();



