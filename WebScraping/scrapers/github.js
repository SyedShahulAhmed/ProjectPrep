export async function scrapeGitHub(username) {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (json.message === "Not Found") throw new Error("GitHub user not found");
    return {
      login: json.login,
      avatar_url: json.avatar_url,
      name: json.name,
      public_repos: json.public_repos,
      followers: json.followers,
      following: json.following,
      bio: json.bio || '',
      location: json.location || '',
      company: json.company || '',
      blog: json.blog || '',
      twitter_username: json.twitter_username || '',
      html_url: json.html_url,
      created_at: json.created_at,
    };
  } catch (e) {
    return { error: "Failed to parse GitHub response" };
  }
}
