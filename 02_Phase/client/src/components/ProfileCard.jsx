// ProfileCard.jsx
import React from "react";

export default function ProfileCard({ user }) {
  if (!user) return null;
  return (
    <div className="flex gap-4 items-start p-5 bg-white border rounded-lg shadow-sm">
      <img
        src={user.avatar_url}
        alt={user.login}
        className="w-24 h-24 rounded-full border"
      />
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-semibold leading-tight">
              {user.name || user.login}
            </h2>
            <div className="text-sm text-gray-500 mt-0.5">@{user.login}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm text-gray-600">Followers</div>
            <div className="text-lg font-medium">{user.followers}</div>
          </div>
        </div>

        {user.bio && <p className="mt-3 text-gray-700">{user.bio}</p>}

        <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
          {user.location && <div className="px-2 py-1 bg-gray-50 rounded">{user.location}</div>}
          {user.blog && (
            <a
              className="px-2 py-1 bg-gray-50 rounded text-indigo-600"
              href={user.blog.startsWith("http") ? user.blog : `https://${user.blog}`}
              target="_blank"
              rel="noreferrer"
            >
              Website
            </a>
          )}
          <div className="px-2 py-1 bg-gray-50 rounded">Public repos: {user.public_repos}</div>
        </div>
      </div>
    </div>
  );
}
