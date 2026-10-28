type FantasyInput = {
  kills: number;
  deaths: number;
  assists: number;
  firstBloods: number;
  clutches: number;
  aces: number;
  matchWin: boolean;
};

export function computeFantasyPoints(stats: FantasyInput) {
  const total =
    stats.kills * 1 +
    stats.deaths * -0.5 +
    stats.assists * 0.5 +
    stats.firstBloods * 2 +
    stats.clutches * 5 +
    stats.aces * 10 +
    (stats.matchWin ? 3 : 0);

  return Math.round(total * 10) / 10;
}

export function computePickemsPoints(options: {
  winnerCorrect: boolean;
  scoreCorrect: boolean;
  championCorrect: boolean;
}) {
  return (options.winnerCorrect ? 10 : 0) + (options.scoreCorrect ? 5 : 0) + (options.championCorrect ? 50 : 0);
}
