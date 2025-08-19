#!/usr/bin/env node

/**
 * Simple script to fetch all datasets from Resource Watch API
 * This version directly handles the JSON:API format without the serializer
 * 
 * Usage: node scripts/fetch-all-datasets-simple.js
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const API_BASE_URL = 'https://api.resourcewatch.org';

class SimpleDatasetFetcher {
  constructor() {
    this.datasets = [];
    this.totalDatasets = 0;
    this.currentPage = 1;
    this.pageSize = 100;
    this.hasMorePages = true;
  }

  /**
   * Fetch datasets from the Resource Watch API
   */
  async fetchDatasets(page = 1) {
    const params = {
      env: 'production',
      application: 'rw',
      includes: 'layer,metadata,vocabulary,widget',
      status: 'saved',
      published: true,
      'page[number]': page,
      'page[size]': this.pageSize
    };

    try {
      console.log(`📡 Fetching page ${page}...`);
      
      const response = await axios.get(`${API_BASE_URL}/v1/dataset`, {
        params,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const { data, meta, included } = response.data;
      
      if (page === 1) {
        this.totalDatasets = meta['total-items'] || 0;
        console.log(`📊 Total datasets available: ${this.totalDatasets}`);
      }

      // Create a map of included resources for quick lookup
      const includedMap = {};
      if (included) {
        included.forEach(item => {
          includedMap[`${item.type}-${item.id}`] = item;
        });
      }

      // Transform JSON:API format to simple objects
      const transformedDatasets = data.map(dataset => {
        const attributes = dataset.attributes || {};
        const relationships = dataset.relationships || {};
        
        // The relationships are embedded in attributes, not as separate relationship objects
        const layers = Array.isArray(attributes.layer) ? attributes.layer : [];
        const widgets = Array.isArray(attributes.widget) ? attributes.widget : [];
        const metadata = Array.isArray(attributes.metadata) ? attributes.metadata : [];
        const vocabulary = Array.isArray(attributes.vocabulary) ? attributes.vocabulary : [];
        
        return {
          id: dataset.id,
          type: dataset.type,
          name: attributes.name || 'No name',
          slug: attributes.slug || 'No slug',
          description: attributes.description || 'No description',
          provider: attributes.provider || 'Unknown',
          dataLastUpdated: attributes['data-last-updated'],
          createdAt: attributes['created-at'],
          updatedAt: attributes['updated-at'],
          published: attributes.published,
          status: attributes.status,
          // Include the embedded related resources
          layer: layers,
          widget: widgets,
          metadata: metadata,
          vocabulary: vocabulary
        };
      });

      return {
        datasets: transformedDatasets,
        meta,
        hasMore: page * this.pageSize < this.totalDatasets
      };
    } catch (error) {
      console.error(`❌ Error fetching page ${page}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Fetch all datasets by paginating through all pages
   */
  async fetchAllDatasets() {
    console.log('🚀 Starting to fetch all datasets...\n');
    
    this.datasets = [];
    this.currentPage = 1;
    this.hasMorePages = true;

    while (this.hasMorePages) {
      try {
        const result = await this.fetchDatasets(this.currentPage);
        
        // Add datasets to our collection
        this.datasets.push(...result.datasets);
        
        console.log(`✅ Page ${this.currentPage}: ${result.datasets.length} datasets fetched`);
        console.log(`📈 Progress: ${this.datasets.length}/${this.totalDatasets} (${Math.round((this.datasets.length / this.totalDatasets) * 100)}%)\n`);
        
        this.hasMorePages = result.hasMore;
        this.currentPage++;
        
        // Add a small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Failed to fetch page ${this.currentPage}`);
        break;
      }
    }

    console.log(`🎉 Fetching complete! Total datasets: ${this.datasets.length}`);
    return this.datasets;
  }

  /**
   * Display datasets in a formatted table
   */
  displayDatasets(datasets = this.datasets) {
    console.log('\n' + '='.repeat(120));
    console.log('📋 DATASET LIST');
    console.log('='.repeat(120));
    
    if (datasets.length === 0) {
      console.log('No datasets found.');
      return;
    }

    datasets.forEach((dataset, index) => {
      const number = (index + 1).toString().padStart(3, ' ');
      const name = (dataset.name || 'No name').substring(0, 50).padEnd(50, ' ');
      const slug = (dataset.slug || 'No slug').padEnd(25, ' ');
      const source = (dataset.provider || 'Unknown').substring(0, 20).padEnd(20, ' ');
      const layers = Array.isArray(dataset.layer) ? dataset.layer.length : 0;
      const widgets = Array.isArray(dataset.widget) ? dataset.widget.length : 0;
      
      console.log(`${number} | ${name} | ${slug} | ${source} | Layers: ${layers} | Widgets: ${widgets}`);
      
      // Show additional details for first few datasets
      if (index < 5) {
        console.log(`     Description: ${(dataset.description || 'No description').substring(0, 80)}...`);
        console.log(`     ID: ${dataset.id} | Type: ${dataset.type} | Published: ${dataset.published}`);
        console.log('');
      }
    });
  }

  /**
   * Save datasets to JSON file
   */
  async saveToFile(filename = 'all-datasets-simple.json') {
    const outputPath = path.join(__dirname, '..', 'data', filename);
    
    // Ensure data directory exists
    const dataDir = path.dirname(outputPath);
    await fs.mkdir(dataDir, { recursive: true });
    
    const output = {
      metadata: {
        totalDatasets: this.datasets.length,
        fetchedAt: new Date().toISOString(),
        apiUrl: API_BASE_URL,
        environment: 'production'
      },
      datasets: this.datasets
    };
    
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(`💾 Datasets saved to: ${outputPath}`);
  }

  /**
   * Save datasets to CSV file
   */
  async saveToCSV(filename = 'all-datasets-simple.csv') {
    const outputPath = path.join(__dirname, '..', 'data', filename);
    
    // Ensure data directory exists
    const dataDir = path.dirname(outputPath);
    await fs.mkdir(dataDir, { recursive: true });
    
    // Create CSV header
    const headers = [
      'ID',
      'Name',
      'Slug',
      'Description',
      'Provider',
      'Published',
      'Status',
      'Layers Count',
      'Widgets Count',
      'Metadata Count',
      'Created At',
      'Updated At',
      'Data Last Updated'
    ];
    
    // Create CSV rows
    const rows = this.datasets.map(dataset => [
      dataset.id,
      `"${(dataset.name || '').replace(/"/g, '""')}"`,
      dataset.slug || '',
      `"${(dataset.description || '').replace(/"/g, '""')}"`,
      dataset.provider || '',
      dataset.published ? 'Yes' : 'No',
      dataset.status || '',
      Array.isArray(dataset.layer) ? dataset.layer.length : 0,
      Array.isArray(dataset.widget) ? dataset.widget.length : 0,
      Array.isArray(dataset.metadata) ? dataset.metadata.length : 0,
      dataset.createdAt || '',
      dataset.updatedAt || '',
      dataset.dataLastUpdated || ''
    ]);
    
    // Combine header and rows
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    await fs.writeFile(outputPath, csvContent);
    console.log(`📊 CSV saved to: ${outputPath}`);
  }

  /**
   * Generate a summary report
   */
  generateSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DATASET SUMMARY');
    console.log('='.repeat(60));
    
    const summary = {
      total: this.datasets.length,
      withLayers: this.datasets.filter(d => Array.isArray(d.layer) && d.layer.length > 0).length,
      withWidgets: this.datasets.filter(d => Array.isArray(d.widget) && d.widget.length > 0).length,
      withMetadata: this.datasets.filter(d => Array.isArray(d.metadata) && d.metadata.length > 0).length,
      published: this.datasets.filter(d => d.published).length,
      providers: {}
    };

    // Count providers
    this.datasets.forEach(dataset => {
      const provider = dataset.provider || 'Unknown';
      summary.providers[provider] = (summary.providers[provider] || 0) + 1;
    });

    console.log(`Total Datasets: ${summary.total}`);
    console.log(`Published Datasets: ${summary.published}`);
    console.log(`Datasets with Layers: ${summary.withLayers}`);
    console.log(`Datasets with Widgets: ${summary.withWidgets}`);
    console.log(`Datasets with Metadata: ${summary.withMetadata}`);
    
    console.log('\nTop Providers:');
    Object.entries(summary.providers)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([provider, count]) => {
        console.log(`  ${provider}: ${count} datasets`);
      });
  }

  /**
   * Search datasets by name or description
   */
  searchDatasets(query) {
    const searchTerm = query.toLowerCase();
    const results = this.datasets.filter(dataset => {
      const name = (dataset.name || '').toLowerCase();
      const description = (dataset.description || '').toLowerCase();
      const slug = (dataset.slug || '').toLowerCase();
      
      return name.includes(searchTerm) || 
             description.includes(searchTerm) || 
             slug.includes(searchTerm);
    });
    
    console.log(`\n🔍 Search results for "${query}": ${results.length} datasets found`);
    this.displayDatasets(results);
    return results;
  }
}

/**
 * Main execution function
 */
async function main() {
  const fetcher = new SimpleDatasetFetcher();
  
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
      case 'search':
        if (!args[1]) {
          console.error('❌ Please provide a search term: node fetch-all-datasets-simple.js search "climate"');
          process.exit(1);
        }
        
        // Load existing data if available
        try {
          const dataPath = path.join(__dirname, '..', 'data', 'all-datasets-simple.json');
          const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
          fetcher.datasets = data.datasets;
          fetcher.totalDatasets = data.datasets.length;
          console.log(`📂 Loaded ${fetcher.datasets.length} datasets from cache`);
        } catch (error) {
          console.log('📂 No cached data found, fetching all datasets first...');
          await fetcher.fetchAllDatasets();
          await fetcher.saveToFile();
        }
        
        fetcher.searchDatasets(args[1]);
        break;
        
      case 'summary':
        // Load existing data and show summary
        try {
          const dataPath = path.join(__dirname, '..', 'data', 'all-datasets-simple.json');
          const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
          fetcher.datasets = data.datasets;
          fetcher.totalDatasets = data.datasets.length;
          console.log(`📂 Loaded ${fetcher.datasets.length} datasets from cache`);
        } catch (error) {
          console.log('📂 No cached data found, fetching all datasets first...');
          await fetcher.fetchAllDatasets();
          await fetcher.saveToFile();
        }
        
        fetcher.generateSummary();
        break;
        
      case 'csv':
        // Load existing data and export to CSV
        try {
          const dataPath = path.join(__dirname, '..', 'data', 'all-datasets-simple.json');
          const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
          fetcher.datasets = data.datasets;
          fetcher.totalDatasets = data.datasets.length;
          console.log(`📂 Loaded ${fetcher.datasets.length} datasets from cache`);
        } catch (error) {
          console.log('📂 No cached data found, fetching all datasets first...');
          await fetcher.fetchAllDatasets();
          await fetcher.saveToFile();
        }
        
        await fetcher.saveToCSV();
        console.log('✅ CSV export complete!');
        break;
        
      default:
        // Default: fetch all datasets
        await fetcher.fetchAllDatasets();
        await fetcher.saveToFile();
        await fetcher.saveToCSV();
        fetcher.displayDatasets();
        fetcher.generateSummary();
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = SimpleDatasetFetcher;
