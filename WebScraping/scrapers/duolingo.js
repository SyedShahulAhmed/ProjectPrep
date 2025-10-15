export async function scrapeDuolingo(username) {
  const url = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}`;
  const res = await fetch(url);
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (!json.users || !json.users.length) throw new Error("Duolingo user not found");
    const user = json.users[0];
    return {
      username: user.username,
      avatar: user.avatar || '',
      streak: user.streak || 'N/A',
      totalXp: user.totalXp || 'N/A',
      learningLanguage: user.learningLanguage || 'N/A',
      crowns: user.crowns || 'N/A',
      achievementCount: user.achievementCount || 'N/A',
      bio: user.bio || '',
      created: user.creationDate || 'N/A',
      dailyGoal: user.dailyGoalXp || 'N/A',
    };
  } catch (e) {
    return { error: "Failed to parse Duolingo response" };
  }
}
