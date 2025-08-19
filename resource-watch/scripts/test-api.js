#!/usr/bin/env node

/**
 * Test script to check the Resource Watch API response format
 */

const axios = require('axios');

async function testAPI() {
  try {
    console.log('🔍 Testing Resource Watch API...\n');
    
          const response = await axios.get('https://api.resourcewatch.org/v1/dataset', {
        params: {
          env: 'production',
          application: 'rw',
          includes: 'layer,metadata,vocabulary,widget',
          status: 'saved',
          published: true,
          'page[number]': 1,
          'page[size]': 1
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

    console.log('✅ API Response received');
    console.log('Status:', response.status);
    console.log('Total items:', response.data.meta['total-items']);
    console.log('Number of datasets in response:', response.data.data.length);
    
    console.log('\n📋 First dataset structure:');
    const firstDataset = response.data.data[0];
    console.log('ID:', firstDataset.id);
    console.log('Type:', firstDataset.type);
    console.log('Attributes:', Object.keys(firstDataset.attributes || {}));
    console.log('Relationships:', Object.keys(firstDataset.relationships || {}));
    
    console.log('\n🔗 Relationships details:');
    console.log('Layer relationships:', JSON.stringify(firstDataset.relationships?.layer, null, 2));
    console.log('Widget relationships:', JSON.stringify(firstDataset.relationships?.widget, null, 2));
    console.log('Metadata relationships:', JSON.stringify(firstDataset.relationships?.metadata, null, 2));
    console.log('Vocabulary relationships:', JSON.stringify(firstDataset.relationships?.vocabulary, null, 2));
    
    console.log('\n📦 Included resources:');
    console.log('Included types:', response.data.included?.map(item => item.type) || []);
    console.log('Included count:', response.data.included?.length || 0);
    
  } catch (error) {
    console.error('❌ API Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAPI();
