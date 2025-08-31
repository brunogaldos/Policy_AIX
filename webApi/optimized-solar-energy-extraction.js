#!/usr/bin/env node

// Optimized Solar Energy Potential data extraction
// Uses the working individual query approach with better batching and error handling

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

async function optimizedSolarEnergyExtraction() {
    console.log('Optimized Solar Energy Potential data extraction...\n');
    
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
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(districts.length / batchSize)} (${batch.length} districts)...`);
        
        const batchPromises = batch.map(district => processCity(district));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
            const district = batch[index];
            if (result.status === 'fulfilled') {
                if (result.value.success) {
                    processedData.push(result.value.data);
                    console.log(`✅ ${district.district}: Solar energy potential extracted successfully`);
                } else {
                    errors.push({
                        district: district.district,
                        country: district.country,
                        error: result.value.error
                    });
                    console.log(`❌ ${district.district}: ${result.value.error}`);
                }
            } else {
                errors.push({
                    district: district.district,
                    country: district.country,
                    error: result.reason.message
                });
                console.log(`❌ ${district.district}: ${result.reason.message}`);
            }
        });
        
        // Add a small delay between batches to be respectful to the API
        if (i + batchSize < districts.length) {
            console.log('⏳ Waiting 2 seconds before next batch...\n');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Create summary and save
    const summary = createSummary(processedData);
    const outputs = {
        solar_energy_data: processedData,
        summary: summary,
        errors: errors,
        metadata: {
            generated_at: new Date().toISOString(),
            total_districts: districts.length,
            successful_extractions: processedData.length,
            failed_extractions: errors.length,
            processing_time_seconds: duration,
            batch_size: batchSize,
            data_source: 'Resource Watch Solar Energy Potential Dataset (Global Horizontal Irradiation & Photovoltaic Power Potential)',
            processing_script: 'optimized-solar-energy-extraction.js'
        }
    };
    
    // Generate CSV file for more efficient RAG processing
    const outputDir = './src/ingestion/generated';
    await fs.mkdir(outputDir, { recursive: true });
    
    const csvOutputPath = path.join(outputDir, 'solar-energy-district-data-index.csv');
    const csvContent = generateCSVOutput(processedData);
    await fs.writeFile(csvOutputPath, csvContent);
    
    console.log('='.repeat(80));
    console.log('OPTIMIZED SOLAR ENERGY EXTRACTION COMPLETED!');
    console.log(`   Processing time: ${duration.toFixed(2)} seconds`);
    console.log(`   Successful extractions: ${processedData.length}`);
    console.log(`   Failed extractions: ${errors.length}`);
    console.log(`   CSV output saved to: ${csvOutputPath}`);
    console.log('='.repeat(80));
    
    // Display summary
    console.log('\nPROVINCIAL SUMMARY:');
    Object.entries(summary.provincial_averages).forEach(([province, avg]) => {
        console.log(`   ${province}: ${avg.toFixed(2)} kWh/m² (GHI) / ${(avg * 0.75).toFixed(2)} kWh/kWp (PVOUT)`);
    });
    
    if (errors.length > 0) {
        console.log('\nERRORS:');
        errors.forEach(error => {
            console.log(`   ${error.district}, ${error.country}: ${error.error}`);
        });
    }
}

// Helper function to find numeric values in nested objects
function findNumericValue(obj) {
    if (obj === null || obj === undefined) return null;
    
    if (typeof obj === 'number') {
        return isNaN(obj) ? null : obj;
    }
    
    if (typeof obj === 'string') {
        const parsed = parseFloat(obj);
        return isNaN(parsed) ? null : parsed;
    }
    
    if (typeof obj === 'object') {
        for (const key in obj) {
            const value = obj[key];
            if (typeof value === 'number' && !isNaN(value) && value >= 0) {
                return value;
            }
            if (typeof value === 'string') {
                const parsed = parseFloat(value);
                if (!isNaN(parsed) && parsed >= 0) {
                    return parsed;
                }
            }
        }
    }
    
    return null;
}

async function processCity(city, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Use the working query from Resource Watch - this dataset supports PostGIS queries
            // The working query uses st_summarystats(rast, 'b1', false) to get raster statistics
            // We'll use the GHI (Global Horizontal Irradiation) layer for solar energy potential
            const query = `select st_summarystats(rast, 'b1', false) as x from 'users/resourcewatch/ene_031a_solar_irradiance_GHI/GHI_250_mosaic' where ST_INTERSECTS(ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Point","coordinates":[${city.lng},${city.lat}]}'),4326),the_geom)`;
            
            console.log(`🔍 Query for ${city.district}: ${query}`);
            
            // Use the Solar Energy Potential dataset endpoint
            const response = await axios.get('https://api.resourcewatch.org/v1/query/2063964b-56c8-4080-b2a5-5a7710f321b9', {
                params: { sql: query },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 40000
            });
            
            if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
                const record = response.data.data[0];
                
                // Debug: Log the response structure for the first district
                if (city.district === 'Arequipa') {
                    console.log(`🔍 Response structure for ${city.district}:`, JSON.stringify(record, null, 2));
                }
                
                // The st_summarystats function returns an object with statistics
                // The response structure is: record.x.b1.mean (where b1 is the band)
                let solarEnergyValue = null;
                
                if (record.x && typeof record.x === 'object') {
                    // record.x contains the st_summarystats result object
                    const stats = record.x;
                    
                    // Look for the b1 band statistics (this is the correct structure)
                    if (stats.b1 && typeof stats.b1 === 'object' && stats.b1.mean !== undefined && !isNaN(stats.b1.mean)) {
                        solarEnergyValue = parseFloat(stats.b1.mean);
                        console.log(`🔍 Found b1.mean value: ${solarEnergyValue}`);
                    } else if (stats.b1 && typeof stats.b1 === 'object' && stats.b1.avg !== undefined && !isNaN(stats.b1.avg)) {
                        solarEnergyValue = parseFloat(stats.b1.avg);
                        console.log(`🔍 Found b1.avg value: ${solarEnergyValue}`);
                    } else if (stats.b1 && typeof stats.b1 === 'object' && stats.b1.value !== undefined && !isNaN(stats.b1.value)) {
                        solarEnergyValue = parseFloat(stats.b1.value);
                        console.log(`🔍 Found b1.value: ${solarEnergyValue}`);
                    } else {
                        // Try to find any numeric value in the b1 band object
                        if (stats.b1 && typeof stats.b1 === 'object') {
                            for (const key in stats.b1) {
                                const value = stats.b1[key];
                                if (typeof value === 'number' && !isNaN(value) && value >= 0) {
                                    solarEnergyValue = value;
                                    console.log(`🔍 Found numeric value in b1.${key}: ${value}`);
                                    break;
                                }
                            }
                        }
                    }
                    
                    // If still no value found, use the findNumericValue helper on the b1 band
                    if (solarEnergyValue === null && stats.b1) {
                        solarEnergyValue = findNumericValue(stats.b1);
                    }
                } else {
                    // Fallback: try to find any numeric value in the record
                    solarEnergyValue = findNumericValue(record);
                }
                
                // Check if we got a valid number
                if (solarEnergyValue === null || isNaN(solarEnergyValue)) {
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
                    solar_energy_potential_ghi: solarEnergyValue,
                    unit: 'kWh/m²',
                    description: 'Global Horizontal Irradiation (GHI) - Average daily solar energy potential'
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
    const values = data.map(item => item.solar_energy_potential_ghi);
    const provinces = data.map(item => item.province);
    
    // Provincial averages
    const provincialAverages = {};
    const provinceGroups = {};
    
    data.forEach(item => {
        const province = item.province;
        if (!provinceGroups[province]) {
            provinceGroups[province] = [];
        }
        provinceGroups[province].push(item.solar_energy_potential_ghi);
    });
    
    Object.entries(provinceGroups).forEach(([province, values]) => {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        provincialAverages[province] = avg;
    });
    
    const validValues = values.filter(v => v !== null && !isNaN(v));
    const average = validValues.length > 0 ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length : null;
    const min = validValues.length > 0 ? Math.min(...validValues) : null;
    const max = validValues.length > 0 ? Math.max(...validValues) : null;
    
    return {
        total_districts: data.length,
        average_solar_energy: average,
        min_solar_energy: min,
        max_solar_energy: max,
        provincial_averages: provincialAverages,
        data_range: {
            min: min,
            max: max,
            range: max && min ? max - min : null
        }
    };
}



function generateCSVOutput(data) {
    let csv = 'Country,District,Province,Latitude,Longitude,Solar Energy Potential (GHI),Unit,Description\n';
    
    data.forEach(item => {
        csv += `"${item.country}","${item.district}","${item.province}",${item.coordinates.latitude},${item.coordinates.longitude},${item.solar_energy_potential_ghi},"${item.unit}","${item.description}"\n`;
    });
    
    return csv;
}

// Run the extraction
optimizedSolarEnergyExtraction().catch(console.error);
