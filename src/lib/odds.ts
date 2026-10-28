type OddsInput = {
  matchId: string;
  team1: string;
  team2: string;
  fallbackTeam1: number;
  fallbackTeam2: number;
};

type OddsResult = {
  team1Percent: number;
  team2Percent: number;
  team1Odds?: number;
  team2Odds?: number;
  source: string;
};

function normalizePercents(team1: number, team2: number) {
  const p1 = Math.max(1, team1);
  const p2 = Math.max(1, team2);
  const sum = p1 + p2;
  return {
    team1Percent: (p1 / sum) * 100,
    team2Percent: (p2 / sum) * 100,
  };
}

function fromDecimalOdds(team1Odds: number, team2Odds: number) {
  if (team1Odds <= 1 || team2Odds <= 1) {
    return null;
  }

  const implied1 = 1 / team1Odds;
  const implied2 = 1 / team2Odds;
  const sum = implied1 + implied2;

  return {
    team1Percent: (implied1 / sum) * 100,
    team2Percent: (implied2 / sum) * 100,
  };
}

function readOddsPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const source = payload as Record<string, unknown>;

  const directTeam1 = Number(source.team1Odds);
  const directTeam2 = Number(source.team2Odds);
  if (Number.isFinite(directTeam1) && Number.isFinite(directTeam2)) {
    return { team1Odds: directTeam1, team2Odds: directTeam2 };
  }

  const nested = source.odds as Record<string, unknown> | undefined;
  if (nested) {
    const home = Number(nested.home ?? nested.team1);
    const away = Number(nested.away ?? nested.team2);
    if (Number.isFinite(home) && Number.isFinite(away)) {
      return { team1Odds: home, team2Odds: away };
    }
  }

  return null;
}

async function fetchMarketOdds(team1: string, team2: string, matchId: string) {
  const endpoint = process.env.RAINBET_ODDS_API_URL ?? process.env.ODDS_API_URL;
  if (!endpoint) {
    return null;
  }

  try {
    const url = new URL(endpoint);
    url.searchParams.set("team1", team1);
    url.searchParams.set("team2", team2);
    url.searchParams.set("matchId", matchId);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(process.env.ODDS_API_KEY ? { "x-api-key": process.env.ODDS_API_KEY } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    return readOddsPayload(payload);
  } catch {
    return null;
  }
}

export async function getBettingProbabilities(input: OddsInput): Promise<OddsResult> {
  const market = await fetchMarketOdds(input.team1, input.team2, input.matchId);
  if (market) {
    const probabilities = fromDecimalOdds(market.team1Odds, market.team2Odds);
    if (probabilities) {
      return {
        ...probabilities,
        team1Odds: market.team1Odds,
        team2Odds: market.team2Odds,
        source: process.env.RAINBET_ODDS_API_URL ? "rainbet" : "market-api",
      };
    }
  }

  const fallback = normalizePercents(input.fallbackTeam1, input.fallbackTeam2);
  return {
    ...fallback,
    source: "community-fallback",
  };
}
