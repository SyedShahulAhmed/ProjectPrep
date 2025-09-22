// server.js (ESM)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 5174;
const GEMINI_MODEL = "gemini-2.5-flash";

// --- LeetCode GraphQL query (safe / minimal) ---
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

// --- helper: fetch profile ---
async function fetchLeetCodeProfile(username) {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: LC_QUERY, variables: { username } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(
      `LeetCode fetch failed: ${res.status} ${res.statusText} ${JSON.stringify(
        json.errors || json
      )}`
    );
  }
  return json.data;
}

// --- helper: build prompt from profile data ---
function buildPrompt(username, data) {
  const mu = data.matchedUser;
  if (!mu) return `No public profile for username: ${username}`;

  const parts = [];
  parts.push(`LeetCode profile summary for user: ${mu.username}`);
  if (mu.profile?.realName) parts.push(`Real name: ${mu.profile.realName}`);
  if (mu.profile?.countryName) parts.push(`Country: ${mu.profile.countryName}`);
  if (mu.contributions?.points)
    parts.push(`Contribution points: ${mu.contributions.points}`);
  if (mu.profile?.starRating)
    parts.push(`Star rating: ${mu.profile.starRating}`);

  // submission stats
  if (mu.submitStats?.acSubmissionNum) {
    parts.push("\nSolved counts by difficulty:");
    for (const row of mu.submitStats.acSubmissionNum) {
      parts.push(`- ${row.difficulty}: ${row.count}`);
    }
  }

  if (data.allQuestionsCount) {
    parts.push("\nTotal problems in database by difficulty:");
    for (const row of data.allQuestionsCount) {
      parts.push(`- ${row.difficulty}: ${row.count}`);
    }
  }

  if (mu.badges && mu.badges.length) {
    parts.push(
      `\nBadges: ${mu.badges.map((b) => b.displayName || b.id).join(", ")}`
    );
  }

  parts.push("\n\nINSTRUCTIONS FOR THE ASSISTANT:\n");
  parts.push(
    "You are a helpful assistant. Based on the profile information above, produce the following outputs:\n" +
      "1) A concise human-readable profile summary (3-6 sentences).\n" +
      "2) A list of the top 5 notable solved problems (choose those with varied topics or popularity) with 1-line notes each. If problem list is not present, say 'problem list not available'.\n" +
      "3) Recommend 5 problems (by difficulty and topic) the user should practice next to improve (explain why each).\n" +
      "4) Suggest a short study plan (4 items) tailored to the user's strengths/weaknesses inferred from the data.\n\n" +
      "Return results clearly labeled under headings: SUMMARY, NOTABLE_SOLVED, RECOMMENDATIONS, STUDY_PLAN.\n" +
      "Keep the language concise and actionable. Do not invent facts beyond the provided data; if you must guess, explicitly label it as a guess."
  );

  return parts.join("\n");
}

// --- robust extractor for LangChain response shapes ---
function extractTextFromResp(resp) {
  // try common shapes
  try {
    if (!resp) return "";
    if (typeof resp === "string") return resp;
    // Common: resp.content is array of { text } or { content }
    if (Array.isArray(resp.content)) {
      const parts = resp.content
        .map((p) => p.text ?? p.content ?? "")
        .filter(Boolean);
      if (parts.length) return parts.join("\n\n");
    }
    // Check candidates or output arrays
    if (Array.isArray(resp.candidates)) {
      const parts = resp.candidates
        .map((c) => c.content ?? c.text ?? "")
        .filter(Boolean);
      if (parts.length) return parts.join("\n\n");
    }
    if (Array.isArray(resp.output)) {
      for (const o of resp.output) {
        if (o?.content) {
          if (Array.isArray(o.content)) {
            const cs = o.content
              .map((c) => c.text ?? c.payload?.text ?? "")
              .filter(Boolean);
            if (cs.length) return cs.join("\n\n");
          }
        }
      }
    }
    // fallback: stringify
    return JSON.stringify(resp).slice(0, 10000);
  } catch (e) {
    return String(resp);
  }
}

// --- call Gemini via LangChain wrapper ---
// callGemini — increase tokens + require strict JSON output to avoid long prose
async function callGemini(prompt) {
  const model = new ChatGoogleGenerativeAI({
    model: GEMINI_MODEL,
    temperature: 0.0,
    maxOutputTokens: 3500, // increase — try 3500 or 4000 if still truncated
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const system = {
    role: "system",
    content:
      "You are a concise assistant. IMPORTANT: Return ONLY a single valid JSON object (no surrounding text) with keys: SUMMARY (string), NOTABLE_SOLVED (array of strings), RECOMMENDATIONS (array of strings), STUDY_PLAN (array of strings). Example:\n" +
      `{"SUMMARY":"...","NOTABLE_SOLVED":["p1 - note","p2 - note"],"RECOMMENDATIONS":["rec1","rec2"],"STUDY_PLAN":["step1","step2"]}`,
  };
  const user = {
    role: "user",
    content:
      prompt +
      "\n\nReturn ONLY valid JSON as described above. Do not include any extra commentary or headings.",
  };

  const resp = await model.invoke([system, user]);

  // robust extraction (try multiple shapes)
  let raw = "";
  if (Array.isArray(resp?.content)) {
    raw = resp.content.map((c) => c?.text ?? c?.content ?? "").join("\n");
  } else if (typeof resp?.content === "string") {
    raw = resp.content;
  } else {
    raw = JSON.stringify(resp).slice(0, 20000);
  }

  // try to extract JSON from raw
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = raw.slice(start, end + 1);
    try {
      return JSON.parse(candidate); // return structured object
    } catch (e) {
      // fall through: return raw if JSON parse fails
    }
  }

  // fallback: return raw string
  return { RAW: raw };
}

// --- helper: split Gemini output into sections ---
// improved splitSections helper — more flexible and robust
function splitSections(aiText) {
  const keys = [
    "SUMMARY",
    "NOTABLE_SOLVED",
    "NOTABLE SOLVED",
    "NOTABLE-SOLVED",
    "NOTABLES",
    "NOTABLE",
    "RECOMMENDATIONS",
    "RECOMMEND",
    "RECOMMENDATION",
    "STUDY_PLAN",
    "STUDY PLAN",
    "STUDY-PLAN",
    "STUDY",
  ];
  const out = {
    SUMMARY: "",
    NOTABLE_SOLVED: "",
    RECOMMENDATIONS: "",
    STUDY_PLAN: "",
  };

  if (!aiText) return out;
  if (typeof aiText !== "string") aiText = String(aiText);

  // normalize text
  const txt = aiText.replace(/\r/g, "").trim();

  // attempt 1: explicit heading regex (handles many variants)
  // captures headings like "SUMMARY:" or "SUMMARY\n" etc.
  const headingPattern =
    /(SUMMARY|NOTABLE[_\-\s]?SOLVED|NOTABLES|NOTABLE|RECOMMENDATIONS|RECOMMENDATION|RECOMMEND|STUDY[_\-\s]?PLAN|STUDY_PLAN|STUDY|STUDY-PLAN)\s*[:\-]?\s*/gi;
  const parts = txt
    .split(headingPattern)
    .map((s) => s.trim())
    .filter(Boolean);
  // parts example: ['SUMMARY','text...','NOTABLE_SOLVED','text...', ...]

  if (parts.length >= 2) {
    for (let i = 0; i < parts.length; i += 2) {
      const rawKey = (parts[i] || "").toUpperCase();
      const val = parts[i + 1] || "";
      // normalize rawKey into one of our canonical keys
      if (/^SUMMARY$/.test(rawKey))
        out.SUMMARY = (out.SUMMARY + "\n" + val).trim();
      else if (/NOTABLE/.test(rawKey))
        out.NOTABLE_SOLVED = (out.NOTABLE_SOLVED + "\n" + val).trim();
      else if (/RECOMMEND/.test(rawKey))
        out.RECOMMENDATIONS = (out.RECOMMENDATIONS + "\n" + val).trim();
      else if (/STUDY/.test(rawKey))
        out.STUDY_PLAN = (out.STUDY_PLAN + "\n" + val).trim();
      else {
        // if unknown heading, append to SUMMARY fallback
        out.SUMMARY = (out.SUMMARY + "\n" + rawKey + "\n" + val).trim();
      }
    }
    // success — return whatever we found (some sections may still be empty)
    return out;
  }

  // attempt 2: look for numbered section markers like "1)" or "1."
  const numberedSplit = txt
    .split(/\n\s*(?:\d{1,2}[\)\.])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (numberedSplit.length >= 3) {
    // take first as summary (if short), then heuristically fill others
    out.SUMMARY = numberedSplit[0];
    // remaining join and heuristically assign
    const rest = numberedSplit.slice(1).join("\n\n");
    // try to split rest into notable / recs / plan by keywords
    const recMatch = rest.match(/(recommend|practice|suggest)/i);
    if (recMatch) {
      const idx = rest.search(/(recommend|practice|suggest)/i);
      out.RECOMMENDATIONS = rest.slice(idx).trim();
      out.NOTABLE_SOLVED = rest.slice(0, idx).trim();
    } else {
      // fallback: split into two halves
      const half = Math.ceil(rest.length / 2);
      out.NOTABLE_SOLVED = rest.slice(0, half).trim();
      out.RECOMMENDATIONS = rest.slice(half).trim();
    }
    out.STUDY_PLAN = ""; // leave blank for now
    return out;
  }

  // attempt 3: keyword heuristics — search for keywords and slice around them
  const lc = txt.toLowerCase();
  const recIdx = lc.indexOf("recommend");
  const notableIdx = lc.indexOf("notable");
  const studyIdx = lc.indexOf("study plan");
  // if any indexes found, slice text
  if (notableIdx !== -1 || recIdx !== -1 || studyIdx !== -1) {
    // summary is text up to earliest keyword (or first 600 chars)
    let firstKeywordIdx = Math.min(
      ...[notableIdx, recIdx, studyIdx].filter((i) => i !== -1)
    );
    if (firstKeywordIdx === Infinity || firstKeywordIdx < 0)
      firstKeywordIdx = Math.min(600, txt.length);
    out.SUMMARY = txt.slice(0, firstKeywordIdx).trim();
    // remainder
    const rest = txt.slice(firstKeywordIdx).trim();
    // try to pick parts by searching keywords
    const recPart = rest.match(/(recommend.*?)(?=(notable|study|$))/is);
    const notablePart = rest.match(/(notable.*?)(?=(recommend|study|$))/is);
    const studyPart = rest.match(/(study.*?)(?=(recommend|notable|$))/is);
    if (notablePart) out.NOTABLE_SOLVED = notablePart[0].trim();
    if (recPart) out.RECOMMENDATIONS = recPart[0].trim();
    if (studyPart) out.STUDY_PLAN = studyPart[0].trim();
    // fallback: if missing, split rest into two
    if (!out.NOTABLE_SOLVED && !out.RECOMMENDATIONS) {
      const mid = Math.ceil(rest.length / 2);
      out.NOTABLE_SOLVED = rest.slice(0, mid).trim();
      out.RECOMMENDATIONS = rest.slice(mid).trim();
    }
    return out;
  }

  // final fallback: no headings detected — take the first paragraph as SUMMARY and rest as RECOMMENDATIONS
  const paragraphs = txt
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  out.SUMMARY = paragraphs[0] || txt.slice(0, 400);
  out.RECOMMENDATIONS = paragraphs.slice(1, 3).join("\n\n");
  out.NOTABLE_SOLVED = paragraphs.slice(3, 5).join("\n\n");
  out.STUDY_PLAN = paragraphs.slice(5, 9).join("\n\n");
  return out;
}

// --- API endpoint ---
app.get("/api/summary", async (req, res) => {
  const username = (req.query.username || "").trim();
  if (!username) {
    return res.status(400).json({ ok: false, error: "username query param required" });
  }

  try {
    // 1) fetch LeetCode profile data (may throw)
    const lcData = await fetchLeetCodeProfile(username);

    // 2) build the prompt from the profile data
    const prompt = buildPrompt(username, lcData);

    // 3) call the model (callGemini should be defined earlier)
    const aiData = await callGemini(prompt);

    // 4) If model returned parsed JSON object, map into sections; otherwise fallback
    if (aiData && aiData.SUMMARY) {
      return res.json({
        ok: true,
        username,
        sections: {
          SUMMARY: aiData.SUMMARY || "",
          NOTABLE_SOLVED: Array.isArray(aiData.NOTABLE_SOLVED) ? aiData.NOTABLE_SOLVED.join("\n") : (aiData.NOTABLE_SOLVED || ""),
          RECOMMENDATIONS: Array.isArray(aiData.RECOMMENDATIONS) ? aiData.RECOMMENDATIONS.join("\n") : (aiData.RECOMMENDATIONS || ""),
          STUDY_PLAN: Array.isArray(aiData.STUDY_PLAN) ? aiData.STUDY_PLAN.join("\n") : (aiData.STUDY_PLAN || ""),
        },
        promptPreview: prompt.slice(0, 2000),
      });
    } else {
      // fallback: return raw output for debugging (keeps response JSON-shaped)
      return res.json({
        ok: true,
        username,
        sections: { SUMMARY: (aiData && aiData.RAW) ? aiData.RAW : String(aiData) },
        promptPreview: prompt.slice(0, 2000),
      });
    }
  } catch (err) {
    console.error("Error /api/summary:", err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});


// serve a simple index page from /public
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
