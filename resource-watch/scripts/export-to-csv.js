#!/usr/bin/env node

/**
 * Simple CSV export script for Resource Watch datasets
 * 
 * Usage: node scripts/export-to-csv.js
 */

const fs = require('fs').promises;
const path = require('path');

async function exportToCSV() {
  try {
    console.log('📊 Exporting datasets to CSV...\n');
    
    // Load the JSON data
    const jsonPath = path.join(__dirname, '..', 'data', 'all-datasets-simple.json');
    const data = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    const datasets = data.datasets;
    
    console.log(`📂 Loaded ${datasets.length} datasets from JSON file`);
    
    // Create CSV header
    const headers = [
      'ID',
      'Name',
      'Slug',
      'Provider',
      'Published',
      'Layers',
      'Widgets',
      'Metadata',
      'Created At',
      'Updated At'
    ];
    
    // Create CSV rows
    const rows = datasets.map(dataset => [
      dataset.id,
      `"${(dataset.name || '').replace(/"/g, '""')}"`,
      dataset.slug || '',
      dataset.provider || '',
      dataset.published ? 'Yes' : 'No',
      Array.isArray(dataset.layer) ? dataset.layer.length : 0,
      Array.isArray(dataset.widget) ? dataset.widget.length : 0,
      Array.isArray(dataset.metadata) ? dataset.metadata.length : 0,
      dataset.createdAt || '',
      dataset.updatedAt || ''
    ]);
    
    // Combine header and rows
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    // Save to CSV file
    const csvPath = path.join(__dirname, '..', 'data', 'datasets-simple.csv');
    await fs.writeFile(csvPath, csvContent);
    
    console.log(`✅ CSV exported to: ${csvPath}`);
    console.log(`📊 Total datasets: ${datasets.length}`);
    console.log(`📋 Columns: ${headers.length}`);
    
    // Show sample data
    console.log('\n📋 Sample data (first 3 rows):');
    console.log(headers.join(' | '));
    console.log('-'.repeat(100));
    rows.slice(0, 3).forEach(row => {
      console.log(row.join(' | '));
    });
    
    console.log('\n💡 You can now open the CSV file in:');
    console.log('   - Excel / Google Sheets');
    console.log('   - LibreOffice Calc');
    console.log('   - Any text editor');
    console.log('   - Database import tools');
    
  } catch (error) {
    console.error('❌ Error exporting to CSV:', error.message);
    console.log('\n💡 Make sure you have run the fetch script first:');
    console.log('   node scripts/fetch-all-datasets-simple.js');
  }
}

// Run the export
exportToCSV();



