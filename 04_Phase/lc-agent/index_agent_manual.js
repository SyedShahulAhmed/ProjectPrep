// index_agent_manual.js
import dotenv from "dotenv";
dotenv.config();

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fetchUrlPlain } from "./tool_url.js"; // from Option A you used

/**
 * Mini ReAct loop:
 * - Ask Gemini what to do.
 * - Gemini must reply with JSON: { "action": "fetch-url"|"final", "input": "<url or answer>" }
 * - If action == "fetch-url", we call fetchUrlPlain(input) and append the content to the conversation.
 * - Repeat until action == "final" OR max steps reached.
 */

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.0,
  maxOutputTokens: 1024,
});

function baseSystemMessage() {
  return {
    role: "system",
    content:
      "You are an agent that may call a tool named `fetch-url` to fetch webpage text. " +
      "When you decide, respond ONLY with a JSON object and NOTHING else. Format: " +
      `{"action":"fetch-url"|"final","input":"<url or final answer>"}.\n` +
      "Examples:\n" +
      `{"action":"fetch-url","input":"https://quotes.toscrape.com/js/"}\n` +
      `{"action":"final","input":"The page summary is: ..."}\n` +
      "Don't include extra commentary outside the JSON.",
  };
}

async function runAgent(userQuestion) {
  // conversation history for the model (array of messages)
  const messages = [baseSystemMessage(), { role: "user", content: userQuestion }];

  const MAX_STEPS = 6;
  for (let step = 0; step < MAX_STEPS; step++) {
    // ask the model
    const resp = await model.invoke(messages);
    // model.invoke may return an object like { content } or a string
    const reply = resp.content ?? (resp.toString ? resp.toString() : String(resp));
    console.log(`\n[Model step ${step + 1} reply]\n`, reply);

    // try to parse JSON from the reply (robust: find the first {...})
    let jsonText = null;
    try {
      const start = reply.indexOf("{");
      const end = reply.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) jsonText = reply.slice(start, end + 1);
      const parsed = JSON.parse(jsonText);
      if (parsed.action === "fetch-url") {
        const url = parsed.input;
        console.log(`\nAgent decided to fetch: ${url}\nCalling fetchUrlPlain...`);
        const toolOutput = await fetchUrlPlain(url);
        // add tool output into messages as an observation
        messages.push({ role: "assistant", content: `Observation from fetch-url for ${url}:\n${toolOutput}` });
        // ask the model again to continue (no extra user message)
        continue;
      } else if (parsed.action === "final") {
        const finalAnswer = parsed.input;
        console.log("\n===== AGENT FINISHED =====\n", finalAnswer, "\n=========================\n");
        return finalAnswer;
      } else {
        // unknown action
        messages.push({ role: "assistant", content: "Error: unknown action in JSON." });
      }
    } catch (err) {
      // parsing failed — push the raw model reply back so it can correct itself
      console.warn("Failed to parse JSON from model reply. Pushing reply back for clarification.");
      messages.push({ role: "assistant", content: `MODEL_REPLY (unparsed):\n${reply}` });
    }
  }

  const timeoutMsg = "Agent stopped after max steps without returning a final answer.";
  console.warn(timeoutMsg);
  return timeoutMsg;
}

// Example usage:
const userQuestion = "Please fetch the page at https://quotes.toscrape.com/js/ and give me 6 concise bullet points of the main ideas.";
await runAgent(userQuestion);
