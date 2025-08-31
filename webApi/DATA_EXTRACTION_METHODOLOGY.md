# Data Extraction Methodology: Resource Watch API

## Table of Contents
1. [Overview](#overview)
2. [Dataset Discovery Process](#dataset-discovery-process)
3. [Query Detection Logic](#query-detection-logic)
4. [Data Extraction Patterns](#data-extraction-patterns)
5. [Script Architecture](#script-architecture)
6. [Case Studies](#case-studies)
7. [Troubleshooting Guide](#troubleshooting-guide)

## Overview

This document outlines the systematic approach used to extract data from Resource Watch datasets. The methodology involves understanding dataset structure, detecting working query patterns, and implementing robust data extraction logic.

## Dataset Discovery Process

### Step 1: Identify Dataset Information
Search the Resource Watch codebase for dataset details:

```bash
# Search for dataset by name
grep_search "Solar Energy Potential dataset"

# Search for dataset ID
grep_search "2063964b-56c8-4080-b2a5-5a7710f321b9"

# Search for working queries
grep_search "a86d906d-9862-4783-9e30-cdb68cd808b8.*sql="
```

### Step 2: Extract Key Metadata
From the search results, identify:

```json
{
  "dataset_id": "2063964b-56c8-4080-b2a5-5a7710f321b9",
  "name": "ene.031a Solar Irradiance",
  "provider": "gee",  // or "cartodb", "rest", etc.
  "table_name": "users/resourcewatch/ene_031a_solar_irradiance_GHI/GHI_250_mosaic",
  "connector_type": "rest"
}
```

### Step 3: Understand Dataset Type
Different providers require different query approaches:

- **GEE (Google Earth Engine)**: Supports PostGIS functions, raster data
- **CartoDB**: Basic SQL, tabular data, limited spatial functions
- **REST**: Simple HTTP endpoints, JSON responses

## Query Detection Logic

### Pattern 1: GEE Datasets with PostGIS Support

**Example**: Solar Energy Potential Dataset

```javascript
// Working query pattern found in Resource Watch data:
const query = `select st_summarystats(rast, 'b1', false) as x 
               from 'users/resourcewatch/ene_031a_solar_irradiance_GHI/GHI_250_mosaic' 
               where ST_INTERSECTS(ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Point","coordinates":[${city.lng},${city.lat}]}'),4326),the_geom)`;
```

**Key Components**:
- `st_summarystats(rast, 'b1', false)`: Raster statistics function
- `'b1'`: Band number (raster data has multiple bands)
- `ST_INTERSECTS`: PostGIS spatial intersection function
- `ST_SetSRID(ST_GeomFromGeoJSON(...), 4326)`: Geometry creation with coordinate system
- `the_geom`: Target geometry field

**Response Structure**:
```json
{
  "x": {
    "b1": {
      "count": 1,
      "max": 4.72599983215332,
      "mean": 4.72599983215332,
      "min": 4.72599983215332,
      "stdev": null,
      "sum": 4.72599983215332
    }
  }
}
```

**Data Extraction Logic**:
```javascript
if (record.x && typeof record.x === 'object') {
    const stats = record.x;
    
    // Navigate nested structure: record.x.b1.mean
    if (stats.b1 && typeof stats.b1 === 'object' && stats.b1.mean !== undefined) {
        solarEnergyValue = parseFloat(stats.b1.mean);
        console.log(`🔍 Found b1.mean value: ${solarEnergyValue}`);
    }
}
```

### Pattern 2: CartoDB Datasets (Limited Spatial Support)

**Example**: Global Power Plant Database

**Working Query Examples from Resource Watch**:
```sql
-- Simple aggregation without spatial functions
SELECT primary_fuel as x, sum(capacity_mw) as y 
FROM powerwatch_data_20180102 
GROUP BY x ORDER BY y desc LIMIT 500

-- Country-based filtering
SELECT country_long as x, SUM(capacity_mw) as y 
FROM powerwatch_data_20180102 
WHERE country_long LIKE '%Peru%' 
GROUP BY x ORDER BY y desc LIMIT 50
```

**Key Insights**:
- No complex PostGIS functions (`ST_DWithin`, `ST_INTERSECTS`)
- Basic SQL with `LIKE` for country matching
- Simple coordinate filtering with `BETWEEN`
- Aggregation functions: `COUNT`, `SUM`, `AVG`, `STRING_AGG`

**Query Structure**:
```javascript
const query = `SELECT 
    COUNT(*) as plant_count,
    SUM(capacity_mw) as total_capacity_mw,
    AVG(capacity_mw) as avg_capacity_mw,
    SUM(estimated_generation_gwh) as total_generation_gwh,
    AVG(estimated_generation_gwh) as avg_generation_gwh,
    STRING_AGG(DISTINCT fuel1, ', ') as fuel_types
FROM powerwatch_data_20180102 
WHERE country_long LIKE '%${city.country}%'`;
```

### Pattern 3: NO2 Dataset (GEE with Complex PostGIS)

**Example**: TROPOMI NO2 Dataset

```javascript
// Working query pattern:
const query = `select last(tropospheric_NO2_column_number_density) as x 
               from 'projects/resource-watch-gee/cit_035_tropomi_atmospheric_chemistry_model_30day_avg/NO2/cit_035_tropomi_atmospheric_chemistry_model_30day_avg_NO2_2025-08-05' 
               where system:time_start >= 1533448800000 
               and ST_INTERSECTS(ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Point","coordinates":[${city.lng},${city.lat}]}'),4326),the_geom)`;
```

**Key Components**:
- `last(field_name)`: Temporal aggregation function
- `system:time_start >= timestamp`: Time filtering
- Complex PostGIS spatial functions
- Specific GEE asset path with date

**Response Structure**:
```json
{
  "x": 0.0001234  // Direct numeric value
}
```

**Data Extraction Logic**:
```javascript
if (record.x !== undefined && record.x !== null) {
    const no2Value = parseFloat(record.x);
    // Direct extraction from 'x' field
}
```

## Data Extraction Patterns

### Pattern 1: Nested Object Navigation

**Use Case**: When response contains nested statistics objects

```javascript
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
        }
    }
    
    return null;
}
```

### Pattern 2: Fallback Chain Extraction

**Use Case**: Multiple possible field names for the same data

```javascript
let dataValue = null;

// Primary target
if (stats.mean !== undefined && !isNaN(stats.mean)) {
    dataValue = parseFloat(stats.mean);
} 
// Secondary fallback
else if (stats.avg !== undefined && !isNaN(stats.avg)) {
    dataValue = parseFloat(stats.avg);
} 
// Tertiary fallback
else if (stats.value !== undefined && !isNaN(stats.value)) {
    dataValue = parseFloat(stats.value);
} 
// Final fallback
else {
    dataValue = findNumericValue(stats);
}
```

### Pattern 3: Batch Processing with Error Handling

**Use Case**: Processing multiple cities efficiently

```javascript
const batchSize = 5;
for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    
    const batchPromises = batch.map(city => processCity(city));
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
        const city = batch[index];
        if (result.status === 'fulfilled') {
            if (result.value.success) {
                processedData.push(result.value.data);
            } else {
                errors.push({
                    city: city.name,
                    country: city.country,
                    error: result.value.error
                });
            }
        }
    });
    
    // Respectful API usage
    if (i + batchSize < cities.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}
```

## Script Architecture

### 1. Main Extraction Function

```javascript
async function optimizedDataExtraction() {
    // 1. Define cities with coordinates
    const cities = [
        { name: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428, region: 'Central' }
    ];
    
    // 2. Process in batches
    const batchSize = 5;
    for (let i = 0; i < cities.length; i += batchSize) {
        // Process batch
    }
    
    // 3. Generate outputs
    const summary = createSummary(processedData);
    await generateOutputs(processedData, summary);
}
```

### 2. City Processing Function

```javascript
async function processCity(city, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // 1. Construct query based on dataset type
            const query = buildQuery(city, datasetType);
            
            // 2. Make API request
            const response = await axios.get(endpoint, { params: { sql: query } });
            
            // 3. Parse response based on expected structure
            const data = parseResponse(response.data, datasetType);
            
            // 4. Return structured result
            return { success: true, city: city, data: data };
            
        } catch (error) {
            if (attempt === retries) {
                return { success: false, city: city, error: error.message };
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}
```

### 3. Response Parsing Functions

```javascript
function parseResponse(responseData, datasetType) {
    switch (datasetType) {
        case 'gee_postgis':
            return parseGeePostgisResponse(responseData);
        case 'cartodb':
            return parseCartodbResponse(responseData);
        case 'rest':
            return parseRestResponse(responseData);
        default:
            return parseGenericResponse(responseData);
    }
}
```

## Case Studies

### Case Study 1: NO2 Dataset (Success)

**Dataset Type**: GEE with PostGIS support
**Query Pattern**: Complex spatial query with temporal filtering
**Response Structure**: Direct numeric values in 'x' field
**Result**: 100% success rate, accurate data extraction

**Key Success Factors**:
1. Correct dataset ID and endpoint
2. Proper PostGIS query structure
3. Simple response parsing (direct field access)
4. Appropriate spatial functions for point queries

### Case Study 2: Solar Energy Dataset (Success)

**Dataset Type**: GEE with PostGIS support
**Query Pattern**: Raster statistics with spatial intersection
**Response Structure**: Nested statistics objects
**Result**: 100% success rate after fixing nested object navigation

**Key Success Factors**:
1. Correct GEE asset path
2. Proper band specification ('b1')
3. Understanding of `st_summarystats` response structure
4. Fallback parsing logic for different field names

### Case Study 3: Power Plant Dataset (In Progress)

**Dataset Type**: CartoDB
**Query Pattern**: Basic SQL without spatial functions
**Response Structure**: Aggregated statistics
**Result**: 0% success rate, requires diagnostic approach

**Key Challenges**:
1. Different provider type (CartoDB vs GEE)
2. No complex spatial functions supported
3. Country field values may differ from expected
4. Coordinate filtering may not work as expected

## Troubleshooting Guide

### Problem 1: HTTP 500 Errors

**Symptoms**: All requests return "Request failed with status code 500"
**Causes**: 
- Complex query syntax not supported
- Invalid field names or table references
- Unsupported PostGIS functions

**Solutions**:
1. Check dataset provider type (GEE vs CartoDB)
2. Simplify query to basic SELECT statements
3. Use working query examples from Resource Watch
4. Remove complex spatial functions if not supported

### Problem 2: No Data Records Found

**Symptoms**: API returns success but empty data arrays
**Causes**:
- Query too restrictive
- Field names incorrect
- Country values don't match expected format

**Solutions**:
1. Use diagnostic queries to explore data structure
2. Check actual field values in sample records
3. Broaden query constraints
4. Use LIKE operators instead of exact matching

### Problem 3: Could Not Extract Numeric Value

**Symptoms**: Data found but parsing fails
**Causes**:
- Unexpected response structure
- Nested object navigation incorrect
- Field names different from expected

**Solutions**:
1. Log response structure for debugging
2. Implement fallback parsing logic
3. Use `findNumericValue` helper function
4. Check for nested object structures

### Problem 4: Inconsistent Success Rates

**Symptoms**: Some cities work, others fail
**Causes**:
- Geographic coverage gaps
- Different data quality by region
- Coordinate filtering too restrictive

**Solutions**:
1. Adjust spatial thresholds
2. Implement regional fallbacks
3. Use broader geographic queries
4. Check data coverage by region

## Best Practices

### 1. Always Start with Diagnostics

```javascript
// For first city, use exploratory query
if (city.name === 'Lima') {
    query = `SELECT * FROM table_name LIMIT 10`;
    // Log response structure
    console.log(`🔍 Response structure:`, JSON.stringify(record, null, 2));
}
```

### 2. Implement Fallback Logic

```javascript
// Multiple extraction attempts
let value = null;
if (stats.mean !== undefined) value = stats.mean;
else if (stats.avg !== undefined) value = stats.avg;
else if (stats.value !== undefined) value = stats.value;
else value = findNumericValue(stats);
```

### 3. Use Batch Processing

```javascript
// Process in small batches to avoid overwhelming API
const batchSize = 5;
for (let i = 0; i < cities.length; i += batchSize) {
    // Process batch
    await new Promise(resolve => setTimeout(resolve, 2000));
}
```

### 4. Comprehensive Error Handling

```javascript
try {
    // API call
} catch (error) {
    if (attempt === retries) {
        return { success: false, error: error.message };
    }
    // Retry with exponential backoff
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
}
```

### 5. Log Everything for Debugging

```javascript
console.log(`🔍 Query for ${city.name}: ${query}`);
console.log(`🔍 Response structure:`, JSON.stringify(record, null, 2));
console.log(`🔍 Found value: ${value}`);
```

## Conclusion

The key to successful data extraction from Resource Watch is understanding the dataset type and using the appropriate query pattern. GEE datasets support complex PostGIS functions, while CartoDB datasets require simpler SQL approaches. Always start with diagnostic queries to understand the actual data structure before implementing the full extraction logic.

The methodology involves:
1. **Dataset Discovery**: Find dataset ID, provider type, and working examples
2. **Query Detection**: Identify the correct query pattern for the dataset type
3. **Response Parsing**: Handle the specific response structure with fallback logic
4. **Error Handling**: Implement retries and comprehensive error reporting
5. **Iterative Improvement**: Use diagnostics to refine the approach

This systematic approach ensures reliable data extraction across different dataset types and providers.
