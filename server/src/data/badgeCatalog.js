const BADGE_CATALOG = [
  { id: "first_blood", name: "First Blood", description: "Solve your first problem.", category: "solve_count", target: 1 },
  { id: "century", name: "Century", description: "Solve 100 problems total.", category: "solve_count", target: 100 },
  { id: "two_hundred_club", name: "200 Club", description: "Solve 200 problems total.", category: "solve_count", target: 200 },
  { id: "graph_conqueror", name: "Graph Theory Conqueror", description: "Solve 100 graph-tagged problems.", category: "tag_count", tag: "graphs", target: 100 },
  { id: "dp_whisperer", name: "DP Whisperer", description: "Solve 100 dynamic programming problems.", category: "tag_count", tag: "dp", target: 100 },
  { id: "greedy_gremlin", name: "Greedy Gremlin", description: "Solve 75 greedy problems.", category: "tag_count", tag: "greedy", target: 75 },
  { id: "well_rounded", name: "Well-Rounded", description: "Solve 20+ problems in at least 8 different tags.", category: "tag_breadth", perTagMin: 20, tagCountTarget: 8 },

  { id: "sub_five", name: "Sub-5", description: "Solve a problem within 5 minutes of the round starting.", category: "fast_solve", target: 1 },
  { id: "flawless_contest", name: "Flawless Contest", description: "Finish a contest with zero wrong submissions.", category: "flawless_contest", target: 1 },
  { id: "sharpshooter", name: "Sharpshooter", description: "10 contests with over 90% first-submission accuracy.", category: "accuracy_contests", target: 10 },
  { id: "photo_finish", name: "Photo Finish", description: "Win a duel round with under 60 seconds left before it times out.", category: "duel_photo_finish", target: 1 },

  { id: "tier_climber", name: "Tier Climber", description: "Reach a new Codeforces rank tier since joining.", category: "tier_climb", target: 1 },
  { id: "personal_best", name: "Personal Best", description: "Hit a new all-time peak rating since joining.", category: "personal_best", target: 1 },
  { id: "comeback_kid", name: "Comeback Kid", description: "Recover from your largest rating dip to a new peak.", category: "comeback", target: 1 },

  { id: "duel_first_blood", name: "First Blood (Duel)", description: "Win your first duel.", category: "duel_wins", target: 1 },
  { id: "hat_trick", name: "Hat Trick", description: "Win 3 duels in a row.", category: "duel_win_streak", target: 3 },
  { id: "giant_slayer", name: "Giant Slayer", description: "Win a duel against someone 200+ Elo above you.", category: "duel_upset", target: 1 },
  { id: "duel_veteran", name: "Duel Veteran", description: "Play 25 duels.", category: "duel_played_count", target: 25 },

  { id: "two_weeks_strong", name: "Two Weeks Strong", description: "Maintain a 14-day streak.", category: "streak_milestone", target: 14 },
  { id: "centurion_streak", name: "Centurion Streak", description: "Maintain a 100-day streak.", category: "streak_milestone", target: 100 },
];

module.exports = { BADGE_CATALOG };
