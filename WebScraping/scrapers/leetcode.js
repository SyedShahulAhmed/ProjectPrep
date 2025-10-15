export async function scrapeLeetCode(username) {
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operationName: "getUserProfile",
      variables: { username },
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              realName
              userAvatar
              countryName
              school
              ranking
              reputation
              starRating
              joinDate
            }
            badges { name }
            submitStats { acSubmissionNum { difficulty count } }
            contests {
              attendedContestsCount
              rating
              globalRanking
              topPercentage
              contests { title rank }
            }
          }
        }
      `
    })
  });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (!json.data || !json.data.matchedUser) throw new Error("LeetCode user not found");
    return json.data.matchedUser;
  } catch (e) {
    return { error: "Failed to parse LeetCode response" };
  }
}
