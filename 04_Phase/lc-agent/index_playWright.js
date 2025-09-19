// index_playwright.js
import dotenv from "dotenv";
dotenv.config();

import { PlaywrightWebBaseLoader } from "@langchain/community/document_loaders/web/playwright";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Loads a JS-rendered page, extracts text, chunks it into pieces,
 * then calls Gemini for a concise summary of each chunk and a final combined summary.
 */

function chunkText(text, maxChars = 4000) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + maxChars);
    // try to break at nearest newline/space backwards
    if (end < text.length) {
      const br = text.lastIndexOf("\n", end);
      const sp = text.lastIndexOf(" ", end);
      const cut = Math.max(br, sp);
      if (cut > start) end = cut;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks;
}

async function summarizeUrlPlaywright(url) {
  console.log("Loading (Playwright):", url);
  const loader = new PlaywrightWebBaseLoader(url, {
    // options: you can set { waitUntil: "networkidle" } etc.
  });

  const docs = await loader.load(); // Document[] with pageContent
  const text = docs.map(d => d.pageContent).join("\n\n");
  console.log("Extracted characters:", text.length);

  // chunk to avoid huge prompt
  const chunks = chunkText(text, 3000); // adjust 3000 as safe chunk size
  console.log("Chunks:", chunks.length);

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.0,
    maxOutputTokens: 1024,
  });

  // Summarize each chunk
  const chunkSummaries = [];
  for (let i = 0; i < chunks.length; i++) {
    const prompt = `Summarize the most important points from the following text in 4 bullet points:\n\n${chunks[i]}`;
    const resp = await model.invoke([
      { role: "system", content: "You are a concise assistant." },
      { role: "user", content: prompt }
    ]);
    const content = resp.content ?? (resp.toString ? resp.toString() : String(resp));
    console.log(`--- chunk ${i+1} summary ---`);
    console.log(content);
    chunkSummaries.push(content);
  }

  // Combine chunk summaries into final summary
  const combined = chunkSummaries.join("\n\n");
  const finalPrompt = `Combine and condense these chunk summaries into 6 concise bullet points with no filler:\n\n${combined}`;
  const finalResp = await model.invoke([
    { role: "system", content: "You are a concise assistant." },
    { role: "user", content: finalPrompt }
  ]);
  console.log("\n===== FINAL SUMMARY =====\n");
  console.log(finalResp.content ?? finalResp.toString());
  console.log("\n=========================\n");
}

// Replace with any JS-heavy page
const TEST_URL = "https://quotes.toscrape.com/js/"; 
await summarizeUrlPlaywright(TEST_URL);
