// leet_summarizer.js
// Usage: node leet_summarizer.js <leetcode_username>
// Example: node leet_summarizer.js tourist
//
// ESM file — ensure package.json has "type": "module"

import dotenv from "dotenv";
dotenv.config();

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const GEMINI_MODEL = "gemini-2.5-flash"; // per your request

// Basic GraphQL query to fetch matchedUser public info & recent AC submissions
// --- replace LC_QUERY with this ---
const LC_QUERY = `
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      realName
      countryName
      aboutMe
      school
      company
      starRating
    }
    submitStats {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
      totalSubmissionNum {
        difficulty
        count
        submissions
      }
    }
    contributions {
      points
    }
    badges {
      id
      displayName
    }
  }
  allQuestionsCount {
    difficulty
    count
  }
}
`;


/** fetch public LeetCode profile via GraphQL */
async function fetchLeetCodeProfile(username) {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ query: LC_QUERY, variables: { username } }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`LeetCode fetch failed: ${res.status} ${res.statusText}\n${txt}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors, null, 2)}`);
  }
  return json.data;
}

/** Build a compact textual representation to feed Gemini */
function buildPrompt(username, data) {
  const mu = data.matchedUser;
  if (!mu) return `No public profile for username: ${username}`;

  const parts = [];
  parts.push(`LeetCode profile summary for user: ${mu.username}`);
  if (mu.profile?.realName) parts.push(`Real name: ${mu.profile.realName}`);
  if (mu.profile?.countryName) parts.push(`Country: ${mu.profile.countryName}`);
  if (typeof mu.reputation !== "undefined") parts.push(`Reputation: ${mu.reputation}`);
  if (mu.contributions?.points) parts.push(`Contribution points: ${mu.contributions.points}`);
  if (mu.profile?.starRating) parts.push(`Star rating: ${mu.profile.starRating}`);

  // submission stats
  if (mu.submitStats?.acSubmissionNum) {
    parts.push("\nSolved counts by difficulty:");
    for (const row of mu.submitStats.acSubmissionNum) {
      parts.push(`- ${row.difficulty}: ${row.count}`);
    }
  }

  // all questions count
  if (data.allQuestionsCount) {
    parts.push("\nTotal problems in database by difficulty:");
    for (const row of data.allQuestionsCount) {
      parts.push(`- ${row.difficulty}: ${row.count}`);
    }
  }

  // recent accepted submissions (limit 20 in query)
  const recent = (mu.recentAcSubmissionList || []).slice(0, 20);
  if (recent.length) {
    parts.push(`\nRecent accepted problems (most recent first):`);
    for (const r of recent) {
      const ts = r.timestamp ? new Date(r.timestamp * 1000).toISOString() : "unknown";
      parts.push(`- ${r.title} (lang: ${r.lang || "unknown"}, solved at: ${ts})`);
    }
  }

  // badges
  if (mu.badges && mu.badges.length) {
    parts.push(`\nBadges: ${mu.badges.map(b => b.displayName || b.id).join(", ")}`);
  }

  // instructions for Gemini (tell it what to output)
  parts.push("\n\nINSTRUCTIONS FOR THE ASSISTANT:\n");
  parts.push(
    "You are a helpful assistant. Based on the profile information above, produce the following outputs:\n" +
      "1) A concise human-readable profile summary (3-6 sentences).\n" +
      "2) A list of the top 5 notable solved problems (choose those with varied topics or popularity) with 1-line notes each.\n" +
      "3) Recommend 5 problems (by difficulty and topic) the user should practice next to improve (explain why each).\n" +
      "4) Suggest a short study plan (4 items) tailored to the user's strengths/weaknesses inferred from the data.\n\n" +
      "Return results clearly labeled under headings: SUMMARY, NOTABLE_SOLVED, RECOMMENDATIONS, STUDY_PLAN.\n" +
      "Keep the language concise and actionable. Do not invent facts beyond the provided data; if you must guess, explicitly label it as a guess."
  );

  return parts.join("\n");
}

/** Call Gemini (LangChain wrapper) to get the final formatted summary */
/** Call Gemini (LangChain wrapper) to get the final formatted summary */
/** Debugging + robust call to Gemini (LangChain wrapper) */
async function callGemini(prompt) {
  const model = new ChatGoogleGenerativeAI({
    model: GEMINI_MODEL,
    temperature: 0.0,
    // make tokens larger to be safe
    maxOutputTokens: 2000,
  });

  const system = {
    role: "system",
    content: "You are a concise assistant that formats output under explicit headings.",
  };
  const user = { role: "user", content: prompt };

  console.log(">>> Sending prompt to Gemini (debug mode). Prompt length:", prompt.length);

  let resp;
  try {
    resp = await model.invoke([system, user]);
  } catch (err) {
    console.error("ERROR from model.invoke():", err);
    throw err;
  }

  // Log raw response for debugging (very important)
  try {
    console.log("\n--- RAW RESP (full object) ---\n");
    // some LangChain responses contain circular refs; try safe stringify
    console.log(JSON.stringify(resp, replacerForLogging, 2));
    console.log("\n--- END RAW RESP ---\n");
  } catch (e) {
    console.log("Unable to JSON.stringify full resp; printing shallow inspection:");
    console.log(resp);
  }

  // Try multiple common places the text might be returned.
  // Return the first non-empty candidate we find.
  // Helper to read strings from nested structures
  function collectText(x) {
    if (!x) return "";
    if (typeof x === "string" && x.trim()) return x.trim();
    if (Array.isArray(x)) {
      // flatten and try to pick something meaningful
      for (const el of x) {
        const t = collectText(el);
        if (t) return t;
      }
      return "";
    }
    if (typeof x === "object") {
      // common keys: content, text, candidates, output, message, messages
      if (typeof x.content === "string" && x.content.trim()) return x.content.trim();
      if (typeof x.text === "string" && x.text.trim()) return x.text.trim();
      if (typeof x.output_text === "string" && x.output_text.trim()) return x.output_text.trim();
      if (Array.isArray(x.candidates) && x.candidates.length) {
        // candidate objects may have 'content' or 'message' or 'output'
        for (const c of x.candidates) {
          const t = collectText(c);
          if (t) return t;
        }
      }
      if (Array.isArray(x.output) && x.output.length) {
        for (const o of x.output) {
          const t = collectText(o);
          if (t) return t;
        }
      }
      if (Array.isArray(x.messages) && x.messages.length) {
        for (const m of x.messages) {
          const t = collectText(m);
          if (t) return t;
        }
      }
      if (x.message) return collectText(x.message);
      if (x.choices && Array.isArray(x.choices)) {
        for (const ch of x.choices) {
          const t = collectText(ch);
          if (t) return t;
        }
      }
      // fallback: stringify fields and look for text-like properties
      for (const k of Object.keys(x)) {
        const t = collectText(x[k]);
        if (t) return t;
      }
      return "";
    }
    return "";
  }

  // Try to get text
  let finalText = collectText(resp.content ?? resp);

  // Some LangChain wrappers return an array in resp.content where each item is { text } or { content }
  if (!finalText && Array.isArray(resp.content)) {
    finalText = resp.content.map(it => (it.text ?? it.content ?? "")).filter(Boolean).join("\n");
  }

  // If still empty, try to inspect resp directly for known patterns
  if (!finalText) {
    // debug: check resp.output[0].content[0].text (some Google SDK shapes)
    try {
      const attempt =
        resp?.output?.[0]?.content?.map(c => c?.text || c?.payload?.text)?.filter(Boolean)?.join("\n") ||
        resp?.candidates?.map(c => c?.content || c?.text)?.filter(Boolean)?.join("\n") ||
        "";
      if (attempt) finalText = attempt;
    } catch (e) {
      // ignore
    }
  }

  // If still empty, run a tiny sanity test prompt to check model availability
  if (!finalText || finalText.trim().length === 0) {
    console.warn("Model returned empty. Running a small sanity test prompt to verify model connectivity...");
    const sanSystem = { role: "system", content: "You are a test assistant." };
    const sanUser = { role: "user", content: "Say 'hello' and return exactly: HELLO_TEST" };
    try {
      const sanResp = await model.invoke([sanSystem, sanUser]);
      console.log("\n--- SANITY RAW RESP ---\n");
      console.log(JSON.stringify(sanResp, replacerForLogging, 2));
      const sanText = collectText(sanResp.content ?? sanResp);
      console.log("\n--- SANITY EXTRACTED TEXT ---\n", sanText, "\n--- END SANITY ---\n");
      if (!sanText || !sanText.includes("HELLO_TEST")) {
        throw new Error("Sanity test did not return expected 'HELLO_TEST' — check API key, model availability, or quotas.");
      }
      // If sanity succeeded but original prompt empty, proceed to return sanity text as indicator
      return sanText;
    } catch (e) {
      console.error("Sanity test failed or model unavailable:", e);
      throw new Error("Model appears to be unavailable or returning empty responses. See logs above for raw response.");
    }
  }

  return finalText;
}

// Helper replacer to avoid circular refs in JSON.stringify for logging
function replacerForLogging(key, value) {
  if (value instanceof Error) {
    return { message: value.message, stack: value.stack };
  }
  if (typeof value === "function") return `[Function ${value.name}]`;
  return value;
}


/** Main */
async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error("Usage: node leet_summarizer.js <leetcode_username>");
    process.exit(1);
  }
  const username = argv[0];

  console.log(`Fetching LeetCode profile for '${username}'...`);
  let data;
  try {
    data = await fetchLeetCodeProfile(username);
  } catch (err) {
    console.error("Error fetching profile:", err);
    process.exit(2);
  }

  const prompt = buildPrompt(username, data);
  console.log("\n--- Prompt sent to Gemini (truncated preview) ---\n");
  console.log(prompt.split("\n").slice(0, 30).join("\n"));
  console.log("\n--- Invoking Gemini... ---\n");

  try {
    const output = await callGemini(prompt);
    console.log("\n===== GEMINI OUTPUT =====\n");
    console.log(output);
    console.log("\n===== END =====\n");
  } catch (err) {
    console.error("Error calling Gemini:", err);
    process.exit(3);
  }
}

main();
