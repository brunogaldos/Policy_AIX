import { PsBaseChatBot } from "@policysynth/api/base/chat/baseChatBot.js";
import { SearchQueriesRanker } from "@policysynth/agents/webResearch/searchQueriesRanker.js";
import { SearchQueriesGenerator } from "@policysynth/agents/webResearch/searchQueriesGenerator.js";
import { ResearchWeb } from "@policysynth/agents/webResearch/researchWeb.js";
import { SearchResultsRanker } from "@policysynth/agents/webResearch/searchResultsRanker.js";
import { WebPageScanner } from "@policysynth/agents/webResearch/webPageScanner.js";
import { promises as fs } from "fs";
export class LiveResearchChatBot extends PsBaseChatBot {
    constructor(wsClientId, wsClients, memoryId) {
        console.log("Inside PsBaseChatBot constructor:");
        console.log("wsClientId:", wsClientId);
        console.log("wsClients Map keys:", Array.from(wsClients.keys()));
        super(wsClientId, wsClients, memoryId);
        this.numberOfQueriesToGenerate = 7;
        this.percentOfQueriesToSearch = 0.25;
        this.percentOfResultsToScan = 0.25;
        this.persistMemory = true;
        this.summarySystemPrompt = `Please analyse those sources step by step and provide a summary of the most relevant information.
    Provide links to the original webpages, if they are relevant, in markdown format as citations.
    Based on the RAG (retrieval-augmented generation) information available, provide as many relevant links as possible to support your analysis and claims.
  `;
        // For directing the LLMs to focus on the most relevant parts of each web page
        this.jsonWebPageResearchSchema = `
    //MOST IMPORTANT INSTRUCTIONS: Act as a policy research assistant. From the query, identify laws, barriers, and investment opportunities in the area that affect sustainable policies for the common good, providing insights useful for decision-makers.
    {
      potentialSourcesOfInformationAboutBarriersToSkillsFirstPolicies: string[],
      potentialDescriptionOfBarriersToSkillsFirstPolicies: string[],
      summary: string,
      howThisIsRelevant: string,
      relevanceScore: number
    }
  `;
        this.researchConversation = async (chatLog, numberOfSelectQueries, percentOfTopQueriesToSearch, percentOfTopResultsToScan) => {
            this.numberOfQueriesToGenerate = numberOfSelectQueries;
            this.percentOfQueriesToSearch = percentOfTopQueriesToSearch;
            this.percentOfResultsToScan = percentOfTopResultsToScan;
            this.setChatLog(chatLog);
            console.log("In LIVE RESEARH conversation");
            let messages = chatLog.map((message) => {
                return {
                    role: message.sender,
                    content: message.message,
                };
            });
            console.log(`messages: ${JSON.stringify(messages, null, 2)}`);
            if (messages.length === 1) {
                this.doLiveResearch(messages[0].content);
            }
            else {
                this.startBroadcastingLiveCosts();
                const systemMessage = {
                    role: "system",
                    content: this.renderFollowupSystemPrompt(),
                };
                messages.unshift(systemMessage);
                try {
                    const stream = await this.openaiClient.chat.completions.create({
                        model: "gpt-4-0125-preview",
                        messages,
                        max_tokens: 4000,
                        temperature: 0.7,
                        stream: true,
                    });
                    await this.streamWebSocketResponses(stream);
                }
                catch (err) {
                    console.error(`Error in doLiveResearch: ${err}`);
                }
                finally {
                    this.stopBroadcastingLiveCosts();
                }
            }
        };
    }
    renderFollowupSystemPrompt() {
        return `You are an expert energy-transition policy advisor supporting the Governor of a city.  
Your task is to use the provided database together with information retrieved via RAG (retrieval-augmented generation) to produce:
(1) a concise executive answer tailored to the user's query, and
(2) an extensive, evidence-based report with a final district/neighborhood ranking for intervention and investment.

IMPORTANT: You MUST access and utilize the RAG research data that was previously gathered and stored in memory. This includes web research results, scanned web pages, and analyzed content. Do not rely solely on the chat conversation - actively reference the comprehensive research database that contains detailed information about districts, neighborhoods, infrastructure, and policy data.

GOAL
Rank neighborhoods by: accessPriority = w₁ × normalize(Need) + w₂ × normalize(Feasibility) + w₃ × normalize(Impact)  
Default weights (editable): w₁=0.5, w₂=0.3, w₃=0.2. If changed, state and justify.

CRITERIA (define each as a 0–1 score before normalization if needed)
Need (higher → higher need):
- Population density > 5,000 people/km²
- Night-lights per capita < 50 lux
- Household energy burden > 10% of income
- Grid access rate < 50%

Feasibility (higher → easier to implement):
- Distance to existing grid < 2 km
- Existing infrastructure coverage > 50%
- Presence of formal addresses
- Security score > 0.7 (0–1)

Impact (higher → bigger benefits):
- Can reach > 500 households
- Resource/technology potential > threshold (value provided in query or dataset)
- Clear co-benefits (e.g., improved health, reduced inequality, environmental gains)

NORMALIZATION & SCORING
- For each sub-indicator, compute a continuous 0–1 score using min–max scaling across the provided dataset (preferred).
  • If only thresholds are known, map to a ramp:
    – "Higher is better" → score = clamp((x − min)/(max − min), 0, 1)
    – "Lower is better" → score = 1 − clamp((x − min)/(max − min), 0, 1)
  • If a hard threshold T is given without clear bounds, use a soft ramp around T (e.g., 0 at T±20% depending on direction) and document assumptions.

- Cite all external claims with markdown links right after the relevant sentence (e.g., "… as established by XYZ [source]"). Prefer official/government, IFI, or peer-reviewed sources.

OUTPUT FORMAT (STRICT)
Start with a concise section (≤150 words) answering the user's query directly:
- "Top 5 priority neighborhoods" with rank #, accessPriority (0–1), and one-line justification each.

Then provide the full report with the following sections:

NOTE: Throughout your analysis, actively reference and cite specific data points, statistics, and findings from the RAG research database. Include relevant quotes, numbers, and insights from the web research to support your recommendations and rankings.

1) Methods & Assumptions  
2) Results — District Ranking Table (markdown table with scores, rank, bottleneck, quick win)  
3) Priority Portfolio (12–24 months, quick wins + high-impact builds)  
4) Policy, Finance & Delivery Enablers (with citations)  
5) Risk & Mitigation  
6) Sensitivity & Scenario Tests (with Need-heavy & Impact-heavy weight scenarios)  
7) Implementation Roadmap (sequenced actions and owners)  
8) Data Appendix (data dictionary, imputation notes, JSON export)

STYLE & QUALITY BAR
- Be precise and reproducible. Show key calculations and double-check arithmetic.  
- Use clear headings, bullet points, and markdown tables. Keep the executive section concise; keep the rest thorough.  
- Place citations immediately after claims they support.  
- If data are insufficient, deliver the best possible partial ranking and state what additional data unlocks a complete result.
- Use confident, recommendation-based language throughout. Avoid hypothetical language, tentative statements, or phrases like "might," "could," "would," or "if." Instead, provide direct, actionable recommendations and conclusions based on the available data and analysis.`;
    }
    async doLiveResearch(question) {
        try {
            this.startBroadcastingLiveCosts();
            console.log(`In doLiveResearch: ${question}`);
            console.log(`this.memory: ${JSON.stringify(this.memory, null, 2)}`);
            // Generate search queries
            this.sendAgentStart("Generate search queries");
            const searchQueriesGenerator = new SearchQueriesGenerator(
            //this.memory as PsSmarterCrowdsourcingMemoryData,
            this.memory, this.numberOfQueriesToGenerate, question);
            const searchQueries = await searchQueriesGenerator.generateSearchQueries();
            this.sendAgentCompleted(`Generated ${searchQueries.length} search queries`);
            // Rank search queries
            this.sendAgentStart("Pairwise Ranking Search Queries");
            const searchQueriesRanker = new SearchQueriesRanker(
            //this.memory as PsSmarterCrowdsourcingMemoryData,
            this.memory, this.sendAgentUpdate.bind(this));
            const rankedSearchQueries = await searchQueriesRanker.rankSearchQueries(searchQueries, question, searchQueries.length * 10);
            this.sendAgentCompleted("Pairwise Ranking Completed");
            const queriesToSearch = rankedSearchQueries.slice(0, Math.floor(rankedSearchQueries.length * this.percentOfQueriesToSearch));
            // Note: Removed hardcoded "New Jersey" filter to make research more general
            // queriesToSearch can now be used as-is without location filtering
            // Search the web
            this.sendAgentStart("Searching the Web...");
            //const webSearch = new ResearchWeb(this.memory as PsSmarterCrowdsourcingMemoryData);
            const webSearch = new ResearchWeb(this.memory);
            const searchResults = await webSearch.search(queriesToSearch);
            this.sendAgentCompleted(`Found ${searchResults.length} Web Pages`);
            // Rank search results
            this.sendAgentStart("Pairwise Ranking Search Results");
            const searchResultsRanker = new SearchResultsRanker(
            //this.memory as PsSmarterCrowdsourcingMemoryData,
            this.memory, this.sendAgentUpdate.bind(this));
            const rankedSearchResults = await searchResultsRanker.rankSearchResults(searchResults, question, searchResults.length * 10);
            this.sendAgentCompleted("Pairwise Ranking Completed");
            const searchResultsToScan = rankedSearchResults.slice(0, Math.floor(rankedSearchResults.length * this.percentOfResultsToScan));
            // Scan and Research Web pages
            this.sendAgentStart("Scan and Research Web pages");
            const webPageResearch = new WebPageScanner(this.memory
            //this.memory as PsSmarterCrowdsourcingMemoryData
            );
            const webScan = await webPageResearch.scan(searchResultsToScan.map((i) => i.url), this.jsonWebPageResearchSchema, undefined, this.sendAgentUpdate.bind(this));
            this.sendAgentCompleted("Website Scanning Completed", true);
            console.log(`webScan: (${webScan.length}) ${JSON.stringify(webScan, null, 2)}`);
            // Create a webScan.json filename with a timestamp
            const timestamp = new Date().toISOString().replace(/:/g, "-");
            try {
                await fs.writeFile(`/tmp/webScan_${timestamp}.json`, JSON.stringify(webScan, null, 2));
                console.log("webScan.json has been saved to /tmp directory.");
            }
            catch (err) {
                console.error(`Error saving webScan.json: ${err}`);
            }
            await this.renderResultsToUser(webScan, question);
        }
        catch (err) {
            console.error(`Error in doLiveResearch: ${err}`);
        }
        finally {
            this.stopBroadcastingLiveCosts();
        }
    }
    async renderResultsToUser(research, question) {
        const summaryUserPrompt = `
      Research Question: ${question}

      Results from the web research:
      ${JSON.stringify(research, null, 2)}
    `;
        this.addToExternalSolutionsMemoryCosts(summaryUserPrompt + this.summarySystemPrompt, "in");
        const messages = [
            {
                role: "system",
                content: this.summarySystemPrompt,
            },
            {
                role: "user",
                content: summaryUserPrompt,
            },
        ];
        const stream = await this.openaiClient.chat.completions.create({
            model: "gpt-4-0125-preview",
            messages,
            max_tokens: 4000,
            temperature: 0.45,
            stream: true,
        });
        await this.streamWebSocketResponses(stream);
    }
}
