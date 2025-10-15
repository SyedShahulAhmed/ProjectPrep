import express from 'express';
import path from 'path';
import {scrapeLeetCode } from './scrapers/leetcode.js';
import { scrapeDuolingo } from './scrapers/duolingo.js';
import { scrapeGitHub } from './scrapers/github.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.post('/scrape', async (req, res) => {
  const { leetcode, duolingo, github } = req.body;
  try {
    const [leet, duo, git] = await Promise.all([
      scrapeLeetCode(leetcode),
      scrapeDuolingo(duolingo),
      scrapeGitHub(github)
    ]);
    res.json({ leetcode: leet, duolingo: duo, github: git });
  } catch (err) {
    res.status(500).json({ error: 'Scraping failed', details: err.message });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000/'));
