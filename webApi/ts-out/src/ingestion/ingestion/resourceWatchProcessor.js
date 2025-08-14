import { ResourceWatchService } from '../services/resourceWatchService.js';
import { PsRagDocumentVectorStore } from '@policysynth/agents/rag/vectorstore/ragDocument.js';
import { PsRagChunkVectorStore } from '@policysynth/agents/rag/vectorstore/ragChunk.js';
export class ResourceWatchDataProcessor {
    constructor() {
        this.resourceWatchService = new ResourceWatchService();
        this.documentVectorStore = new PsRagDocumentVectorStore();
        this.chunkVectorStore = new PsRagChunkVectorStore();
    }
    async processEnvironmentalData() {
        console.log('Processing Resource Watch environmental data...');
        // Process air quality data
        await this.processAirQualityData();
        // Process other environmental datasets
        await this.processOtherEnvironmentalData();
    }
    async processAirQualityData() {
        try {
            console.log('Processing air quality data...');
            const airQualityData = await this.resourceWatchService.getAirQualityData();
            // Create document entry
            const documentId = await this.documentVectorStore.addDocument({
                title: 'Air Quality: Nitrogen Dioxide (NO₂) Satellite Measurement',
                content: JSON.stringify(airQualityData),
                url: 'https://resourcewatch.org/data/explore/Air-Quality-Nitrogen-Dioxide-NO2-Satellite-Measurement',
                contentType: 'resourcewatch-air-quality',
                allReferencesWithUrls: JSON.stringify([{
                        url: 'https://resourcewatch.org/data/explore/Air-Quality-Nitrogen-Dioxide-NO2-Satellite-Measurement',
                        title: 'Resource Watch Air Quality Data'
                    }])
            });
            // Process data into chunks
            const chunks = this.createDataChunks(airQualityData, 'air-quality', documentId);
            // Add chunks to vector store
            for (const chunk of chunks) {
                await this.chunkVectorStore.addChunk(chunk);
            }
            console.log(`Processed ${chunks.length} air quality data chunks`);
        }
        catch (error) {
            console.error('Error processing air quality data:', error);
        }
    }
    async processOtherEnvironmentalData() {
        const categories = ['deforestation', 'water-quality', 'climate-change'];
        for (const category of categories) {
            try {
                console.log(`Processing ${category} data...`);
                const data = await this.resourceWatchService.getEnvironmentalData(category);
                const documentId = await this.documentVectorStore.addDocument({
                    title: `${category.charAt(0).toUpperCase() + category.slice(1)} Environmental Data`,
                    content: JSON.stringify(data),
                    url: `https://resourcewatch.org/data/explore/${category}`,
                    contentType: `resourcewatch-${category}`,
                    allReferencesWithUrls: JSON.stringify([{
                            url: `https://resourcewatch.org/data/explore/${category}`,
                            title: `Resource Watch ${category} Data`
                        }])
                });
                const chunks = this.createDataChunks(data, category, documentId);
                for (const chunk of chunks) {
                    await this.chunkVectorStore.addChunk(chunk);
                }
                console.log(`Processed ${chunks.length} ${category} data chunks`);
            }
            catch (error) {
                console.error(`Error processing ${category} data:`, error);
            }
        }
    }
    createDataChunks(data, category, documentId) {
        const chunks = [];
        if (data.data && Array.isArray(data.data)) {
            // Process array data
            data.data.forEach((item, index) => {
                const chunk = {
                    id: `${documentId}-chunk-${index}`,
                    content: this.formatDataContent(item, category),
                    metadata: {
                        datasetId: documentId,
                        datasetName: `${category} environmental data`,
                        dataType: category,
                        location: item.geometry?.coordinates || item.location,
                        timestamp: item.timestamp || item.date,
                        value: item.value || item.no2_value,
                        unit: this.getUnitForCategory(category)
                    },
                    source: 'resourcewatch'
                };
                chunks.push(chunk);
            });
        }
        else {
            // Process single data object
            const chunk = {
                id: `${documentId}-chunk-0`,
                content: this.formatDataContent(data, category),
                metadata: {
                    datasetId: documentId,
                    datasetName: `${category} environmental data`,
                    dataType: category,
                    timestamp: new Date().toISOString()
                },
                source: 'resourcewatch'
            };
            chunks.push(chunk);
        }
        return chunks;
    }
    formatDataContent(data, category) {
        switch (category) {
            case 'air-quality':
                return `Air Quality Data: Nitrogen Dioxide (NO₂) concentration measurement. 
                Value: ${data.value || data.no2_value} ${this.getUnitForCategory(category)}. 
                Location: ${data.geometry?.coordinates || 'Global'}. 
                Timestamp: ${data.timestamp || data.date || 'Recent'}.`;
            case 'deforestation':
                return `Deforestation Data: Forest cover change measurement. 
                Area affected: ${data.area || data.forest_loss} hectares. 
                Location: ${data.geometry?.coordinates || 'Global'}. 
                Period: ${data.timestamp || data.date || 'Recent'}.`;
            case 'water-quality':
                return `Water Quality Data: Water quality measurement. 
                Parameter: ${data.parameter || 'Water quality index'}. 
                Value: ${data.value} ${this.getUnitForCategory(category)}. 
                Location: ${data.geometry?.coordinates || 'Global'}.`;
            case 'climate-change':
                return `Climate Change Data: Climate measurement. 
                Temperature change: ${data.temperature_change || data.value}°C. 
                Location: ${data.geometry?.coordinates || 'Global'}. 
                Period: ${data.timestamp || data.date || 'Recent'}.`;
            default:
                return `Environmental Data: ${JSON.stringify(data)}`;
        }
    }
    getUnitForCategory(category) {
        const units = {
            'air-quality': 'mol/m²',
            'deforestation': 'hectares',
            'water-quality': 'index',
            'climate-change': '°C'
        };
        return units[category] || 'units';
    }
    async processSpecificDataset(datasetId, category) {
        try {
            console.log(`Processing specific dataset ${datasetId} for category ${category}...`);
            // Get dataset metadata
            const metadata = await this.resourceWatchService.getDatasetMetadata(datasetId);
            // Get actual data
            const data = await this.resourceWatchService.getRealTimeData(datasetId, 100);
            // Create document entry
            const documentId = await this.documentVectorStore.addDocument({
                title: metadata.dataset.name || `${category} Environmental Data`,
                content: JSON.stringify(data),
                url: `https://resourcewatch.org/data/explore/${datasetId}`,
                contentType: `resourcewatch-${category}`,
                allReferencesWithUrls: JSON.stringify([{
                        url: `https://resourcewatch.org/data/explore/${datasetId}`,
                        title: metadata.dataset.name || `Resource Watch ${category} Data`
                    }])
            });
            // Process data into chunks
            const chunks = this.createDataChunks(data, category, documentId);
            // Add chunks to vector store
            for (const chunk of chunks) {
                await this.chunkVectorStore.addChunk(chunk);
            }
            console.log(`Processed ${chunks.length} chunks for dataset ${datasetId}`);
        }
        catch (error) {
            console.error(`Error processing dataset ${datasetId}:`, error);
        }
    }
    async updateEnvironmentalData() {
        console.log('Updating Resource Watch environmental data...');
        // This method can be called periodically to update the data
        await this.processEnvironmentalData();
    }
}
