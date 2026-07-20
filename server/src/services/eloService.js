const K_FACTOR = 32; // standard for a low-game-count ladder - favors faster
// early movement since nobody starts with a large match history to anchor on

/**
 * Standard Elo expected-score formula: the probability player A is
 * predicted to win against player B, given their current ratings.
 */
function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Computes new Elo ratings for both players after a single result.
 * actualScoreA is 1 (A won), 0 (A lost), or 0.5 (draw) - actualScoreB is
 * always 1 - actualScoreA, so callers only ever pass one side's outcome.
 *
 * Returns whole-number ratings (Math.round) since fractional Elo doesn't
 * mean anything to a user looking at their profile - CF itself displays
 * integer ratings for the same reason.
 */
function computeEloUpdate(ratingA, ratingB, actualScoreA) {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;
  const actualScoreB = 1 - actualScoreA;

  const newRatingA = Math.round(ratingA + K_FACTOR * (actualScoreA - expectedA));
  const newRatingB = Math.round(ratingB + K_FACTOR * (actualScoreB - expectedB));

  return {
    newRatingA,
    newRatingB,
    deltaA: newRatingA - ratingA,
    deltaB: newRatingB - ratingB,
  };
}

module.exports = { computeEloUpdate, expectedScore, K_FACTOR };
