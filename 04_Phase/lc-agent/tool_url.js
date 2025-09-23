// tool_url.js  (simple export)
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

export async function fetchUrlPlain(url) {
  try {
    const loader = new CheerioWebBaseLoader(url);
    const docs = await loader.load();
    // join and return a limited preview to keep responses small
    return docs.map(d => d.pageContent).join("\n\n").slice(0, 5000);
  } catch (err) {
    return `Error fetching: ${err.message || String(err)}`;
  }
}
