// index_compare.js
import dotenv from "dotenv";
dotenv.config();

import { PlaywrightWebBaseLoader } from "@langchain/community/document_loaders/web/playwright";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Compare two summarization strategies:
 *  - Stuff: send the whole extracted text (or large slice) into one prompt.
 *  - Map-Reduce: chunk -> summarize each chunk -> combine -> final summary.
 *
 * Usage: set TEST_URL below and run: node index_compare.js
 */

const TEST_URL = "https://quotes.toscrape.com/js/"; // replace if you want

// --- helpers ---
function chunkTextByChars(text, maxChars = 3000) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + maxChars);
    if (end < text.length) {
      const br = text.lastIndexOf("\n", end);
      const sp = text.lastIndexOf(" ", end);
      const cut = Math.max(br, sp);
      if (cut > start) end = cut;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

function shortLogHeader(title) {
  console.log("\n" + "═".repeat(8) + ` ${title} ` + "═".repeat(8) + "\n");
}

// --- Gemini model factory ---
function makeGeminiModel() {
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash", // change if needed
    temperature: 0.0,
    maxOutputTokens: 1024,
    // apiKey comes from env in the integration
  });
}

// --- Stuff strategy ---
async function summarizeStuff(model, text) {
  // if text is enormous, we cut to a safe prefix to avoid hitting provider limits.
  const SAFE_CHAR_LIMIT = 60_000; // adjust if your account allows more
  const inputText = text.length > SAFE_CHAR_LIMIT ? text.slice(0, SAFE_CHAR_LIMIT) + "\n\n[TRUNCATED]" : text;

  const system = { role: "system", content: "You are a concise summarizer." };
  const user = {
    role: "user",
    content:
      `STUFF STRATEGY — Summarize the important points of the following webpage into 6 concise bullet points. ` +
      `Keep each bullet short (1-2 sentences). Do not add extra commentary.\n\n` +
      inputText,
  };

  const resp = await model.invoke([system, user]);
  return resp.content ?? (resp.toString ? resp.toString() : String(resp));
}

// --- Map-Reduce strategy ---
async function summarizeMapReduce(model, text) {
  // 1) chunk
  const chunks = chunkTextByChars(text, 3000);
  // 2) summarize each chunk
  const chunkSummaries = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkPrompt = {
      role: "user",
      content:
        `MAP STEP — Summarize the most important points from the following excerpt in 4 short bullet points:\n\n` +
        chunks[i],
    };
    const resp = await model.invoke([{ role: "system", content: "You are a concise assistant." }, chunkPrompt]);
    const content = resp.content ?? (resp.toString ? resp.toString() : String(resp));
    chunkSummaries.push(`Chunk ${i + 1} summary:\n${content}`);
  }

  // 3) reduce: combine chunk summaries and produce final condensed summary
  const combined = chunkSummaries.join("\n\n");
  const reducePrompt = {
    role: "user",
    content:
      `REDUCE STEP — You are given several chunk summaries. Combine and condense them into 6 concise bullet points ` +
      `that capture the overall important points with no filler. Keep bullets tight (1 sentence each):\n\n` +
      combined,
  };
  const finalResp = await model.invoke([{ role: "system", content: "You are a concise summarizer." }, reducePrompt]);
  return finalResp.content ?? (finalResp.toString ? finalResp.toString() : String(finalResp));
}

// --- main runner ---
async function runCompare(url) {
  console.log("Loading page with Playwright:", url);
  const loader = new PlaywrightWebBaseLoader(url, { waitUntil: "networkidle" });
  const docs = await loader.load();
  const text = docs.map((d) => d.pageContent).join("\n\n");

  console.log("Extracted characters:", text.length);

  const model = makeGeminiModel();

  // Stuff
  shortLogHeader("STUFF STRATEGY (single prompt)");
  let stuffResult;
  try {
    stuffResult = await summarizeStuff(model, text);
    console.log(stuffResult);
  } catch (e) {
    console.error("Error running stuff strategy:", e);
    stuffResult = `ERROR: ${e.message || String(e)}`;
  }

  // Map-Reduce
  shortLogHeader("MAP-REDUCE STRATEGY (chunk -> summarize -> combine)");
  let mapReduceResult;
  try {
    mapReduceResult = await summarizeMapReduce(model, text);
    console.log(mapReduceResult);
  } catch (e) {
    console.error("Error running map-reduce strategy:", e);
    mapReduceResult = `ERROR: ${e.message || String(e)}`;
  }

  // Summary comparison block
  shortLogHeader("COMPARISON (STUFF vs MAP-REDUCE)");
  console.log("=== Stuff result (top) ===\n");
  console.log(stuffResult);
  console.log("\n=== Map-Reduce result (bottom) ===\n");
  console.log(mapReduceResult);
}

// run
await runCompare(TEST_URL);
