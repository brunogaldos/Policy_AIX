#!/usr/bin/env node

// Optimized NO2 data extraction
// Uses the working individual query approach with better batching and error handling

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

async function optimizedNO2Extraction() {
    console.log('Optimized NO2 data extraction...\n');
    
    // Define cities with their coordinates
    const cities = [
        // Colombia
        // Colombia
        
        // Other major cities for comparison
        { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332, region: 'North America' },
        { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, region: 'South America' },
        { name: 'Buenos Aires', country: 'Argentina', lat: -34.6118, lng: -58.3960, region: 'South America' },
        { name: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428, region: 'South America' },
        { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693, region: 'South America' },
        { name: 'Caracas', country: 'Venezuela', lat: 10.4806, lng: -66.9036, region: 'South America' },
        { name: 'Quito', country: 'Ecuador', lat: -0.2299, lng: -78.5249, region: 'South America' },
        { name: 'La Paz', country: 'Bolivia', lat: -16.4897, lng: -68.1193, region: 'South America' },
        
  
    
        
        // Peru - Major Cities
        { name: 'Arequipa', country: 'Peru', lat: -16.3989, lng: -71.5350, region: 'Southern' },
        { name: 'Trujillo', country: 'Peru', lat: -8.1090, lng: -79.0215, region: 'Northern' },
        { name: 'Chiclayo', country: 'Peru', lat: -6.7760, lng: -79.8441, region: 'Northern' },
        { name: 'Piura', country: 'Peru', lat: -5.1945, lng: -80.6328, region: 'Northern' },
        { name: 'Iquitos', country: 'Peru', lat: -3.7491, lng: -73.2538, region: 'Amazon' },
        { name: 'Cusco', country: 'Peru', lat: -13.5167, lng: -71.9789, region: 'Southern' },
        { name: 'Chimbote', country: 'Peru', lat: -9.0745, lng: -78.5936, region: 'Northern' },
        { name: 'Huancayo', country: 'Peru', lat: -12.0670, lng: -75.2096, region: 'Central' },
        { name: 'Tacna', country: 'Peru', lat: -18.0066, lng: -70.2463, region: 'Southern' },
        { name: 'Ica', country: 'Peru', lat: -14.0750, lng: -75.7286, region: 'Central' },
        { name: 'Cajamarca', country: 'Peru', lat: -7.1617, lng: -78.5128, region: 'Northern' },
        { name: 'Pucallpa', country: 'Peru', lat: -8.3833, lng: -74.5333, region: 'Amazon' },
        { name: 'Sullana', country: 'Peru', lat: -4.9039, lng: -80.6853, region: 'Northern' },
        { name: 'Chincha Alta', country: 'Peru', lat: -13.4500, lng: -76.1333, region: 'Central' },
        { name: 'Huaraz', country: 'Peru', lat: -9.5277, lng: -77.5278, region: 'Central' },
        { name: 'Ayacucho', country: 'Peru', lat: -13.1631, lng: -74.2246, region: 'Central' },
        { name: 'Tarapoto', country: 'Peru', lat: -6.4833, lng: -76.3667, region: 'Amazon' },
        { name: 'Moquegua', country: 'Peru', lat: -17.1956, lng: -71.3372, region: 'Southern' },
        { name: 'Puno', country: 'Peru', lat: -15.8402, lng: -70.0219, region: 'Southern' },
        { name: 'Juliaca', country: 'Peru', lat: -15.5000, lng: -70.1333, region: 'Southern' },
        { name: 'Huánuco', country: 'Peru', lat: -9.9281, lng: -76.2427, region: 'Central' },
        { name: 'Tumbes', country: 'Peru', lat: -3.5667, lng: -80.4500, region: 'Northern' },
        { name: 'Puerto Maldonado', country: 'Peru', lat: -12.6000, lng: -69.1833, region: 'Amazon' },
        { name: 'Chachapoyas', country: 'Peru', lat: -6.2167, lng: -77.8500, region: 'Northern' },
        { name: 'Abancay', country: 'Peru', lat: -13.6333, lng: -72.8833, region: 'Central' },
        { name: 'Huancavelica', country: 'Peru', lat: -12.7833, lng: -74.9667, region: 'Central' }
        

        


    ];
    
    const processedData = [];
    const errors = [];
    const startTime = Date.now();
    
    console.log(`Processing ${cities.length} cities in optimized batches...\n`);
    
    // Process cities in batches of 4 to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < cities.length; i += batchSize) {
        const batch = cities.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(cities.length/batchSize)} (${batch.length} cities)...`);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (city) => {
            return processCity(city);
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // Process results
        batchResults.forEach(result => {
            if (result.success) {
                processedData.push(result.data);
                console.log(`   ✅ ${result.city.name}: ${result.data.no2_value.toFixed(7)} mol/m²`);
            } else {
                errors.push({
                    city: result.city.name,
                    country: result.city.country,
                    error: result.error
                });
                console.log(`   ❌ ${result.city.name}: ${result.error}`);
            }
        });
        
        console.log('');
        
        // Wait between batches to be respectful to the API
        if (i + batchSize < cities.length) {
            console.log('Waiting 2 seconds before next batch...\n');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Create summary and save
    const summary = createSummary(processedData);
    const outputs = {
        no2_data: processedData,
        summary: summary,
        errors: errors,
        metadata: {
            generated_at: new Date().toISOString(),
            total_cities: cities.length,
            successful_extractions: processedData.length,
            failed_extractions: errors.length,
            processing_time_seconds: duration,
            batch_size: batchSize,
            data_source: 'Resource Watch TROPOMI NO₂ Dataset',
            processing_script: 'optimized-no2-extraction.js'
        }
    };
    
    // Save the processed data as JSON (for reference)
    const outputDir = './src/ingestion/generated';
    await fs.mkdir(outputDir, { recursive: true });
    
    const jsonOutputPath = path.join(outputDir, 'no2-data.json');
    await fs.writeFile(jsonOutputPath, JSON.stringify(outputs, null, 2));
    
    // Generate simplified text file for RAG ingestion
    const textOutputPath = path.join(outputDir, 'city-data-index.txt');
    const textContent = generateTextOutput(processedData);
    await fs.writeFile(textOutputPath, textContent);
    
    // Generate CSV file for more efficient RAG processing
    const csvOutputPath = path.join(outputDir, 'city-data-index.csv');
    const csvContent = generateCSVOutput(processedData);
    await fs.writeFile(csvOutputPath, csvContent);
    
    console.log('='.repeat(80));
    console.log('OPTIMIZED EXTRACTION COMPLETED!');
    console.log(`   Processing time: ${duration.toFixed(2)} seconds`);
    console.log(`   Successful extractions: ${processedData.length}`);
    console.log(`   Failed extractions: ${errors.length}`);
    console.log(`   JSON output saved to: ${path.join(outputDir, 'no2-data.json')}`);
    console.log(`   Text output saved to: ${textOutputPath}`);
    console.log(`   CSV output saved to: ${csvOutputPath}`);
    console.log('='.repeat(80));
    
    // Display summary
    console.log('\nREGIONAL SUMMARY:');
    Object.entries(summary.regional_averages).forEach(([region, avg]) => {
        console.log(`   ${region}: ${avg.toFixed(7)} mol/m²`);
    });
    
    if (errors.length > 0) {
        console.log('\nERRORS:');
        errors.forEach(error => {
            console.log(`   ${error.city}, ${error.country}: ${error.error}`);
        });
    }
    
    return outputs;
}

async function processCity(city, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Use the exact query format that works
            const query = `select last(tropospheric_NO2_column_number_density) as x from 'projects/resource-watch-gee/cit_035_tropomi_atmospheric_chemistry_model_30day_avg/NO2/cit_035_tropomi_atmospheric_chemistry_model_30day_avg_NO2_2025-08-05' where system:time_start >= 1533448800000 and ST_INTERSECTS(ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Point","coordinates":[${city.lng},${city.lat}]}'),4326),the_geom)`;
            
            const response = await axios.get('https://api.resourcewatch.org/v1/query/b75d8398-34f2-447d-832d-ea570451995a', {
                params: { sql: query },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 40000
            });
            
            if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
                const record = response.data.data[0];
                
                if (record.x !== undefined && record.x !== null) {
                    const no2Value = parseFloat(record.x);
                    
                    const dataEntry = {
                        city: city.name,
                        country: city.country,
                        region: city.region,
                        coordinates: {
                            latitude: city.lat,
                            longitude: city.lng
                        },
                        no2_value: no2Value,
                        unit: 'mol/m²',
                    };
                    
                    return {
                        success: true,
                        city: city,
                        data: dataEntry
                    };
                    
                } else {
                    return {
                        success: false,
                        city: city,
                        error: 'No NO2 value in response'
                    };
                }
            } else {
                return {
                    success: false,
                    city: city,
                    error: 'No data records found'
                };
            }
            
        } catch (error) {
            if (attempt === retries) {
                return {
                    success: false,
                    city: city,
                    error: error.message
                };
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

function createSummary(data) {
    const values = data.map(item => item.no2_value);
    const regions = data.map(item => item.region);
    
    // Regional averages
    const regionalAverages = {};
    const regionGroups = {};
    data.forEach(item => {
        const region = item.region;
        if (!regionGroups[region]) {
            regionGroups[region] = [];
        }
        regionGroups[region].push(item.no2_value);
    });
    
    Object.entries(regionGroups).forEach(([region, values]) => {
        regionalAverages[region] = values.reduce((a, b) => a + b, 0) / values.length;
    });
    
    return {
        total_cities: data.length,
        average_no2: values.reduce((a, b) => a + b, 0) / values.length,
        min_no2: Math.min(...values),
        max_no2: Math.max(...values),
        regional_averages: regionalAverages,
        data_range: {
            min: Math.min(...values),
            max: Math.max(...values),
            range: Math.max(...values) - Math.min(...values)
        }
    };
}

function generateTextOutput(data) {
    let text = '';
    
    // Simple format: just city, country, and essential data
    data.forEach(city => {
        const latDir = city.coordinates.latitude >= 0 ? 'N' : 'S';
        const lngDir = city.coordinates.longitude >= 0 ? 'E' : 'W';
        const latAbs = Math.abs(city.coordinates.latitude);
        const lngAbs = Math.abs(city.coordinates.longitude);
        
        text += `${city.city.toUpperCase()}, ${city.country.toUpperCase()}\n`;
        text += `Location: ${city.region}\n`;
        text += `Coordinates: ${latAbs.toFixed(4)}°${latDir}, ${lngAbs.toFixed(4)}°${lngDir}\n`;
        text += `NO₂ Concentration: ${city.no2_value} mol/m²\n\n`;
    });
    
    return text;
}

function generateCSVOutput(data) {
    let csv = 'City,Country,Region,Latitude,Longitude,NO2 Concentration\n';
    data.forEach(city => {
        const latDir = city.coordinates.latitude >= 0 ? 'N' : 'S';
        const lngDir = city.coordinates.longitude >= 0 ? 'E' : 'W';
        const latAbs = Math.abs(city.coordinates.latitude);
        const lngAbs = Math.abs(city.coordinates.longitude);
        
        csv += `${city.city},${city.country},${city.region},${latAbs.toFixed(4)}${latDir},${lngAbs.toFixed(4)}${lngDir},${city.no2_value}\n`;
    });
    return csv;
}

optimizedNO2Extraction().catch(console.error);


