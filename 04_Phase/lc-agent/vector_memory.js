// vector_memory.js
// Lightweight vector memory using TF-IDF + cosine similarity (no external services).
// - Reads memory.json (array of {ts, user, assistant})
// - Builds an index (vocab + doc vectors) and saves to vectors.json
// - retrieveRelevant(query, k) returns top-k memory entries with scores
// - Example usage at bottom shows how to inject into an agent prompt

import fs from "fs/promises";
import path from "path";
import natural from "natural";

const MEMORY_FILE = path.resolve("./memory.json");
const VECTORS_FILE = path.resolve("./vectors.json");

// --- helpers: tokenize / normalize ---
function tokenize(text) {
  // Very simple tokenizer: lower, split on non-word, remove short tokens
  return String(text || "")
    .toLowerCase()
    .split(/\W+/)
    .filter(Boolean)
    .filter((t) => t.length > 1);
}

// --- Build index from memory.json ---
export async function buildIndex({ persist = true, minDocFreq = 1 } = {}) {
  // load memory.json
  let mem = [];
  try {
    const raw = await fs.readFile(MEMORY_FILE, "utf8");
    mem = JSON.parse(raw);
    if (!Array.isArray(mem)) mem = [];
  } catch (e) {
    console.warn("No memory.json found or parse error — building empty index.");
    mem = [];
  }

  // create array of doc texts (we'll combine user+assistant for embedding)
  const docs = mem.map((e) => `${e.user}\n\n${e.assistant}`);

  // Build vocabulary and document term frequencies
  const termDocFreq = new Map(); // term -> doc frequency (df)
  const docsTokens = docs.map((text) => {
    const toks = tokenize(text);
    const seen = new Set();
    for (const t of toks) {
      if (!seen.has(t)) {
        termDocFreq.set(t, (termDocFreq.get(t) || 0) + 1);
        seen.add(t);
      }
    }
    return toks;
  });

  // Filter low-frequency terms
  const vocab = Array.from(termDocFreq.keys()).filter((t) => termDocFreq.get(t) >= minDocFreq);

  // Optionally limit vocab size for speed (uncomment to limit)
  // const MAX_VOCAB = 5000;
  // vocab.sort((a,b) => termDocFreq.get(b)-termDocFreq.get(a));
  // const finalVocab = vocab.slice(0, MAX_VOCAB);

  const finalVocab = vocab;
  const vocabIndex = Object.fromEntries(finalVocab.map((t, i) => [t, i]));

  // compute IDF
  const N = docs.length;
  const idf = new Array(finalVocab.length).fill(0);
  for (let i = 0; i < finalVocab.length; i++) {
    const t = finalVocab[i];
    const df = termDocFreq.get(t) || 0;
    // add smoothing
    idf[i] = Math.log((N + 1) / (df + 1)) + 1;
  }

  // compute TF-IDF vectors (dense arrays)
  const vectors = docsTokens.map((toks, docIdx) => {
    const tf = new Array(finalVocab.length).fill(0);
    for (const t of toks) {
      const idx = vocabIndex[t];
      if (idx !== undefined) tf[idx] += 1;
    }
    // convert TF -> TF (raw) * IDF
    const vec = tf.map((v, i) => v * idf[i]);
    // normalize vector (L2)
    const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
    for (let i = 0; i < vec.length; i++) vec[i] = vec[i] / norm;
    return vec;
  });

  const index = {
    createdAt: Date.now(),
    meta: {
      docCount: N,
      vocabSize: finalVocab.length,
    },
    vocab: finalVocab,
    idf,
    docs: mem.map((e, i) => ({
      id: i,
      ts: e.ts,
      user: e.user,
      assistant: e.assistant,
      // store vector as Float32Array-like array
      vector: vectors[i] || new Array(finalVocab.length).fill(0),
    })),
  };

  if (persist) {
    await fs.writeFile(VECTORS_FILE, JSON.stringify(index, null, 2), "utf8");
  }

  return index;
}

// --- Load existing index (or build if missing) ---
export async function loadIndex() {
  try {
    const raw = await fs.readFile(VECTORS_FILE, "utf8");
    const idx = JSON.parse(raw);
    return idx;
  } catch (e) {
    // rebuild if missing
    return await buildIndex();
  }
}

// --- Cosine similarity ---
function cosine(a, b) {
  // assume a and b are same length arrays
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1e-10;
  return dot / denom;
}

// --- Convert query -> TF-IDF vector based on index vocab & idf ---
export function queryToVector(query, index) {
  const toks = tokenize(query);
  const vec = new Array(index.vocab.length).fill(0);
  const vocabIndex = Object.fromEntries(index.vocab.map((t, i) => [t, i]));
  for (const t of toks) {
    const idx = vocabIndex[t];
    if (idx !== undefined) vec[idx] += 1;
  }
  // multiply by idf
  for (let i = 0; i < vec.length; i++) vec[i] = vec[i] * (index.idf[i] || 1);
  // normalize
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  for (let i = 0; i < vec.length; i++) vec[i] = vec[i] / norm;
  return vec;
}

// --- Retrieve top-k relevant docs for a query ---
export async function retrieveRelevant(query, k = 3) {
  const index = await loadIndex();
  if (!index || !index.docs || index.docs.length === 0) return [];

  const qvec = queryToVector(query, index);
  const scored = index.docs.map((d) => {
    const score = cosine(qvec, d.vector || []);
    return { score, doc: d };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, k).filter(s => s.score > 0);
  return top.map((s) => ({ score: s.score, id: s.doc.id, ts: s.doc.ts, user: s.doc.user, assistant: s.doc.assistant }));
}

// --- Simple CLI / example usage ---
// Run buildIndex() to (re)create vectors.json from memory.json.
// Use retrieveRelevant(query, k) to get top matches.
async function exampleRun() {
  console.log("Building index from memory.json ...");
  const idx = await buildIndex();
  console.log("Index built. docCount:", idx.meta.docCount, "vocabSize:", idx.meta.vocabSize);
  const query = "quotes about thinking and world"; // example
  console.log("\nRetrieving relevant memory for query:", query);
  const hits = await retrieveRelevant(query, 4);
  console.log("Top hits:");
  for (const h of hits) {
    console.log(`- score=${h.score.toFixed(3)} ts=${new Date(h.ts).toLocaleString()}`);
    console.log("  user:", h.user);
    console.log("  assistant:", (h.assistant || "").slice(0, 200).replace(/\n/g, " ") + (h.assistant.length>200 ? " ...": ""));
  }
}


// If run directly: build index and show sample retrieval
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleRun().catch((e) => {
    console.error("Error in exampleRun:", e);
  });
}
