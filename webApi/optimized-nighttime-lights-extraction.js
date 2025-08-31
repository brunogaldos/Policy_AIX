#!/usr/bin/env node

// Optimized Nighttime Lights data extraction
// Uses the working individual query approach with better batching and error handling

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

async function optimizedNighttimeLightsExtraction() {
    console.log('Optimized Nighttime Lights data extraction...\n');
    
    // Define districts with their coordinates - Focus on Arequipa Region
    const districts = [
        // Arequipa Province - Capital and Districts
        { country: 'Peru', lat: -16.42, lng: -71.53, district: 'Arequipa', province: 'Arequipa' },
        { country: 'Peru', lat: -16.7252, lng: -71.8605, district: 'La Joya', province: 'Arequipa' },
        { country: 'Peru', lat: -16.3632, lng: -71.5480, district: 'Alto Selva Alegre', province: 'Arequipa' },
        { country: 'Peru', lat: -16.3702, lng: -71.5273, district: 'Cerro Colorado', province: 'Arequipa' },
        { country: 'Peru', lat: -16.3989, lng: -71.5350, district: 'Paucarpata', province: 'Arequipa' },
        { country: 'Peru', lat: -16.3985, lng: -71.5380, district: 'Yanahuara', province: 'Arequipa' },
        { country: 'Peru', lat: -16.3950, lng: -71.5300, district: 'Cayma', province: 'Arequipa' },
        { country: 'Peru', lat: -16.4020, lng: -71.5400, district: 'Miraflores', province: 'Arequipa' },
        { country: 'Peru', lat: -16.4050, lng: -71.5450, district: 'Sachaca', province: 'Arequipa' },
        { country: 'Peru', lat: -16.4000, lng: -71.5320, district: 'JL Bustamante', province: 'Arequipa' },
        
        // Camaná Province
        { country: 'Peru', lat: -16.62, lng: -72.72, district: 'Camaná', province: 'Camaná' },
        { country: 'Peru', lat: -16.7, lng: -72.9, district: 'Ocoña', province: 'Camaná' },
        
        // Caravelí Province
        { country: 'Peru', lat: -15.9, lng: -74.23, district: 'Caravelí', province: 'Caravelí' },
        { country: 'Peru', lat: -16.5, lng: -74.5, district: 'Chala', province: 'Caravelí' },
        
        // Castilla Province
        { country: 'Peru', lat: -15.77, lng: -72.65, district: 'Aplao', province: 'Castilla' },
        
        // Caylloma Province
        { country: 'Peru', lat: -15.63, lng: -71.58, district: 'Chivay', province: 'Caylloma' },
        { country: 'Peru', lat: -16.2396, lng: -72.2364, district: 'Majes', province: 'Caylloma' },
        
        // Condesuyos Province
        { country: 'Peru', lat: -15.73, lng: -72.93, district: 'Chuquibamba', province: 'Condesuyos' },
        
        // Islay Province
        { country: 'Peru', lat: -17.02, lng: -72.02, district: 'Mollendo', province: 'Islay' },
        
        // La Unión Province
        { country: 'Peru', lat: -15.5, lng: -72.7, district: 'Cotahuasi', province: 'La Unión' }
    ];
    
    const processedData = [];
    const errors = [];
    const startTime = Date.now();
    
    console.log(`Processing ${districts.length} districts in optimized batches...\n`);
    
    // Process districts in batches of 5 to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < districts.length; i += batchSize) {
        const batch = districts.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(districts.length/batchSize)} (${batch.length} districts)...`);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (district) => {
            return processCity(district);
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // Process results
        batchResults.forEach(result => {
            if (result.success) {
                processedData.push(result.data);
                console.log(`   ✅ ${result.city.district}: ${result.data.nighttime_lights_value.toFixed(7)} nW/cm²/sr`);
            } else {
                errors.push({
                    district: result.city.district,
                    country: result.city.country,
                    error: result.error
                });
                console.log(`   ❌ ${result.city.district}: ${result.error}`);
            }
        });
        
        console.log('');
        
        // Wait between batches to be respectful to the API
        if (i + batchSize < districts.length) {
            console.log('Waiting 2 seconds before next batch...\n');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Create summary and save
    const summary = createSummary(processedData);
    const outputs = {
        nighttime_lights_data: processedData,
        summary: summary,
        errors: errors,
        metadata: {
            generated_at: new Date().toISOString(),
            total_districts: districts.length,
            successful_extractions: processedData.length,
            failed_extractions: errors.length,
            processing_time_seconds: duration,
            batch_size: batchSize,
            data_source: 'Resource Watch NOAA/DMSP-OLS Nighttime Lights (Annual, Stable Lights) Dataset',
            processing_script: 'optimized-nighttime-lights-extraction.js'
        }
    };
    
    // Generate CSV file for more efficient RAG processing
    const outputDir = './src/ingestion/generated';
    await fs.mkdir(outputDir, { recursive: true });
    
    const csvOutputPath = path.join(outputDir, 'nighttime-lights-district-data-index.csv');
    const csvContent = generateCSVOutput(processedData);
    await fs.writeFile(csvOutputPath, csvContent);
    
    console.log('='.repeat(80));
    console.log('OPTIMIZED NIGHTTIME LIGHTS EXTRACTION COMPLETED!');
    console.log(`   Processing time: ${duration.toFixed(2)} seconds`);
    console.log(`   Successful extractions: ${processedData.length}`);
    console.log(`   Failed extractions: ${errors.length}`);
    console.log(`   CSV output saved to: ${csvOutputPath}`);
    console.log('='.repeat(80));
    
    // Display summary
    console.log('\nPROVINCIAL SUMMARY:');
    Object.entries(summary.provincial_averages).forEach(([province, avg]) => {
        console.log(`   ${province}: ${avg.toFixed(7)} nW/cm²/sr`);
    });
    
    if (errors.length > 0) {
        console.log('\nERRORS:');
        errors.forEach(error => {
            console.log(`   ${error.district}, ${error.country}: ${error.error}`);
        });
    }
    
    return outputs;
}

// Helper function to find numeric values in complex objects
function findNumericValue(obj) {
    if (obj === null || obj === undefined) return null;
    
    // If it's already a number, return it
    if (typeof obj === 'number' && !isNaN(obj)) return obj;
    
    // If it's a string that can be parsed as a number, return it
    if (typeof obj === 'string') {
        const parsed = parseFloat(obj);
        if (!isNaN(parsed)) return parsed;
    }
    
    // If it's an object, look for common numeric properties
    if (typeof obj === 'object') {
        // Check for common property names that might contain numeric values
        const numericProps = ['mean', 'avg', 'average', 'value', 'val', 'data', 'result', 'count', 'sum', 'min', 'max'];
        
        for (const prop of numericProps) {
            if (obj[prop] !== undefined && obj[prop] !== null) {
                const value = parseFloat(obj[prop]);
                if (!isNaN(value)) return value;
            }
        }
        
        // If no common properties found, try to find any numeric value in the object
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (typeof value === 'number' && !isNaN(value)) return value;
                if (typeof value === 'string') {
                    const parsed = parseFloat(value);
                    if (!isNaN(parsed)) return parsed;
                }
            }
        }
    }
    
    return null;
}

async function processCity(city, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Use the working query from Resource Watch - this dataset DOES support PostGIS queries
            // The working query uses st_summarystats(rast, '2', false) to get raster statistics
            const query = `select st_summarystats(rast, '2', false) as x from 'NOAA/DMSP-OLS/NIGHTTIME_LIGHTS/F182013' where ST_INTERSECTS(ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Point","coordinates":[${city.lng},${city.lat}]}'),4326),the_geom)`;
            
            console.log(`🔍 Query for ${city.district}: ${query}`);
            
            // Use the Nighttime Lights dataset endpoint
            const response = await axios.get('https://api.resourcewatch.org/v1/query/65c0e15b-dad0-4681-934e-91c0a378d2fb', {
                params: { sql: query },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 40000
            });
            
            if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
                // Debug: Log the response structure for the first district
                if (city.district === 'Arequipa') {
                    console.log(`🔍 Response structure for ${city.district}:`, JSON.stringify(response.data.data[0], null, 2));
                    console.log(`🔍 Total records received:`, response.data.data.length);
                }
                
                // The st_summarystats function returns an object with statistics
                // We need to extract the 'mean' value from the raster statistics
                const record = response.data.data[0];
                
                // Look for the st_summarystats result in record.x
                let nighttimeLightsValue = null;
                
                if (record.x && typeof record.x === 'object') {
                    // record.x contains multiple st_summarystats result objects
                    const stats = record.x;
                    
                    // The stable_lights field contains the main nighttime lights data
                    // Use the mean value from stable_lights as it represents the average light intensity
                    if (stats.stable_lights && stats.stable_lights.mean !== undefined && !isNaN(stats.stable_lights.mean)) {
                        nighttimeLightsValue = parseFloat(stats.stable_lights.mean);
                        console.log(`🔍 Found stable_lights.mean: ${nighttimeLightsValue}`);
                    } else if (stats.avg_lights_x_pct && stats.avg_lights_x_pct.mean !== undefined && !isNaN(stats.avg_lights_x_pct.mean)) {
                        // Fallback to avg_lights_x_pct if stable_lights not available
                        nighttimeLightsValue = parseFloat(stats.avg_lights_x_pct.mean);
                        console.log(`🔍 Found avg_lights_x_pct.mean: ${nighttimeLightsValue}`);
                    } else if (stats.avg_vis && stats.avg_vis.mean !== undefined && !isNaN(stats.avg_vis.mean)) {
                        // Fallback to avg_vis if others not available
                        nighttimeLightsValue = parseFloat(stats.avg_vis.mean);
                        console.log(`🔍 Found avg_vis.mean: ${nighttimeLightsValue}`);
                    } else {
                        // Try to find any mean value in any of the stats objects
                        for (const key in stats) {
                            const statObj = stats[key];
                            if (statObj && typeof statObj === 'object' && statObj.mean !== undefined && !isNaN(statObj.mean)) {
                                nighttimeLightsValue = parseFloat(statObj.mean);
                                console.log(`🔍 Found ${key}.mean: ${nighttimeLightsValue}`);
                                break;
                            }
                        }
                    }
                    
                    // If still no value found, use the findNumericValue helper
                    if (nighttimeLightsValue === null) {
                        nighttimeLightsValue = findNumericValue(stats);
                    }
                } else {
                    // Fallback: try to find any numeric value in the record
                    nighttimeLightsValue = findNumericValue(record);
                }
                
                // Check if we got a valid number
                if (nighttimeLightsValue === null || isNaN(nighttimeLightsValue)) {
                    return {
                        success: false,
                        city: city,
                        error: `Could not extract numeric value from st_summarystats response. Record: ${JSON.stringify(record)}`
                    };
                }
                
                const dataEntry = {
                    country: city.country,
                    district: city.district,
                    province: city.province,
                    coordinates: {
                        latitude: city.lat,
                        longitude: city.lng
                    },
                    nighttime_lights_value: nighttimeLightsValue,
                    unit: 'nW/cm²/sr',
                    description: 'Annual average nighttime lights intensity from DMSP-OLS satellite data - indicates urbanization and development level'
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
    const values = data.map(item => item.nighttime_lights_value);
    const provinces = data.map(item => item.province);
    
    // Provincial averages
    const provincialAverages = {};
    const provinceGroups = {};
    data.forEach(item => {
        const province = item.province;
        if (!provinceGroups[province]) {
            provinceGroups[province] = [];
        }
        provinceGroups[province].push(item.nighttime_lights_value);
    });
    
    Object.entries(provinceGroups).forEach(([province, values]) => {
        provincialAverages[province] = values.reduce((a, b) => a + b, 0) / values.length;
    });
    
    return {
        total_districts: data.length,
        average_nighttime_lights: values.reduce((a, b) => a + b, 0) / values.length,
        min_nighttime_lights: Math.min(...values),
        max_nighttime_lights: Math.max(...values),
        provincial_averages: provincialAverages,
        data_range: {
            min: Math.min(...values),
            max: Math.max(...values),
            range: Math.max(...values) - Math.min(...values)
        }
    };
}

function generateCSVOutput(data) {
    let csv = 'Country,District,Province,Latitude,Longitude,Nighttime Lights,Unit,Description\n';
    data.forEach(district => {
        csv += `"${district.country}","${district.district}","${district.province}",${district.coordinates.latitude},${district.coordinates.longitude},${district.nighttime_lights_value},"${district.unit}","${district.description}"\n`;
    });
    return csv;
}

optimizedNighttimeLightsExtraction().catch(console.error);
