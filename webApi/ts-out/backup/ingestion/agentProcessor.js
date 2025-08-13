import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import fetch from "node-fetch";
import puppeteer from "puppeteer-extra";
import { PsConstants } from "@policysynth/agents/constants.js";
import { IngestionAgentProcessor } from "@policysynth/agents/rag/ingestion/processor.js";
import { DocumentCleanupAgent } from "@policysynth/agents/rag/ingestion/docCleanup.js";
import { DocumentTreeSplitAgent } from "@policysynth/agents/rag/ingestion/docTreeSplitter.js";
import { IngestionChunkCompressorAgent } from "@policysynth/agents/rag/ingestion/chunkCompressorAgent.js";
import { DocumentAnalyzerAgent } from "@policysynth/agents/rag/ingestion/docAnalyzer.js";
import { IngestionChunkAnalzyerAgent } from "@policysynth/agents/rag/ingestion/chunkAnalyzer.js";
import { IngestionChunkRanker } from "@policysynth/agents/rag/ingestion/chunkRanker.js";
export class WebResearchIngestionProcessor extends IngestionAgentProcessor {
    constructor(dataLayoutPath = "./src/ingestion/dataLayout.json") {
        super();
        this.cachedFiles = [];
        this.fileMetadataPath = "./src/ingestion/cache/fileMetadata.json";
        this.fileMetadata = {};
        this.initialFileMetadata = {};
        this.aggregateChunkData = (chunks) => {
            return chunks.reduce((acc, chunk) => {
                const chunkData = chunk.chunkData || "";
                const subChunkData = chunk.subChunks
                    ? this.aggregateChunkData(chunk.subChunks)
                    : "";
                return acc + chunkData + subChunkData;
            }, "");
        };
        this.dataLayoutPath = dataLayoutPath;
        this.loadFileMetadata()
            .then(() => {
            console.log("Metadata loaded");
        })
            .catch((err) => {
            console.error("Failed to load file metadata:", err);
        });
        this.cleanupAgent = new DocumentCleanupAgent();
        this.splitAgent = new DocumentTreeSplitAgent();
        this.chunkCompressor = new IngestionChunkCompressorAgent();
        this.docAnalysisAgent = new DocumentAnalyzerAgent();
        this.chunkAnalysisAgent = new IngestionChunkAnalzyerAgent();
    }
    async processDataLayout() {
        await this.loadFileMetadata(); // Load existing metadata to compare against
        this.dataLayout = await this.readDataLayout();
        this.initialFileMetadata = JSON.parse(JSON.stringify(this.fileMetadata)); // Deep copy for initial state comparison
        const downloadContent = true;
        if (downloadContent) {
            const browser = await puppeteer.launch({
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            });
            try {
                this.logger.debug("Launching browser");
                const browserPage = await browser.newPage();
                browserPage.setDefaultTimeout(PsConstants.webPageNavTimeout);
                browserPage.setDefaultNavigationTimeout(PsConstants.webPageNavTimeout);
                await browserPage.setUserAgent(PsConstants.currentUserAgent);
                await this.downloadAndCache(this.dataLayout.documentUrls, false, browserPage);
                await this.saveFileMetadata();
                const disableJsonUrls = true;
                if (!disableJsonUrls) {
                    await this.processJsonUrls(this.dataLayout.jsonUrls, browserPage);
                    await this.saveFileMetadata();
                }
            }
            catch (error) {
                console.error("Failed to process data layout:", error);
            }
            finally {
                await browser.close();
            }
        }
        await this.processAllCachedFiles();
    }
    async processAllCachedFiles() {
        console.log(`Processing ${this.cachedFiles.length} cached files`);
        for (const filePath of this.cachedFiles) {
            try {
                await this.processCachedFile(filePath);
            }
            catch (error) {
                console.error(`Failed to process file ${filePath}:`, error);
            }
        }
    }
    async processCachedFile(filePath) {
        console.log(`Processing cached file: ${filePath}`);
        const fileContent = await fs.readFile(filePath, "utf-8");
        const fileMetadata = this.fileMetadata[filePath];
        if (!fileMetadata) {
            console.error(`No metadata found for file: ${filePath}`);
            return;
        }
        // Step 1: Document Analysis (following template approach)
        this.logger.debug("Step 1: Document Analysis");
        const fileId = path.basename(filePath);
        const docAnalysisResponse = await this.docAnalysisAgent.analyze(fileId, fileContent, this.fileMetadata);
        console.log(`Document analysis completed: ${docAnalysisResponse.title}`);
        // Step 2: Document Cleanup
        this.logger.debug("Step 2: Document Cleanup");
        const cleanedContent = await this.cleanupAgent.clean(fileContent);
        console.log(`Document cleanup completed. Original length: ${fileContent.length}, Cleaned length: ${cleanedContent.length}`);
        // Step 3: Process file using template's approach
        await this.processFilePartTree(fileId, cleanedContent, "TBD");
    }
    async processFilePartTree(fileId, cleanedUpData, weaviateDocumentId) {
        console.log(`Processing file part for fileId: ${fileId}`);
        this.fileMetadata[fileId].cleanedDocument = cleanedUpData;
        await this.saveFileMetadata();
        const metadata = this.fileMetadata[fileId] || {};
        let rechunk = false;
        if (rechunk || !metadata.chunks || metadata.chunks.length === 0) {
            metadata.chunks = [];
            console.log(`Creating tree chunks for fileId: ${fileId}`);
            await this.createTreeChunks(metadata, cleanedUpData);
        }
        else {
            console.log(`Chunks already exist for fileId: ${fileId}`);
        }
        await this.saveFileMetadata();
        const reRank = false;
        if (reRank || metadata.chunks[0].eloRating === undefined) {
            console.log("in rerank", metadata.chunks[0]);
            await this.rankChunks(metadata);
            await this.saveFileMetadata();
        }
    }
    async readDataLayout() {
        try {
            const dataLayoutContent = await fs.readFile(this.dataLayoutPath, "utf-8");
            return JSON.parse(dataLayoutContent);
        }
        catch (error) {
            console.error("Failed to read data layout:", error);
            // Return default data layout
            return {
                documentUrls: [],
                jsonUrls: [],
                categories: ["General"],
                aboutProject: "Web Research Tool RAG System"
            };
        }
    }
    async loadFileMetadata() {
        try {
            const metadataContent = await fs.readFile(this.fileMetadataPath, "utf-8");
            this.fileMetadata = JSON.parse(metadataContent);
        }
        catch (error) {
            console.log("No existing metadata found, starting fresh");
            this.fileMetadata = {};
        }
    }
    async saveFileMetadata() {
        try {
            await fs.writeFile(this.fileMetadataPath, JSON.stringify(this.fileMetadata, null, 2));
        }
        catch (error) {
            console.error("Failed to save file metadata:", error);
        }
    }
    async downloadAndCache(urls, forceDownload = false, browserPage) {
        for (const url of urls) {
            try {
                await this.downloadAndCacheUrl(url, forceDownload, browserPage);
            }
            catch (error) {
                console.error(`Failed to download ${url}:`, error);
            }
        }
    }
    async downloadAndCacheUrl(url, forceDownload = false, browserPage) {
        const urlHash = createHash("md5").update(url).digest("hex");
        const cacheDir = "./src/ingestion/cache";
        const filePath = path.join(cacheDir, `${urlHash}.txt`);
        // Check if file already exists and we're not forcing download
        if (!forceDownload && this.fileMetadata[filePath]) {
            console.log(`File already cached: ${url}`);
            this.cachedFiles.push(filePath);
            return;
        }
        console.log(`Downloading: ${url}`);
        try {
            let content = "";
            let contentType = "";
            if (url.includes("youtube.com") || url.includes("youtu.be")) {
                // Handle YouTube URLs
                content = await this.extractYouTubeContent(url);
                contentType = "video/transcript";
            }
            else {
                // Handle regular web pages
                const response = await browserPage.goto(url, { waitUntil: "networkidle0" });
                if (!response) {
                    throw new Error("Failed to load page");
                }
                content = await browserPage.evaluate(() => {
                    return globalThis.document?.body?.innerText || '';
                });
                contentType = response.headers()["content-type"] || "text/html";
            }
            // Ensure cache directory exists
            await fs.mkdir(cacheDir, { recursive: true });
            // Save content to file
            await fs.writeFile(filePath, content);
            // Update metadata
            this.fileMetadata[filePath] = {
                key: filePath,
                url: url,
                lastModified: new Date().toISOString(),
                lastModifiedOnServer: new Date().toISOString(),
                hash: createHash("md5").update(content).digest("hex"),
                fileId: path.basename(filePath),
                title: "",
                description: "",
                shortDescription: "",
                fullDescriptionOfAllContents: "",
                compressedFullDescriptionOfAllContents: "",
                contentType: contentType,
                primaryCategory: "",
                secondaryCategory: "",
                documentDate: new Date().toISOString(),
                relevanceEloRating: 0,
                substanceEloRating: 0,
                qualityEloRating: 0,
                allReferencesWithUrls: "[]",
                allOtherReferences: "[]",
                allImageUrls: "[]",
                documentMetaData: {},
                size: content.length
            };
            this.cachedFiles.push(filePath);
            console.log(`Successfully cached: ${url}`);
        }
        catch (error) {
            console.error(`Failed to download ${url}:`, error);
        }
    }
    async extractYouTubeContent(url) {
        // Placeholder for YouTube content extraction
        // In a real implementation, you would use a YouTube API or service
        return `YouTube video content from: ${url}\n\nThis is a placeholder for YouTube content extraction.`;
    }
    async processJsonUrls(jsonUrls, browserPage) {
        for (const url of jsonUrls) {
            try {
                await this.processJsonUrl(url, browserPage);
            }
            catch (error) {
                console.error(`Failed to process JSON URL ${url}:`, error);
            }
        }
    }
    async processJsonUrl(url, browserPage) {
        console.log(`Processing JSON URL: ${url}`);
        try {
            const response = await fetch(url);
            const jsonData = await response.json();
            // Convert JSON to text content
            const content = JSON.stringify(jsonData, null, 2);
            const urlHash = createHash("md5").update(url).digest("hex");
            const cacheDir = "./src/ingestion/cache";
            const filePath = path.join(cacheDir, `${urlHash}.json`);
            // Ensure cache directory exists
            await fs.mkdir(cacheDir, { recursive: true });
            // Save content to file
            await fs.writeFile(filePath, content);
            // Update metadata
            this.fileMetadata[filePath] = {
                key: filePath,
                url: url,
                lastModified: new Date().toISOString(),
                lastModifiedOnServer: new Date().toISOString(),
                hash: createHash("md5").update(content).digest("hex"),
                fileId: path.basename(filePath),
                title: "",
                description: "",
                shortDescription: "",
                fullDescriptionOfAllContents: "",
                compressedFullDescriptionOfAllContents: "",
                contentType: "application/json",
                primaryCategory: "",
                secondaryCategory: "",
                documentDate: new Date().toISOString(),
                relevanceEloRating: 0,
                substanceEloRating: 0,
                qualityEloRating: 0,
                allReferencesWithUrls: "[]",
                allOtherReferences: "[]",
                allImageUrls: "[]",
                documentMetaData: {},
                size: content.length
            };
            this.cachedFiles.push(filePath);
            console.log(`Successfully processed JSON: ${url}`);
        }
        catch (error) {
            console.error(`Failed to process JSON URL ${url}:`, error);
        }
    }
    async createTreeChunks(metadata, cleanedUpData) {
        let chunks;
        if (!metadata.cachedChunkStrategy) {
            chunks = (await this.splitAgent.splitDocumentIntoChunks(cleanedUpData));
            metadata.cachedChunkStrategy = chunks;
            await this.saveFileMetadata();
        }
        else {
            chunks = metadata.cachedChunkStrategy;
        }
        console.log(JSON.stringify(chunks, null, 2));
        console.log(`Split into ${chunks.length} chunks`);
        let masterChunkIndex = 0;
        const processChunk = async (chunk, parentChunk = undefined) => {
            let hasAggregatedChunkData = false;
            if (!chunk.chunkData && chunk.subChunks) {
                chunk.chunkData = this.aggregateChunkData([chunk]);
                hasAggregatedChunkData = true;
            }
            if (chunk.chunkData) {
                let chunkAnalyzeResponse = await this.chunkAnalysisAgent.analyze(chunk.chunkData);
                console.log(`\n\nAnalyzed chunk: ${JSON.stringify(chunkAnalyzeResponse)}`);
                if (!hasAggregatedChunkData) {
                    console.log(`\nBefore compression:\n${chunk.chunkData}\n`);
                    chunkAnalyzeResponse.fullCompressedContent =
                        await this.chunkCompressor.compress(chunk.chunkData);
                    console.log(`\nAfter compression:\n${chunkAnalyzeResponse.fullCompressedContent}\n\n`);
                }
                const chunkMetadata = {
                    chunkIndex: masterChunkIndex++,
                    chapterIndex: chunk.chapterIndex,
                    title: chunkAnalyzeResponse.title,
                    mainExternalUrlFound: chunkAnalyzeResponse.mainExternalUrlFound,
                    importantContextChunkIndexes: chunk.importantContextChapterIndexes,
                    shortSummary: chunkAnalyzeResponse.shortDescription,
                    fullSummary: chunkAnalyzeResponse.fullDescription,
                    compressedContent: chunkAnalyzeResponse.fullCompressedContent,
                    metaData: chunkAnalyzeResponse.textMetaData,
                    uncompressedContent: chunk.chunkData,
                    subChunks: [],
                };
                if (parentChunk === undefined) {
                    metadata.chunks.push(chunkMetadata);
                }
                else if (parentChunk) {
                    if (!parentChunk.subChunks) {
                        parentChunk.subChunks = [];
                    }
                    parentChunk.subChunks.push(chunkMetadata);
                }
                if (chunk.subChunks && chunk.subChunks.length > 0) {
                    for (let subChunk of chunk.subChunks) {
                        await processChunk(subChunk, chunkMetadata);
                    }
                }
            }
        };
        for (let chunk of chunks) {
            await processChunk(chunk);
        }
    }
    async rankChunks(metadata) {
        const ranker = new IngestionChunkRanker();
        const flattenedChunks = metadata.chunks.reduce((acc, chunk) => acc.concat(chunk, chunk.subChunks || []), []);
        console.log("Ranking by relevance");
        const relevanceRules = "Rank the two chunks based on the relevance to the document";
        await ranker.rankDocumentChunks(flattenedChunks, relevanceRules, metadata.compressedFullDescriptionOfAllContents, "relevanceEloRating");
        console.log("Ranking by substance");
        const substanceRules = "Rank the two chunks based substance and completeness of the information";
        await ranker.rankDocumentChunks(flattenedChunks, substanceRules, metadata.compressedFullDescriptionOfAllContents, "substanceEloRating");
        console.log("Ranking by quality");
        const qualityRules = "Rank the two chunks based on quality of the information";
        await ranker.rankDocumentChunks(flattenedChunks, qualityRules, metadata.compressedFullDescriptionOfAllContents, "qualityEloRating");
    }
}
