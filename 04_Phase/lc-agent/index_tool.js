// index_tool.js
import dotenv from "dotenv";
dotenv.config();

import { fetchUrlPlain } from "./tool_url.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

async function runToolExample() {
  // optional: show we can still create the model if you want LLM later
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
  });

  // Call the simple fetch function (no Tool wrapper)
  const content = await fetchUrlPlain("https://quotes.toscrape.com/js/");
  console.log("\n===== TOOL OUTPUT (URL fetcher) =====\n");
  console.log(content.slice(0, 800) + (content.length > 800 ? "\n\n...TRUNCATED\n" : "\n"));
}

await runToolExample();
