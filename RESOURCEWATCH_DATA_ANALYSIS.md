# ResourceWatch Data Analysis: NO2 Air Quality Dataset

## Overview

Based on the terminal output you provided, I've analyzed the ResourceWatch application codebase to understand the data sources, API structure, and data format for the Air Quality: Nitrogen Dioxide (NO₂) Satellite Measurements dataset.

## API Endpoints and Data Flow

### 1. Dataset Information
```
GET https://api.resourcewatch.org/v1/dataset/b75d8398-34f2-447d-832d-ea570451995a
```
- **Purpose**: Fetches metadata and configuration for the NO2 dataset
- **Parameters**: 
  - `application: 'rw'`
  - `env: 'production'`
  - `language: 'en'`
  - `includes: 'metadata,vocabulary,layer'`
  - `page[size]: '999'`

### 2. Widget Information
```
GET https://api.resourcewatch.org/v1/widget/1ae4b9db-93b9-4b2f-8bdb-b9341627703d
```
- **Purpose**: Fetches widget configuration for data visualization
- **Parameters**: Similar to dataset endpoint

### 3. Layer Information
```
GET https://api.resourcewatch.org/v1/dataset/b75d8398-34f2-447d-832d-ea570451995a/layer
```
- **Purpose**: Fetches map layer configuration and styling
- **Parameters**:
  - `app: 'rw'`
  - `env: 'production'`
  - `page[size]: '9999'`

### 4. Data Query
```
GET https://api.resourcewatch.org/v1/query/b75d8398-34f2-447d-832d-ea570451995a
```
- **Purpose**: Executes SQL queries to fetch actual data values
- **Parameters**:
  - `sql: 'SELECT * FROM projects/resource-watch-gee/cit_035_tropomi_atmospheric_chemistry_model_30day_avg/NO2 LIMIT 50'`

## Data Source and Format

### Google Earth Engine Dataset
The NO2 data comes from Google Earth Engine with the following structure:

**Dataset Path**: `projects/resource-watch-gee/cit_035_tropomi_atmospheric_chemistry_model_30day_avg/NO2`

**Asset ID**: `projects/resource-watch-gee/cit_035_tropomi_atmospheric_chemistry_model_30day_avg/NO2/cit_035_tropomi_atmospheric_chemistry_model_30day_avg_NO2_2021-05-15`

### Data Structure

#### 1. Raster Data Format
- **Type**: GeoTIFF raster data
- **Spatial Resolution**: 3.5 x 5.5 km
- **Coverage**: Global
- **Units**: mol/m² (moles of NO₂ per square meter of air)
- **Time Period**: 30-day averages

#### 2. Color Mapping (SLD Style)
```xml
<RasterSymbolizer>
  <ColorMap type="ramp" extended="false">
    <ColorMapEntry color="#000003" quantity="-1"/>
    <ColorMapEntry color="#000003" quantity="0.000005"/>
    <ColorMapEntry color="#550F6D" quantity="0.00001"/>
    <ColorMapEntry color="#BA3655" quantity="0.00003"/>
    <ColorMapEntry color="#F98C09" quantity="0.0001"/>
    <ColorMapEntry color="#FCFEA4" quantity="0.0003"/>
  </ColorMap>
</RasterSymbolizer>
```

#### 3. Legend Configuration
```json
{
  "items": [
    {"color": "#000003", "name": "≤5", "id": 0},
    {"color": "#550F6D", "name": "10", "id": 1},
    {"color": "#BA3655", "name": "30", "id": 2},
    {"color": "#F98C09", "name": "100", "id": 3},
    {"color": "#FCFEA4", "name": "≥300", "id": 4}
  ],
  "type": "gradient"
}
```

### 4. Interactive Data Query
For point-based data retrieval (when clicking on the map):

```sql
SELECT last(tropospheric_NO2_column_number_density) as x 
FROM 'projects/resource-watch-gee/cit_035_tropomi_atmospheric_chemistry_model_30day_avg/NO2/cit_035_tropomi_atmospheric_chemistry_model_30day_avg_NO2_2021-05-15' 
WHERE system:time_start >= 1533448800000 
AND ST_INTERSECTS(ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Point","coordinates":[{{lng}},{{lat}}]}'),4326),the_geom)
```

**Response Format**:
```json
{
  "data": [
    {
      "x": 0.000123  // NO2 density value in mol/m²
    }
  ]
}
```

## Data Processing Pipeline

### 1. Source Data
- **Satellite**: Sentinel-5 Precursor (S5P) with TROPOMI instrument
- **Processing**: 3-step methodology:
  1. Total NO₂ slant column density from radiance/irradiance spectra
  2. Separation into stratospheric and tropospheric categories
  3. Conversion to tropospheric vertical column density

### 2. Google Earth Engine Processing
- Data is processed using the `harpconvert` tool
- 30-day averaging applied
- Offline version (more complete but delayed)

### 3. ResourceWatch Integration
- Data served through Google Earth Engine API
- Styled using SLD (Styled Layer Descriptor)
- Interactive queries for point data

## Integration with Chatbot

### Available Data for Chatbot Integration

1. **Spatial Data**: Global raster coverage with 3.5x5.5km resolution
2. **Temporal Data**: 30-day averaged values
3. **Point Queries**: Real-time NO2 values for specific coordinates
4. **Metadata**: Comprehensive dataset information and methodology

### Suggested Chatbot Features

1. **Location-based Queries**: "What's the NO2 level in [city]?"
2. **Temporal Analysis**: "How has NO2 changed over time?"
3. **Comparative Analysis**: "Compare NO2 levels between regions"
4. **Health Impact**: "What are the health implications of current NO2 levels?"

### API Integration Points

1. **Dataset Metadata**: Use dataset endpoint for general information
2. **Spatial Queries**: Use query endpoint with geographic coordinates
3. **Visualization**: Reference the color mapping for data interpretation
4. **Time Series**: Query historical data for trend analysis

## Technical Implementation

### Frontend Components
- **Map Component**: `resource-watch/components/map/component.tsx`
- **Layer Management**: `resource-watch/components/map/layer-manager/`
- **Data Visualization**: `resource-watch/components/widgets/charts/LayerChart.js`

### Backend Services
- **Dataset Service**: `resource-watch/services/dataset.ts`
- **Query Service**: `resource-watch/services/query.js`
- **Layer Service**: `resource-watch/services/layer.js`
- **Widget Service**: `resource-watch/services/widget.ts`

### Data Flow
1. User selects dataset → Dataset API call
2. Map renders → Layer API call
3. User interacts → Query API call
4. Data displayed → Styled using SLD configuration

## Conclusion

The ResourceWatch NO2 dataset provides a rich source of air quality data that can be integrated into your chatbot. The data is well-structured, globally comprehensive, and includes both spatial and temporal dimensions. The API endpoints provide easy access to both metadata and actual data values, making it suitable for interactive chatbot responses about air quality conditions worldwide.




