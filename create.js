
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

const files = [
    { path: "./data/prijslijst_zaalverhuur.txt", domain: "venue" },
    { path: "./data/prijslijst_eten.txt", domain: "food" },
    { path: "./data/prijslijst_dranken.txt", domain: "drinks" },
];

const outputDir = "./vectorstores/event-planner-faiss";

async function main() {
    const docs = [];

    for (const file of files) {
        const loader = new TextLoader(file.path);
        const loaded = await loader.load();

        for (const doc of loaded) {
            docs.push({
                ...doc,
                metadata: {
                    ...doc.metadata,
                    domain: file.domain,
                    source: file.path,
                },
            });
        }
    }

    const deploymentName =
        process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME ||
        process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME;

    if (!deploymentName) {
        throw new Error("Set AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME in .env");
    }

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 600,
        chunkOverlap: 120,
    });

    const chunks = await textSplitter.splitDocuments(docs);
    console.log(`Loaded ${docs.length} documents and created ${chunks.length} chunks.`);

    const embeddings = new AzureOpenAIEmbeddings({
        azureOpenAIApiEmbeddingsDeploymentName: deploymentName,
    });

    const vectorStore = await FaissStore.fromDocuments(chunks, embeddings);
    await vectorStore.save(outputDir);

    console.log(`Saved FAISS index to ${outputDir}`);

    const testQuery = process.argv.slice(2).join(" ") || "Ik zoek een betaalbare binnenlocatie voor 60 gasten.";
    const hits = await vectorStore.similaritySearch(testQuery, 3);

    console.log("\nTop 3 retrieval hits:");
    for (const [index, hit] of hits.entries()) {
        const shortText = hit.pageContent.replace(/\s+/g, " ").slice(0, 180);
        console.log(`\n${index + 1}. domain=${hit.metadata?.domain} source=${hit.metadata?.source}`);
        console.log(shortText + "...");
    }
}

main().catch((error) => {
    console.error("Failed to create FAISS vector store:", error);
    process.exit(1);
});