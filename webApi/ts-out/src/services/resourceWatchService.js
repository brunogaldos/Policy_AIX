import axios from 'axios';
export class ResourceWatchService {
    constructor(baseUrl = 'https://api.resourcewatch.org', apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }
    async fetchDataset(datasetId) {
        try {
            const response = await axios.get(`${this.baseUrl}/v1/dataset/${datasetId}`, {
                params: {
                    env: 'production',
                    application: 'rw',
                    language: 'en',
                    includes: 'metadata,vocabulary,layer,widget',
                    'page[size]': '999'
                },
                timeout: 10000
            });
            return response.data;
        }
        catch (error) {
            console.error(`Error fetching dataset ${datasetId}:`, error);
            throw new Error(`Failed to fetch dataset: ${error}`);
        }
    }
    async fetchLayer(datasetId) {
        try {
            const response = await axios.get(`${this.baseUrl}/v1/dataset/${datasetId}/layer`, {
                params: {
                    app: 'rw',
                    env: 'production',
                    'page[size]': '9999'
                },
                timeout: 10000
            });
            return response.data;
        }
        catch (error) {
            console.error(`Error fetching layers for dataset ${datasetId}:`, error);
            throw new Error(`Failed to fetch layers: ${error}`);
        }
    }
    async fetchWidget(widgetId) {
        try {
            const response = await axios.get(`${this.baseUrl}/v1/widget/${widgetId}`, {
                params: {
                    rw: '',
                    env: 'production',
                    language: 'en',
                    includes: 'metadata',
                    'page[size]': '999'
                },
                timeout: 10000
            });
            return response.data;
        }
        catch (error) {
            console.error(`Error fetching widget ${widgetId}:`, error);
            throw new Error(`Failed to fetch widget: ${error}`);
        }
    }
    async queryData(datasetId, sql) {
        try {
            const response = await axios.get(`${this.baseUrl}/v1/query/${datasetId}`, {
                params: { sql },
                timeout: 15000
            });
            return response.data;
        }
        catch (error) {
            console.error(`Error querying data for dataset ${datasetId}:`, error);
            throw new Error(`Failed to query data: ${error}`);
        }
    }
    async getAirQualityData(location) {
        // NO₂ dataset ID from the terminal logs
        const datasetId = 'b75d8398-34f2-447d-832d-ea570451995a';
        let sql = 'SELECT * FROM projects/resource-watch-gee/cit_035_tropomi_atmospheric_chemistry_model_30day_avg/NO2 LIMIT 100';
        if (location) {
            // Add location-specific filtering
            sql = `SELECT * FROM projects/resource-watch-gee/cit_035_tropomi_atmospheric_chemistry_model_30day_avg/NO2 
             WHERE ST_Within(geometry, ST_GeomFromText('POINT(${location})')) 
             LIMIT 100`;
        }
        return this.queryData(datasetId, sql);
    }
    async getEnvironmentalData(category) {
        // Map categories to dataset IDs
        const datasetMap = {
            'air-quality': 'b75d8398-34f2-447d-832d-ea570451995a',
            'deforestation': 'dataset-id-for-deforestation',
            'water-quality': 'dataset-id-for-water-quality',
            'climate-change': 'dataset-id-for-climate-change'
        };
        const datasetId = datasetMap[category];
        if (!datasetId) {
            throw new Error(`No dataset found for category: ${category}`);
        }
        const sql = `SELECT * FROM ${datasetId} LIMIT 100`;
        return this.queryData(datasetId, sql);
    }
    async getDatasetMetadata(datasetId) {
        try {
            const [dataset, layers] = await Promise.all([
                this.fetchDataset(datasetId),
                this.fetchLayer(datasetId)
            ]);
            return {
                dataset,
                layers,
                summary: {
                    name: dataset.name,
                    description: dataset.description,
                    layerCount: layers.length,
                    lastUpdated: new Date().toISOString()
                }
            };
        }
        catch (error) {
            console.error(`Error fetching metadata for dataset ${datasetId}:`, error);
            throw new Error(`Failed to fetch metadata: ${error}`);
        }
    }
    async searchDatasets(query) {
        try {
            const response = await axios.get(`${this.baseUrl}/v1/dataset`, {
                params: {
                    env: 'production',
                    application: 'rw',
                    language: 'en',
                    search: query,
                    'page[size]': '50'
                },
                timeout: 10000
            });
            return response.data;
        }
        catch (error) {
            console.error(`Error searching datasets for query "${query}":`, error);
            throw new Error(`Failed to search datasets: ${error}`);
        }
    }
    async getRealTimeData(datasetId, limit = 10) {
        try {
            const sql = `SELECT * FROM ${datasetId} ORDER BY timestamp DESC LIMIT ${limit}`;
            return this.queryData(datasetId, sql);
        }
        catch (error) {
            console.error(`Error fetching real-time data for dataset ${datasetId}:`, error);
            throw new Error(`Failed to fetch real-time data: ${error}`);
        }
    }
}
