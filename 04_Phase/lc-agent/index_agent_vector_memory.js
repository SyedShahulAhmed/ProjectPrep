// index_agent_vector_memory.js
import dotenv from "dotenv";
dotenv.config();

import fs from "fs/promises";
import path from "path";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fetchUrlPlain } from "./tool_url.js";
import { retrieveRelevant, buildIndex } from "./vector_memory.js"; // from your TF-IDF file

const MEMORY_FILE = path.resolve("./memory.json");
const GEMINI_MODEL = "gemini-2.5-flash"; // as requested

// load memory helper (same shape as before)
async function loadMemory() {
  try {
    const raw = await fs.readFile(MEMORY_FILE, "utf8");
    const json = JSON.parse(raw);
    if (Array.isArray(json)) return json;
    return [];
  } catch (e) {
    return [];
  }
}
async function saveMemoryEntry(entry) {
  const mem = await loadMemory();
  mem.push(entry);
  await fs.writeFile(MEMORY_FILE, JSON.stringify(mem, null, 2), "utf8");
}

const model = new ChatGoogleGenerativeAI({
  model: GEMINI_MODEL,
  temperature: 0.0,
  maxOutputTokens: 1024,
});

// Format hits into a compact context block
function hitsToContext(hits) {
  if (!hits || hits.length === 0) return "None";
  return hits
    .map(
      (h, i) =>
        `Memory #${i + 1} (score=${h.score.toFixed(3)}):\nUser: ${h.user}\nAssistant: ${h.assistant}`
    )
    .join("\n\n");
}

// ReAct-style JSON-action loop but with vector retrieval injected
async function runAgent(userQuestion, topK = 3) {
  // Ensure index is up-to-date (rebuild if vectors.json missing)
  await buildIndex().catch(() => {}); // safe: rebuilds index from memory.json

  // Retrieve top-k relevant memories
  const hits = await retrieveRelevant(userQuestion, topK);
  const relevantContext = hitsToContext(hits);

  const systemMsg = {
    role: "system",
    content:
      "You are an agent that may call a tool named `fetch-url` to fetch webpage text. " +
      "You have access to the following RELEVANT MEMORY (most relevant first). Use it when helpful. " +
      "When you decide what to do next, respond ONLY with a JSON object and NOTHING else. " +
      "FORMAT: {\"action\":\"fetch-url\"|\"final\",\"input\":\"<url or answer>\"}.\n\n" +
      "RELEVANT MEMORY:\n" +
      relevantContext +
      "\n\nExamples:\n" +
      `{"action":"fetch-url","input":"https://quotes.toscrape.com/js/"}\n` +
      `{"action":"final","input":"The page summary is: ..."}\n` +
      "Don't include extra commentary outside the JSON.",
  };

  const messages = [systemMsg, { role: "user", content: userQuestion }];

  const MAX_STEPS = 8;
  for (let step = 0; step < MAX_STEPS; step++) {
    const resp = await model.invoke(messages);
    const reply = resp.content ?? (resp.toString ? resp.toString() : String(resp));
    console.log(`\n[Model step ${step + 1} reply]\n`, reply, "\n");

    // parse JSON out of reply
    try {
      const start = reply.indexOf("{");
      const end = reply.lastIndexOf("}");
      const jsonText = start !== -1 && end !== -1 && end > start ? reply.slice(start, end + 1) : null;
      if (!jsonText) throw new Error("No JSON found in model reply.");

      const parsed = JSON.parse(jsonText);
      if (parsed.action === "fetch-url") {
        const url = parsed.input;
        console.log(`Agent decided to fetch: ${url}\nCalling fetchUrlPlain...`);
        const toolOutput = await fetchUrlPlain(url);
        messages.push({
          role: "assistant",
          content: `Observation from fetch-url for ${url}:\n${toolOutput}`,
        });
        continue;
      } else if (parsed.action === "final") {
        const finalAnswer = parsed.input;
        console.log("\n===== AGENT FINISHED =====\n", finalAnswer, "\n=========================\n");

        // Persist to memory and rebuild index so future queries include this
        const entry = { ts: Date.now(), user: userQuestion, assistant: finalAnswer };
        await saveMemoryEntry(entry);
        console.log("Saved to memory.json");

        // Rebuild the TF-IDF index to include the new memory item
        await buildIndex();
        console.log("Rebuilt vectors.json with new memory.");

        return finalAnswer;
      } else {
        messages.push({
          role: "assistant",
          content: "ERROR: unknown action. Please reply only with the JSON format.",
        });
      }
    } catch (err) {
      console.warn("Failed to parse JSON from model reply. Pushing raw reply back for clarification.");
      messages.push({ role: "assistant", content: `MODEL_REPLY (unparsed):\n${reply}` });
    }
  }

  const timeoutMsg = "Agent stopped after max steps without returning a final answer.";
  console.warn(timeoutMsg);
  return timeoutMsg;
}

// Example usage:
const question = "Please fetch https://quotes.toscrape.com/js/ and give me 6 concise bullet points; use any relevant memory.";
await runAgent(question, 3);
