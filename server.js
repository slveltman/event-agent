import express from "express"
import { callAgent } from "./agent.js"

const app = express()
app.use(express.json())
app.use(express.static("public"))

// De documenten die de agent mag gebruiken
const VERWACHTE_BRONNEN = [
    "prijslijst_zaalverhuur.txt",
    "prijslijst_eten.txt",
    "prijslijst_dranken.txt",
];

// De tools die de agent mag aanroepen
const VERWACHTE_TOOLS = ["venue_agent", "food_agent", "drinks_agent", "get_weather"];

app.post('/api/chat', async(req, res) => {
    const { message, userid } = req.body
    console.log(`\nUser ${userid}: ${message}`);

    const response = await callAgent(message, userid)

    // Rij 1 Gevorderd: check welke documenten de agent heeft doorzocht
    for (const source of response.sourcesSearched ?? []) {
        if (VERWACHTE_BRONNEN.includes(source)) {
            console.log(`[✅ correct document] ${source}`);
        } else {
            console.log(`[⚠️ onverwacht document] ${source}`);
        }
    }

    // Rij 2 Gevorderd: check of de aangeroepen tools kloppen
    for (const tool of response.toolsUsed ?? []) {
        if (VERWACHTE_TOOLS.includes(tool)) {
            console.log(`[✅ correcte tool] ${tool}`);
        } else {
            console.log(`[⚠️ onverwachte tool] ${tool}`);
        }
    }

    res.json(response)
})

app.listen(3000, ()=> console.log("started on localhost:3000"))