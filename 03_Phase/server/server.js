// backend/server.js  (ESM)
import 'dotenv/config';             // loads process.env from .env
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' })); // change if needed

// init SDK with your API key from env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/ai', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    // Using generateContent via SDK (simple string form)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message
    });

    // SDK returns a friendly .text when available
    const reply = response?.text ?? response?.candidates?.[0]?.content?.parts?.[0]?.text ?? JSON.stringify(response);
    res.json({ reply });
  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ error: 'AI request failed', details: err.message || err });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
