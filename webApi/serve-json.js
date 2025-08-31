#!/usr/bin/env node

import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;

const server = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
        if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/nighttime-lights-district-data-index.csv') {
        try {
            const filePath = path.join(__dirname, 'src/ingestion/generated/nighttime-lights-district-data-index.csv');
            const data = await fs.readFile(filePath, 'utf-8');
            
            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': 'inline',
                'Content-Length': Buffer.byteLength(data)
            });
            res.end(data);
        } catch (error) {
            console.error('Error reading nighttime-lights-district-data-index.csv:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read file' }));
        }
    } else if (req.url === '/solar-energy-district-data-index.csv') {
        try {
            const filePath = path.join(__dirname, 'src/ingestion/generated/solar-energy-district-data-index.csv');
            const data = await fs.readFile(filePath, 'utf-8');
            
            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': 'inline',
                'Content-Length': Buffer.byteLength(data)
            });
            res.end(data);
        } catch (error) {
            console.error('Error reading solar-energy-district-data-index.csv:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read file' }));
        }
    } else if (req.url === '/solar-installations-detailed.csv') {
        try {
            const filePath = path.join(__dirname, 'src/ingestion/generated/solar-installations-detailed.csv');
            const data = await fs.readFile(filePath, 'utf-8');
            
            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': 'inline',
                'Content-Length': Buffer.byteLength(data)
            });
            res.end(data);
        } catch (error) {
            console.error('Error reading solar-installations-detailed.csv:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read file' }));
        }
    } else if (req.url === '/population_density_arequipa_censo2025.csv') {
        try {
            const filePath = path.join(__dirname, 'src/ingestion/generated/population_density_arequipa_censo2025.csv');
            const data = await fs.readFile(filePath, 'utf-8');
            
            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': 'inline',
                'Content-Length': Buffer.byteLength(data)
            });
            res.end(data);
        } catch (error) {
            console.error('Error reading population_density_arequipa_censo2025.csv:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read file' }));
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Data server running on http://localhost:${PORT}`);
    console.log(`📊 Serving district data at:`);
    console.log(`   • http://localhost:${PORT}/nighttime-lights-district-data-index.csv`);
    console.log(`   • http://localhost:${PORT}/solar-energy-district-data-index.csv`);
    console.log(`   • http://localhost:${PORT}/solar-installations-detailed.csv`);
    console.log(`   • http://localhost:${PORT}/population_density_arequipa_censo2025.csv`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
