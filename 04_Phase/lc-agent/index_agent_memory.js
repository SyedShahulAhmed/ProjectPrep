// index_agent_memory.js
import dotenv from "dotenv";
dotenv.config();

import fs from "fs/promises";
import path from "path";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fetchUrlPlain } from "./tool_url.js"; // your existing plain fetch function

const MEMORY_FILE = path.resolve("./memory.json");
const GEMINI_MODEL = "gemini-2.5-flash"; // using gemini-2.5-flash as requested

// Helper: load memory from disk (if exists), return array of { user, assistant, ts }
async function loadMemory() {
  try {
    const raw = await fs.readFile(MEMORY_FILE, "utf8");
    const json = JSON.parse(raw);
    if (Array.isArray(json)) return json;
    return [];
  } catch (e) {
    // file missing or parse error -> start fresh
    return [];
  }
}

// Helper: append an entry to memory and persist
async function saveMemoryEntry(entry) {
  const mem = await loadMemory();
  mem.push(entry);
  await fs.writeFile(MEMORY_FILE, JSON.stringify(mem, null, 2), "utf8");
}

// Format memory as a short context string for model injection
function memoryToContext(memArray, maxEntries = 6) {
  // take last N entries
  const last = memArray.slice(-maxEntries);
  return last
    .map(
      (e, i) =>
        `Memory #${i + 1} (${new Date(e.ts).toISOString()}):\nUser: ${e.user}\nAssistant: ${e.assistant}`
    )
    .join("\n\n");
}

// Model
const model = new ChatGoogleGenerativeAI({
  model: GEMINI_MODEL,
  temperature: 0.0,
  maxOutputTokens: 1024,
});

/**
 * Mini ReAct loop with persistent memory:
 * - Loads memory.json and injects into system prompt as "Relevant memory"
 * - Model replies with JSON action {action, input}
 * - If fetch-url, we call fetchUrlPlain and append an Observation message and loop
 * - If final, we persist (userQuestion + finalAnswer) into memory.json
 */
async function runAgentWithMemory(userQuestion) {
  // load memory and convert to short context
  const mem = await loadMemory();
  const memContext = mem.length ? memoryToContext(mem) : "None";

  // base system instructs about tool + memory presence
  const systemMsg = {
    role: "system",
    content:
      "You are an agent that may call a tool named `fetch-url` to fetch webpage text. " +
      "You have access to RELEVANT MEMORY below. Use it when helpful. " +
      "When you decide what to do next, respond ONLY with a JSON object and NOTHING else. " +
      "FORMAT: {\"action\":\"fetch-url\"|\"final\",\"input\":\"<url or answer>\"}.\n\n" +
      "RELEVANT MEMORY (most recent first):\n" +
      memContext +
      "\n\nExamples:\n" +
      `{"action":"fetch-url","input":"https://quotes.toscrape.com/js/"}\n` +
      `{"action":"final","input":"The page summary is: ..."}\n` +
      "Don't include extra commentary outside the JSON.",
  };

  // messages start with system and user's question
  const messages = [systemMsg, { role: "user", content: userQuestion }];

  const MAX_STEPS = 8;
  for (let step = 0; step < MAX_STEPS; step++) {
    const resp = await model.invoke(messages);
    const reply = resp.content ?? (resp.toString ? resp.toString() : String(resp));
    console.log(`\n[Model step ${step + 1} reply]\n`, reply, "\n");

    // parse JSON out of reply (robust extraction)
    let jsonText = null;
    try {
      const start = reply.indexOf("{");
      const end = reply.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) jsonText = reply.slice(start, end + 1);
      const parsed = JSON.parse(jsonText);

      if (parsed.action === "fetch-url") {
        const url = parsed.input;
        console.log(`Agent decided to fetch: ${url}\nCalling fetchUrlPlain...`);
        const toolOutput = await fetchUrlPlain(url);

        // Add the observation to messages so model can use it next loop
        messages.push({
          role: "assistant",
          content: `Observation from fetch-url for ${url}:\n${toolOutput}`,
        });

        // continue loop so model gets the observation
        continue;
      } else if (parsed.action === "final") {
        const finalAnswer = parsed.input;
        console.log("\n===== AGENT FINISHED =====\n", finalAnswer, "\n=========================\n");

        // Persist to memory: save question + final answer + timestamp
        const entry = { ts: Date.now(), user: userQuestion, assistant: finalAnswer };
        await saveMemoryEntry(entry);
        console.log("Saved to memory.json");

        return finalAnswer;
      } else {
        // unknown action — tell the model and continue
        messages.push({ role: "assistant", content: "ERROR: unknown action. Please only reply with the JSON format." });
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
const userQuestion = "Please fetch https://quotes.toscrape.com/js/ and give me 6 concise bullet points. Then remember this for later.";
await runAgentWithMemory(userQuestion);
