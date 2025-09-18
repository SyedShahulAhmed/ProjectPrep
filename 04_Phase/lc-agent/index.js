import dotenv from "dotenv";
dotenv.config();
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

async function summarizeUrl(url) {
  console.log("Loding :", url);
  const loader = new CheerioWebBaseLoader(url);
  const docs = await loader.load();
  const text = docs.map((d) => d.pageContent).join("\n\n");
  const model = new ChatGoogleGenerativeAI({
    model: "Gemini 1.5 Pro",
    temperature: 0.0,
    maxOutputTokens: 1024,
  });
  const prompt = `Summarize the important points of this webpage in 6 bullet points:\n\n${text}`;
  const res = await model.invoke([
    {
      role: "system",
      content: "You are a concise assistant",
    },
    {
      role: "user",
      content: prompt,
    },
  ]);
  console.log("\n===== GEMINI SUMMARY =====\n");
  console.log(res.content);
  console.log("\n==========================\n");
}
const URL = "https://en.wikipedia.org/wiki/Node.js"
await summarizeUrl(URL)