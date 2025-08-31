#!/usr/bin/env node

/**
 * OPTIMIZED SOLAR INSTALLATIONS EXTRACTION SCRIPT
 * 
 * KEY INSIGHTS:
 * 1. Solar installations are specific infrastructure data (not broad power plants)
 * 2. They have specific locations, installation dates, capacity data
 * 3. More focused than general power plants - better for city-level analysis
 * 4. Dataset ID and table name discovered from terminal logs
 * 
 * DATASET STRUCTURE DISCOVERED:
 * - cartodb_id: Unique identifier
 * - the_geom: Geometry data (spatial information)
 * - unique_id: Installation identifier
 * - area: Installation area in square meters
 * - iso_3166_1: Country code (e.g., 'PE' for Peru, 'BR' for Brazil)
 * - gti: Global Tilted Irradiance (solar energy potential)
 * - pvout: Photovoltaic Output (actual energy production)
 * - capacity_m: Capacity in megawatts
 * 
 * APPROACH: 
 * 1. Use the discovered dataset ID: c161a098-7f09-4313-b176-08a32e3bb3ad
 * 2. Use the discovered table name: ene_032_solar_plants
 * 3. Explore the data structure to understand fields and query patterns
 * 4. Extract meaningful solar installation data for South American cities
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

// Resource Watch API configuration
const API_BASE_URL = 'https://api.resourcewatch.org/v1';
const DATASET_ID = 'c161a098-7f09-4313-b176-08a32e3bb3ad';
const TABLE_NAME = 'ene_032_solar_plants';

// South American countries with their ISO codes and regions
const SOUTH_AMERICAN_COUNTRIES = [

    { iso: 'PE', name: 'Peru', region: 'Central' }

];

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function makeAPIRequest(endpoint, params = {}, retryCount = 0) {
    try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
            params: params,
            timeout: 30000
        });
        return response;
    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            console.log(`⚠️  Attempt ${retryCount + 1} failed, retrying in ${RETRY_DELAY}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return makeAPIRequest(endpoint, params, retryCount + 1);
        }
        throw error;
    }
}

async function extractSolarInstallationsForCountry(country) {
    console.log(`🔍 Extracting solar installations for ${country.name} (${country.iso})...`);
    
    try {
        // Get all installations for this country with coordinates
        const query = `SELECT 
            unique_id, 
            area, 
            iso_3166_1, 
            gti, 
            pvout, 
            capacity_m,
            ST_X(ST_Centroid(the_geom)) as longitude,
            ST_Y(ST_Centroid(the_geom)) as latitude
        FROM ${TABLE_NAME} 
        WHERE iso_3166_1 = '${country.iso}'`;
        
        const response = await makeAPIRequest(`/query/${DATASET_ID}`, { sql: query });
        
        if (response.data && response.data.data && response.data.data.length > 0) {
            const installations = response.data.data;
            
            // Calculate summary statistics
            const totalCapacity = installations.reduce((sum, inst) => sum + (inst.capacity_m || 0), 0);
            const avgCapacity = totalCapacity / installations.length;
            const totalArea = installations.reduce((sum, inst) => sum + (inst.area || 0), 0);
            const avgGTI = installations.reduce((sum, inst) => sum + (inst.gti || 0), 0) / installations.length;
            const avgPVOUT = installations.reduce((sum, inst) => sum + (inst.pvout || 0), 0) / installations.length;
            
            console.log(`✅ ${country.name}: Found ${installations.length} installations`);
            console.log(`   Total Capacity: ${totalCapacity.toFixed(2)} MW`);
            console.log(`   Average Capacity: ${avgCapacity.toFixed(2)} MW`);
            console.log(`   Total Area: ${(totalArea / 1000000).toFixed(2)} km²`);
            
            return {
                country: country.name,
                iso_code: country.iso,
                region: country.region,
                installation_count: installations.length,
                total_capacity_mw: totalCapacity,
                average_capacity_mw: avgCapacity,
                total_area_km2: totalArea / 1000000,
                average_gti: avgGTI,
                average_pvout: avgPVOUT,
                installations: installations
            };
        } else {
            console.log(`⚠️  ${country.name}: No installations found`);
            return {
                country: country.name,
                iso_code: country.iso,
                region: country.region,
                installation_count: 0,
                total_capacity_mw: 0,
                average_capacity_mw: 0,
                total_area_km2: 0,
                average_gti: 0,
                average_pvout: 0,
                installations: []
            };
        }
    } catch (error) {
        console.error(`❌ Error extracting data for ${country.name}:`, error.message);
        return {
            country: country.name,
            iso_code: country.iso,
            region: country.region,
            error: error.message,
            installation_count: 0,
            total_capacity_mw: 0,
            average_capacity_mw: 0,
            total_area_km2: 0,
            average_gti: 0,
            average_pvout: 0,
            installations: []
        };
    }
}

async function reverseGeocode(latitude, longitude) {
    try {
        // Use a free reverse geocoding service
        const response = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`, {
            timeout: 5000
        });
        
        if (response.data) {
            const { city, locality, principalSubdivision, countryName } = response.data;
            return {
                city: city || locality || 'Unknown City',
                state: principalSubdivision || 'Unknown State',
                country: countryName || 'Unknown Country'
            };
        }
    } catch (error) {
        console.log(`⚠️  Reverse geocoding failed for ${latitude}, ${longitude}: ${error.message}`);
    }
    
    return {
        city: 'Unknown City',
        state: 'Unknown State', 
        country: 'Unknown Country'
    };
}

async function generateDetailedInstallationsCSV(countryData) {
    console.log('🗺️  Generating detailed CSV with city names...');
    
    let csv = 'Country,ISO_Code,Region,Installation_ID,Capacity_MW,Area_SqMeters,GTI_kWh_m2,PVOUT_kWh_kWp,Latitude,Longitude,City,State\n';
    
    for (const country of countryData) {
        if (country.installations && country.installations.length > 0) {
            console.log(`📍 Processing ${country.installations.length} installations for ${country.country}...`);
            
            for (const inst of country.installations) {
                // Get city name from coordinates
                const location = await reverseGeocode(inst.latitude, inst.longitude);
                
                csv += `"${country.country}","${country.iso_code}","${country.region}",${inst.unique_id},${inst.capacity_m || 0},${inst.area || 0},${inst.gti || 0},${inst.pvout || 0},${inst.latitude || 0},${inst.longitude || 0},"${location.city}","${location.state}"\n`;
                
                // Add small delay to avoid overwhelming the geocoding service
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }
    
    return csv;
}

async function generateSummaryCSV(countryData) {
    let csv = 'Country,ISO_Code,Region,Installation_Count,Total_Capacity_MW,Average_Capacity_MW,Total_Area_km2,Average_GTI,Average_PVOUT\n';
    
    countryData.forEach(country => {
        csv += `"${country.country}","${country.country}","${country.region}",${country.installation_count},${country.total_capacity_mw.toFixed(2)},${country.average_capacity_mw.toFixed(2)},${country.total_area_km2.toFixed(2)},${country.average_gti.toFixed(2)},${country.average_pvout.toFixed(2)}\n`;
    });
    
    return csv;
}

async function extractSolarInstallationsData() {
    console.log('🚀 STARTING COMPREHENSIVE SOLAR INSTALLATIONS EXTRACTION...\n');
    console.log('📊 Dataset: Global Inventory of Solar Energy Installations');
    console.log('🌍 Target: South American Countries');
    console.log('===============================================================================\n');
    
    const startTime = Date.now();
    const results = [];
    
    // Extract data for each South American country
    for (const country of SOUTH_AMERICAN_COUNTRIES) {
        const countryData = await extractSolarInstallationsForCountry(country);
        results.push(countryData);
        
        // Add delay between requests to be respectful to the API
        if (country !== SOUTH_AMERICAN_COUNTRIES[SOUTH_AMERICAN_COUNTRIES.length - 1]) {
            console.log('⏳ Waiting 2 seconds before next country...\n');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Generate output files
    const outputDir = './src/ingestion/generated';
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate summary CSV
    const summaryCSV = await generateSummaryCSV(results);
    const summaryPath = path.join(outputDir, 'solar-installations-summary.csv');
    await fs.writeFile(summaryPath, summaryCSV);
    
    // Generate detailed installations CSV with city names
    console.log('\n🗺️  Starting reverse geocoding to get city names...');
    const detailedCSV = await generateDetailedInstallationsCSV(results);
    const detailedPath = path.join(outputDir, 'solar-installations-detailed.csv');
    await fs.writeFile(detailedPath, detailedCSV);
    
    // Display summary
    console.log('\n===============================================================================');
    console.log('✅ SOLAR INSTALLATIONS EXTRACTION COMPLETED!');
    console.log(`⏱️  Processing time: ${duration.toFixed(2)} seconds`);
    console.log(`🌍 Countries processed: ${results.length}`);
    console.log(`📊 Total installations found: ${results.reduce((sum, c) => sum + c.installation_count, 0)}`);
    console.log(`⚡ Total capacity: ${results.reduce((sum, c) => sum + c.total_capacity_mw, 0).toFixed(2)} MW`);
    console.log(`📁 Summary CSV: ${summaryPath}`);
    console.log(`📁 Detailed CSV: ${detailedPath}`);
    console.log('===============================================================================\n');
    
    // Display country-by-country summary
    console.log('📊 COUNTRY SUMMARY:');
    results.forEach(country => {
        if (country.installation_count > 0) {
            console.log(`  ${country.country} (${country.iso_code}): ${country.installation_count} installations, ${country.total_capacity_mw.toFixed(2)} MW total`);
        } else {
            console.log(`  ${country.country} (${country.iso_code}): No installations found`);
        }
    });
    
    // Display regional summary
    const regionalData = {};
    results.forEach(country => {
        if (!regionalData[country.region]) {
            regionalData[country.region] = { count: 0, capacity: 0 };
        }
        regionalData[country.region].count += country.installation_count;
        regionalData[country.region].capacity += country.total_capacity_mw;
    });
    
    console.log('\n🌍 REGIONAL SUMMARY:');
    Object.entries(regionalData).forEach(([region, data]) => {
        console.log(`  ${region}: ${data.count} installations, ${data.capacity.toFixed(2)} MW total capacity`);
    });
}

// Run the exploration
extractSolarInstallationsData().catch(console.error);
