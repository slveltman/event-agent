import { tool } from "langchain";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { AzureOpenAIEmbeddings } from "@langchain/openai";

// De map waar de vectordatabase is opgeslagen (aangemaakt door create.js)
const VECTOR_STORE_DIR = "./vectorstores/event-planner-faiss";

// We laden de database één keer en bewaren hem hier
let vectorStore = null;

async function getVectorStore() {
    // Als de database al geladen is, gebruik die gewoon opnieuw
    if (vectorStore) return vectorStore;

    // Laad de embeddings (zelfde als in create.js, nodig om te kunnen zoeken)
    const embeddings = new AzureOpenAIEmbeddings({
        azureOpenAIApiEmbeddingsDeploymentName:
            process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME ||
            process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME,
    });

    // Laad de opgeslagen FAISS database van schijf
    vectorStore = await FaissStore.load(VECTOR_STORE_DIR, embeddings);
    return vectorStore;
}

async function zoekInDatabase(zoekterm, domein) {
    const store = await getVectorStore();

    // Zoek de 4 meest relevante stukken tekst voor deze zoekterm,
    // maar alleen uit het opgegeven domein (venue, food of drinks)
    const resultaten = await store.similaritySearch(
        zoekterm,
        4,
        (doc) => doc.metadata.domain === domein
    );

    return resultaten;
}

// ─── WEATHER TOOL (ongewijzigd) ────────────────────────────────────────────

export const getWeather = tool(
    async ({ city = "Rotterdam" } = {}) => {
        const apiKey = process.env.OPENWEATHER_API_KEY;
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&lang=nl&appid=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        const temp = data?.main?.temp ?? "onbekend";
        return `In ${city} is het ${temp}°C.`;
    },
    {
        name: "get_weather",
        description: "Get the weather for a given city (defaults to Rotterdam when not provided)",
        schema: {
            type: "object",
            properties: {
                city: { type: "string" },
            },
            required: [],
        },
    },
);

// ─── VENUE TOOL ────────────────────────────────────────────────────────────

export const venueAgent = tool(
    async ({ query }) => {
        // Zoek in de vectordatabase, alleen in documenten met domein "venue"
        const resultaten = await zoekInDatabase(query, "venue");

        // Haal de tekst uit elk resultaat en plak ze samen
        const context = resultaten.map((r) => r.pageContent).join("\n\n");

        // Geef de gevonden tekst terug aan de agent
        return JSON.stringify({
            source: "prijslijst_zaalverhuur.txt",
            context,
        });
    },
    {
        name: "venue_agent",
        description: "Zoekt in de vectordatabase naar zalen en locaties voor een evenement.",
        schema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Zoekterm, bijv. 'binnenlocatie voor 60 gasten'",
                },
            },
            required: ["query"],
        },
    },
);

// ─── FOOD TOOL ─────────────────────────────────────────────────────────────

export const foodAgent = tool(
    async ({ query }) => {
        // Zoek in de vectordatabase, alleen in documenten met domein "food"
        const resultaten = await zoekInDatabase(query, "food");

        const context = resultaten.map((r) => r.pageContent).join("\n\n");

        return JSON.stringify({
            source: "prijslijst_eten.txt",
            context,
        });
    },
    {
        name: "food_agent",
        description: "Zoekt in de vectordatabase naar eetpakketten en cateringopties.",
        schema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Zoekterm, bijv. 'buffet voor bruiloft onder 30 euro per persoon'",
                },
            },
            required: ["query"],
        },
    },
);

// ─── DRINKS TOOL ───────────────────────────────────────────────────────────

export const drinksAgent = tool(
    async ({ query }) => {
        // Zoek in de vectordatabase, alleen in documenten met domein "drinks"
        const resultaten = await zoekInDatabase(query, "drinks");

        const context = resultaten.map((r) => r.pageContent).join("\n\n");

        return JSON.stringify({
            source: "prijslijst_dranken.txt",
            context,
        });
    },
    {
        name: "drinks_agent",
        description: "Zoekt in de vectordatabase naar drankpakketten.",
        schema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Zoekterm, bijv. 'open bar voor verjaardag'",
                },
            },
            required: ["query"],
        },
    },
);
