import { createAgent } from "langchain";
import { AzureChatOpenAI } from "@langchain/openai"
import { MemorySaver } from "@langchain/langgraph";
import { drinksAgent, foodAgent, getWeather, venueAgent } from "./tools.js"
import systemPrompt from "./system_prompt.js"
import * as z from "zod";

const checkpointer = new MemorySaver();
const model = new AzureChatOpenAI({temperature: 0.2});


const myToolResponse = z.object({
message: z.string().describe("The message to the user"),
toolsUsed: z.array(z.string()).describe("List with names of tools used for the last prompt")
});

const agent = createAgent({
    model,
    tools: [getWeather, venueAgent, foodAgent, drinksAgent],
    responseFormat: myToolResponse,
    checkpointer,
    systemPrompt: systemPrompt
});
export async function callAgent(prompt, userid) {
    const result = await agent.invoke(
        { messages: [{ role: "user", content: prompt }] },
        { configurable: { thread_id: userid } }
    );

    // Loop door alle berichten en zoek tool-antwoorden met een "source" veld
    const sourcesSearched = [];
    for (const msg of result.messages ?? []) {
        if (msg.type === "tool" || msg._getType?.() === "tool") {
            try {
                const parsed = JSON.parse(msg.content);
                if (parsed.source && !sourcesSearched.includes(parsed.source)) {
                    sourcesSearched.push(parsed.source);
                }
            } catch {
            }
        }
    }

    return {
        ...result.structuredResponse,
        sourcesSearched,
    };
}