import { buildIndex, retrieveRelevant } from "./vector_memory.js";

await buildIndex(); // rebuild vectors.json

const hits = await retrieveRelevant("quotes about world", 3);
console.log("Hits:", hits);
