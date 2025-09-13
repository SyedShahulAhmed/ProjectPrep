// src/components/GithubLookup.jsx
import React, { useState } from "react";
import ProfileCard from "./ProfileCard";
import GitHubCalendarWrapper from "./GitHubCalendarWrapper";
import RepoCard from "./RepoCard";
import ErrorBoundary from "./ErrorBoundary";

/**
 * flattenContributionDays
 * - Accepts contributions object from server (GraphQL shape)
 * - Returns an ascending array of {date, count}
 * - If contributions is missing/null, returns 365-day zero-filled array (so heatmap & streaks still render)
 */
function flattenContributionDays(contributions) {
  if (
    contributions &&
    Array.isArray(contributions.weeks) &&
    contributions.weeks.length > 0
  ) {
    const days = [];
    (contributions.weeks || []).forEach((w) => {
      (w.contributionDays || []).forEach((d) =>
        days.push({ date: d.date, count: d.contributionCount })
      );
    });
    days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return days;
  }

  // Fallback: build a 365-day zero array (ascending)
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 364); // include today => 365 items
  const days = [];
  const cur = new Date(from);
  while (cur <= to) {
    days.push({ date: cur.toISOString().slice(0, 10), count: 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/**
 * computeStreaks
 * - days expected ascending
 * - returns { currentStreak, longestStreak }
 */
function computeStreaks(days) {
  if (!days || days.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // longest streak
  let longest = 0;
  let temp = 0;
  for (let i = 0; i < days.length; i++) {
    if (days[i].count > 0) {
      temp++;
      if (temp > longest) longest = temp;
    } else {
      temp = 0;
    }
  }

  // current streak: walk backwards from last day
  const lastIdx = days.length - 1;
  let curr = 0;
  for (let i = lastIdx; i >= 0; i--) {
    if (days[i].count > 0) {
      curr++;
    } else {
      // if the most recent returned day isn't today and it's 0, current streak = 0
      const lastDate = new Date(days[lastIdx].date).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      if (lastDate !== today) curr = 0;
      break;
    }
  }

  return { currentStreak: curr, longestStreak: longest };
}

function topLanguages(repos = []) {
  const map = {};
  (repos || []).forEach((r) => {
    if (!r.language) return;
    map[r.language] = (map[r.language] || 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang, cnt]) => `${lang} (${cnt})`);
}

export default function GithubLookup() {
  const [username, setUsername] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // use VITE_API_URL or fallback to localhost:5000/api
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const onSearch = async (e) => {
    e?.preventDefault();
    setErr(null);
    setData(null);
    const name = (username || "").trim();
    if (!name) return setErr("Enter a GitHub username");

    setLoading(true);
    try {
      const res = await fetch(
        `${API}/github/public/${encodeURIComponent(name)}`
      );
      if (!res.ok) {
        // read text first — some errors return non-json
        const text = await res.text().catch(() => "");
        let body = {};
        try {
          body = text ? JSON.parse(text) : {};
        } catch {
          body = { msg: text || `Status ${res.status}` };
        }
        throw new Error(body.message || body.msg || `Status ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (error) {
      setErr(error.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  // prepare contribution days and streaks (fallbacks inside flattenContributionDays)
  const contribDays = flattenContributionDays(data?.contributions);
  const streaks = computeStreaks(contribDays);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <form onSubmit={onSearch} className="flex gap-3 items-center mb-6">
        <input
          className="flex-1 border rounded-lg px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Enter GitHub username (e.g. octocat)"
          value={username}
          onChange={(e) => setUsername(e.target.value)} // don't trim while typing
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {err && <div className="text-red-600 mb-4">{err}</div>}

      {!data && !err && (
        <div className="text-center text-gray-500">
          Search a username to view a polished public profile & contributions.
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <ProfileCard user={data.user} />

            <div className="p-4 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Top repositories</h3>
                <div className="text-sm text-gray-500">
                  {(data.repos || []).length} repos
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(data.repos || [])
                  .slice()
                  .sort(
                    (a, b) =>
                      (b.stargazers_count || 0) - (a.stargazers_count || 0)
                  )
                  .slice(0, 8)
                  .map((r) => (
                    <RepoCard repo={r} key={r.id} />
                  ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="p-4 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Contribution heatmap</h4>
                <div className="text-xs text-gray-500">Last 365 days</div>
              </div>

              <div className="mt-3">
               <GitHubCalendarWrapper name={data?.user?.login || username} />
              </div>

              <div className="mt-3 text-sm text-gray-700">
                <div>
                  <span className="font-medium">{streaks.currentStreak}</span>{" "}
                  day current streak
                </div>
                <div className="mt-1">
                  <span className="font-medium">{streaks.longestStreak}</span>{" "}
                  day longest streak
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Total contributions:{" "}
                  {data.contributions?.totalContributions ?? "N/A"}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border rounded-lg shadow-sm">
              <h4 className="font-semibold mb-2">Quick stats</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div>
                  Followers: <strong>{data.user.followers}</strong>
                </div>
                <div>
                  Following: <strong>{data.user.following}</strong>
                </div>
                <div>
                  Public repos: <strong>{data.user.public_repos}</strong>
                </div>
                <div>
                  Top languages:{" "}
                  <strong>{topLanguages(data.repos).join(", ") || "—"}</strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
