// RepoCard.jsx
import React from "react";

export default function RepoCard({ repo }) {
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noreferrer"
      className="block p-4 bg-white border rounded-lg hover:shadow transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{repo.name}</h3>
            <div className="text-sm text-gray-500">★ {repo.stargazers_count}</div>
          </div>
          {repo.description && <p className="text-sm text-gray-600 mt-1">{repo.description}</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <div>{repo.language || "—"}</div>
        <div>Updated {new Date(repo.pushed_at).toLocaleDateString()}</div>
      </div>
    </a>
  );
}
