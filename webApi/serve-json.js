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

    if (req.url === '/city-data-index.txt') {
        try {
            const filePath = path.join(__dirname, 'src/ingestion/generated/city-data-index.txt');
            const data = await fs.readFile(filePath, 'utf-8');
            
            res.writeHead(200, {
                'Content-Type': 'text/plain',
                'Content-Length': Buffer.byteLength(data)
            });
            res.end(data);
        } catch (error) {
            console.error('Error reading city-data-index.txt:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read file' }));
        }
    } else if (req.url === '/city-data-index.csv') {
        try {
            const filePath = path.join(__dirname, 'src/ingestion/generated/city-data-index.csv');
            const data = await fs.readFile(filePath, 'utf-8');
            
            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': 'inline',
                'Content-Length': Buffer.byteLength(data)
            });
            res.end(data);
        } catch (error) {
            console.error('Error reading city-data-index.csv:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read file' }));
        }
    } else if (req.url.startsWith('/cities/')) {
        try {
            const cityName = req.url.split('/cities/')[1];
            const filePath = path.join(__dirname, 'src/ingestion/generated/cities', cityName);
            const data = await fs.readFile(filePath, 'utf-8');
            
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            });
            res.end(data);
        } catch (error) {
            console.error('Error reading city file:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read city file' }));
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Data server running on http://localhost:${PORT}`);
    console.log(`📊 Serving city data at http://localhost:${PORT}/city-data-index.csv`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
