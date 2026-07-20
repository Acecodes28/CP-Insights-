const { getProblemset } = require("./recommendationService");

// Picks a single "tricky" problem for a group challenge. Definition of
// tricky here: a Div 1/2-era problem in a moderately hard band (rating
// 1700-2400, wide enough to suit different group skill levels without
// the creator having to specify one) that has enough tags to signal real
// technique combination rather than a one-trick problem, and isn't from
// the very latest contests (avoids picking something half the group may
// have already seen/solved in the last few days).
async function pickChallengeProblem({ minRating = 1700, maxRating = 2400 } = {}) {
  const problems = await getProblemset();

  const candidates = problems.filter(
    (p) => p.rating && p.rating >= minRating && p.rating <= maxRating && p.tags.length >= 2
  );

  if (candidates.length === 0) {
    throw new Error("No suitable challenge problem found in that rating range");
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return pick;
}

module.exports = { pickChallengeProblem };
