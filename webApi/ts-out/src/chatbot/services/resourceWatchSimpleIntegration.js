import { ResourceWatchService } from './resourceWatchService.js';
export class ResourceWatchSimpleIntegration {
    constructor() {
        this.resourceWatchService = new ResourceWatchService();
    }
    async getEnvironmentalContext(question) {
        try {
            // Check if the question is related to environmental factors
            const environmentalKeywords = [
                'air quality', 'pollution', 'environment', 'climate', 'emissions',
                'sustainability', 'green', 'environmental', 'atmospheric', 'air',
                'weather', 'temperature', 'humidity', 'wind', 'precipitation'
            ];
            const isEnvironmentalQuestion = environmentalKeywords.some(keyword => question.toLowerCase().includes(keyword));
            if (!isEnvironmentalQuestion) {
                return null;
            }
            // Determine which environmental data to fetch based on the question
            if (question.toLowerCase().includes('air quality') || question.toLowerCase().includes('pollution')) {
                return await this.getAirQualityContext();
            }
            if (question.toLowerCase().includes('climate') || question.toLowerCase().includes('temperature')) {
                return await this.getClimateContext();
            }
            if (question.toLowerCase().includes('deforestation') || question.toLowerCase().includes('forest')) {
                return await this.getDeforestationContext();
            }
            if (question.toLowerCase().includes('water') || question.toLowerCase().includes('water quality')) {
                return await this.getWaterQualityContext();
            }
            // Default to air quality if environmental but not specific
            return await this.getAirQualityContext();
        }
        catch (error) {
            console.error('Error getting environmental context:', error);
            return null;
        }
    }
    async getAirQualityContext() {
        const data = await this.resourceWatchService.getAirQualityData();
        let summary = 'Current air quality data unavailable';
        if (data.data && data.data.length > 0) {
            const latestData = data.data[0];
            summary = `Current air quality data: Nitrogen Dioxide (NO₂) concentration measurements from satellite data. Latest measurement shows ${latestData.value || latestData.no2_value || 'data available'} mol/m². This data can inform environmental policy decisions and workplace health considerations.`;
        }
        return {
            category: 'air-quality',
            data: data,
            timestamp: new Date().toISOString(),
            source: 'resourcewatch',
            summary: summary
        };
    }
    async getClimateContext() {
        try {
            const data = await this.resourceWatchService.getEnvironmentalData('climate-change');
            let summary = 'Current climate data unavailable';
            if (data.data && data.data.length > 0) {
                const latestData = data.data[0];
                summary = `Current climate data: Temperature change measurements show ${latestData.temperature_change || latestData.value || 'data available'}°C. This data can inform climate adaptation strategies and policy development.`;
            }
            return {
                category: 'climate-change',
                data: data,
                timestamp: new Date().toISOString(),
                source: 'resourcewatch',
                summary: summary
            };
        }
        catch (error) {
            // Fallback to air quality if climate data is not available
            return await this.getAirQualityContext();
        }
    }
    async getDeforestationContext() {
        try {
            const data = await this.resourceWatchService.getEnvironmentalData('deforestation');
            let summary = 'Current deforestation data unavailable';
            if (data.data && data.data.length > 0) {
                const latestData = data.data[0];
                summary = `Current deforestation data: Forest cover change measurements show ${latestData.area || latestData.forest_loss || 'data available'} hectares affected. This data can inform land use policies and environmental protection strategies.`;
            }
            return {
                category: 'deforestation',
                data: data,
                timestamp: new Date().toISOString(),
                source: 'resourcewatch',
                summary: summary
            };
        }
        catch (error) {
            // Fallback to air quality if deforestation data is not available
            return await this.getAirQualityContext();
        }
    }
    async getWaterQualityContext() {
        try {
            const data = await this.resourceWatchService.getEnvironmentalData('water-quality');
            let summary = 'Current water quality data unavailable';
            if (data.data && data.data.length > 0) {
                const latestData = data.data[0];
                summary = `Current water quality data: Water quality measurements show ${latestData.value || 'data available'} index. This data can inform water management policies and environmental health considerations.`;
            }
            return {
                category: 'water-quality',
                data: data,
                timestamp: new Date().toISOString(),
                source: 'resourcewatch',
                summary: summary
            };
        }
        catch (error) {
            // Fallback to air quality if water quality data is not available
            return await this.getAirQualityContext();
        }
    }
    async enrichQuestionWithEnvironmentalData(question) {
        const environmentalContext = await this.getEnvironmentalContext(question);
        if (!environmentalContext) {
            return question; // Return original question if not environmental
        }
        // Enhance the question with environmental context
        const enrichedQuestion = `${question}

Environmental Context: ${environmentalContext.summary}

Please consider this environmental data when providing your response about skills development and workforce training.`;
        return enrichedQuestion;
    }
    async getAvailableEnvironmentalData() {
        const categories = ['air-quality', 'climate-change', 'deforestation', 'water-quality'];
        const results = [];
        for (const category of categories) {
            try {
                let data;
                switch (category) {
                    case 'air-quality':
                        data = await this.getAirQualityContext();
                        break;
                    case 'climate-change':
                        data = await this.getClimateContext();
                        break;
                    case 'deforestation':
                        data = await this.getDeforestationContext();
                        break;
                    case 'water-quality':
                        data = await this.getWaterQualityContext();
                        break;
                    default:
                        continue;
                }
                results.push(data);
            }
            catch (error) {
                console.error(`Error fetching ${category} data:`, error);
            }
        }
        return results;
    }
}
