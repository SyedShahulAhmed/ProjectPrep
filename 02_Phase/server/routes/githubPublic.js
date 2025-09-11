// server/routes/githubPublic.js
import express from "express";
const router = express.Router();

const GITHUB_API_URL = "https://api.github.com";
const GITHUB_API_GRAPHQL = "https://api.github.com/graphql";

const GRAPH_QUERY = `query Contributions($login: String!, $from: DateTime, $to: DateTime) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

/** Helper: build an "empty" contributionCalendar covering from->to (inclusive)
 * returns { totalContributions:0, weeks: [ { contributionDays: [{date, contributionCount}] } ] }
 */
function buildEmptyCalendar(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);

  // GitHub calendar is grouped into weeks starting on Sunday.
  // Step back 'from' to the previous Sunday so weeks align.
  const start = new Date(from);
  const dayOfWeek = start.getUTCDay(); // 0 = Sunday
  start.setUTCDate(start.getUTCDate() - dayOfWeek);

  const weeks = [];
  const cur = new Date(start);

  while (cur <= to) {
    const week = { contributionDays: [] };
    for (let i = 0; i < 7; i++) {
      const iso = cur.toISOString().slice(0, 10);
      week.contributionDays.push({ date: iso, contributionCount: 0 });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  return { totalContributions: 0, weeks };
}

router.get('/public/:username', async (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).json({ msg: "username required" });

  try {
    const headers = {
      Accept: "application/vnd.github.v3+json",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `bearer ${process.env.GITHUB_TOKEN}` } : {}),
    };

    // 1) Profile
    const userResp = await fetch(`${GITHUB_API_URL}/users/${encodeURIComponent(username)}`, { headers });
    if (!userResp.ok) {
      const body = await userResp.text().catch(() => "");
      let parsed = {};
      try { parsed = JSON.parse(body); } catch(e){ parsed = { msg: body || 'GitHub returned error' }; }
      return res.status(userResp.status).json(parsed);
    }
    const user = await userResp.json();

    // 2) Repos
    const reposResp = await fetch(`${GITHUB_API_URL}/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`, { headers });
    const repos = reposResp.ok ? await reposResp.json().catch(()=>[]) : [];

    // 3) Contributions (GraphQL) - last 365 days
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 365);

    const gqlBody = {
      query: GRAPH_QUERY,
      variables: { login: username, from: from.toISOString(), to: to.toISOString() },
    };
    const gqlHeaders = {
      "Content-Type": "application/json",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `bearer ${process.env.GITHUB_TOKEN}` } : {}),
    };

    let contributions = null;
    try {
      const gqlRes = await fetch(GITHUB_API_GRAPHQL, {
        method: "POST",
        headers: gqlHeaders,
        body: JSON.stringify(gqlBody),
      });

      const text = await gqlRes.text().catch(()=>"");
      if (!gqlRes.ok) {
        // log helpful info for debugging (rate-limit, bad token, etc.)
        console.warn("GitHub GraphQL error:", gqlRes.status, text.slice ? text.slice(0,300) : text);
        // fallback to empty calendar
        contributions = buildEmptyCalendar(from.toISOString(), to.toISOString());
      } else {
        let gqlJson;
        try {
          gqlJson = JSON.parse(text);
        } catch (e) {
          console.warn("GitHub GraphQL returned invalid JSON:", text.slice ? text.slice(0,300) : text);
          gqlJson = null;
        }
        contributions = gqlJson?.data?.user?.contributionsCollection?.contributionCalendar || null;
        if (!contributions) {
          // if contributions missing for any reason, generate empty calendar
          console.info("GraphQL returned no contributions; using empty calendar fallback");
          contributions = buildEmptyCalendar(from.toISOString(), to.toISOString());
        }
      }
    } catch (err) {
      console.error("GraphQL fetch failed:", err?.message || err);
      contributions = buildEmptyCalendar(from.toISOString(), to.toISOString());
    }

    const payload = { user, repos, contributions, fetchedAt: new Date().toISOString() };
    return res.status(200).json(payload);
  } catch (err) {
    console.error("GitHub Public Error:", err?.message || err);
    return res.status(500).json({ msg: "Server Error" });
  }
});

export default router;
