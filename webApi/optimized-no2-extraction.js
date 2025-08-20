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
        { name: 'Bogotá', country: 'Colombia', lat: 4.7110, lng: -74.0721, region: 'Andean' },
        { name: 'Medellín', country: 'Colombia', lat: 6.2442, lng: -75.5812, region: 'Andean' },
        { name: 'Cali', country: 'Colombia', lat: 3.4516, lng: -76.5320, region: 'Pacific' },
        { name: 'Barranquilla', country: 'Colombia', lat: 10.9685, lng: -74.7813, region: 'Caribbean' },
        { name: 'Cartagena', country: 'Colombia', lat: 10.3932, lng: -75.4792, region: 'Caribbean' },
        { name: 'Bucaramanga', country: 'Colombia', lat: 7.1258, lng: -73.1290, region: 'Andean' },
        { name: 'Pereira', country: 'Colombia', lat: 4.8143, lng: -75.6946, region: 'Andean' },
        { name: 'Manizales', country: 'Colombia', lat: 5.0689, lng: -75.5174, region: 'Andean' },
        
        // Other major cities for comparison
        { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332, region: 'North America' },
        { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, region: 'South America' },
        { name: 'Buenos Aires', country: 'Argentina', lat: -34.6118, lng: -58.3960, region: 'South America' },
        { name: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428, region: 'South America' },
        { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693, region: 'South America' },
        { name: 'Caracas', country: 'Venezuela', lat: 10.4806, lng: -66.9036, region: 'South America' },
        { name: 'Quito', country: 'Ecuador', lat: -0.2299, lng: -78.5249, region: 'South America' },
        { name: 'La Paz', country: 'Bolivia', lat: -16.4897, lng: -68.1193, region: 'South America' },
        { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.0060, region: 'North America' },
        { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, region: 'Europe' },
        { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, region: 'Asia' },
        { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, region: 'Europe' },
        { name: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074, region: 'Asia' },
        { name: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6176, region: 'Europe/Asia' },
        { name: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437, region: 'North America' },
        { name: 'Chicago', country: 'United States', lat: 41.8781, lng: -87.6298, region: 'North America' },
        { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777, region: 'Asia' },
        { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, region: 'South America' },
        { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332, region: 'North America' },
        { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357, region: 'Africa' },
        { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, region: 'Asia' },
        { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456, region: 'Asia' },
        { name: 'Delhi', country: 'India', lat: 28.7041, lng: 77.1025, region: 'Asia' },
        { name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737, region: 'Asia' },
        { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784, region: 'Europe/Asia' },
        { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018, region: 'Asia' },
        { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792, region: 'Africa' },
        { name: 'Kinshasa', country: 'Democratic Republic of the Congo', lat: -4.4419, lng: 15.2663, region: 'Africa' }

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


