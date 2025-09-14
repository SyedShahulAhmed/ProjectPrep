// backend/stream.js  (ESM) - add to your existing server
import express from "express";
import axios from "axios";
import cors from "cors";
import 'dotenv/config';

const router = express.Router();
router.use(cors({ origin: "http://localhost:5173" })); // change if needed

// model & endpoint
const GEMINI_MODEL = "gemini-2.5-flash"; // or your chosen model
const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamingGenerateContent`;
// Note: docs refer to streamGenerateContent / streaming endpoints; above path may vary by region/model.
// If you used a different endpoint for non-streaming, check docs for streaming URL. :contentReference[oaicite:2]{index=2}

router.get("/api/ai/stream", async (req, res) => {
  // Keep it simple: message arrives as a query param or header
  const message = req.query.message || req.headers['x-message'];
  if (!message) {
    res.status(400).json({ error: "message query parameter required" });
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // helper to send SSE event
  const sendEvent = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error("SSE write error:", err);
    }
  };

  sendEvent({ type: "meta", text: "connected" });

  try {
    // Call Gemini streaming endpoint
    const axiosRes = await axios({
      method: "post",
      url: GEMINI_STREAM_URL,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      data: {
        // Adjust payload as docs require - this is a generic shape
        contents: [{ parts: [{ text: message }] }],
        // Optionally: streamingConfig / generationConfig
      },
      responseType: "stream",
      timeout: 120000, // 2 min
    });

    const stream = axiosRes.data;

    // The exact chunk format depends on Gemini; many streaming endpoints send newline-delimited JSON (NDJSON).
    // We'll parse the stream by lines and forward each JSON chunk as an SSE 'chunk' event.
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      // split into lines (handles NDJSON or line-delimited chunks)
      const parts = buffer.split("\n");
      buffer = parts.pop(); // last partial
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        // Some endpoints prefix with "data: " — remove if present
        const jsonText = trimmed.startsWith("data:") ? trimmed.replace(/^data:\s*/, "") : trimmed;
        let parsed = null;
        try {
          parsed = JSON.parse(jsonText);
        } catch (e) {
          // Not JSON? forward raw chunk as text
          sendEvent({ type: "chunk", text: jsonText });
          continue;
        }
        // parsed chunk: extract the textual delta if present
        // Many Gemini streaming chunks include something like: { "candidates":[{ "content":[{"parts":[{"text":"..."}]}]}] }
        // We try a few common paths; adjust depending on your observed response.
        const delta =
          parsed?.candidates?.[0]?.content?.parts?.[0]?.text
          ?? parsed?.text
          ?? parsed?.chunk
          ?? null;

        if (delta) {
          sendEvent({ type: "chunk", text: delta });
        } else {
          // send raw parsed so UI can decide
          sendEvent({ type: "meta-chunk", raw: parsed });
        }
      }
    });

    stream.on("end", () => {
      sendEvent({ type: "done" });
      res.end();
    });

    stream.on("error", (err) => {
      console.error("Stream error:", err?.message || err);
      sendEvent({ type: "error", message: String(err?.message || err) });
      res.end();
    });

    // If the client disconnects, stop streaming
    req.on("close", () => {
      console.log("Client disconnected, ending Gemini stream");
      try { stream.destroy?.(); } catch (_) {}
    });
  } catch (err) {
    console.error("Failed to start Gemini stream:", err?.response?.data ?? err.message ?? err);
    sendEvent({ type: "error", message: err?.response?.data ?? err?.message ?? "stream error" });
    res.end();
  }
});

export default router;
