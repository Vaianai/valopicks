import { load } from "cheerio";
import { MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ScrapedMatch = {
  team1: string;
  team2: string;
  event: string;
  startTime: Date;
  status: MatchStatus;
};

type ScrapedPlayer = {
  handle: string;
  teamName: string;
  kills: number;
  deaths: number;
  assists: number;
};

export type VlrMatchLive = {
  id: string;
  event: string;
  eventSeries?: string;
  eventStage?: string;
  startTime: string;
  dateLabel?: string;
  timeLabel?: string;
  statusLabel?: string;
  matchUrl?: string;
  leagueIconUrl?: string;
  bettingSource?: string;
  team1: { name: string; shortName: string; logoUrl?: string; score?: number };
  team2: { name: string; shortName: string; logoUrl?: string; score?: number };
  status: "LIVE" | "SCHEDULED" | "FINISHED";
  communityTeam1Pick: number;
  communityTeam2Pick: number;
  predictions: [];
};

export type VlrMatchDetail = {
  id: string;
  event: string;
  status: "LIVE" | "SCHEDULED" | "FINISHED";
  startTime: string;
  team1: { name: string; shortName: string; logoUrl?: string; score?: number };
  team2: { name: string; shortName: string; logoUrl?: string; score?: number };
  maps: Array<{ name: string; team1Score: number; team2Score: number }>;
  stats: {
    columns: string[];
    rows: Array<{
      player: string;
      team: string;
      country?: string;
      countryCode?: string;
      agents?: Array<{ name: string; iconUrl: string }>;
      values: string[];
    }>;
  };
  statsByMap?: Array<{
    map: string;
    columns: string[];
    rows: Array<{
      player: string;
      team: string;
      country?: string;
      countryCode?: string;
      agents?: Array<{ name: string; iconUrl: string }>;
      values: string[];
    }>;
  }>;
};

export type VlrHealthStatus = {
  state: "ok" | "down" | "cooldown";
  message?: string;
  failureCount: number;
  lastFailureAt?: string;
  cooldownUntil?: string;
};

const FETCH_TIMEOUT_MS = 9_000;
const LIVE_CACHE_TTL_MS = 25_000;
const BASE_COOLDOWN_MS = 45_000;
const MAX_COOLDOWN_MS = 5 * 60_000;
const MAX_DETAIL_LOGO_FETCHES = 8;

let consecutiveFailures = 0;
let lastFailureAtMs = 0;
let cooldownUntilMs = 0;
let lastFailureMessage = "";

let liveMatchesCache: { expiresAtMs: number; matches: VlrMatchLive[] } | null = null;
let liveMatchesInFlight: Promise<VlrMatchLive[]> | null = null;
const htmlInFlightByUrl = new Map<string, Promise<string>>();

const TEAM_SHORT_OVERRIDES: Record<string, string> = {
  "nongshim redforce": "NS",
  nongshim: "NS",
  sentinels: "SEN",
  "gen.g": "GEN",
  geng: "GEN",
  "team heretics": "TH",
  heretics: "TH",
  "karmine corp": "KC",
  "team liquid": "TL",
  liquid: "TL",
  "natus vincere": "NAVI",
  "navi": "NAVI",
  vitality: "VIT",
  bbl: "BBL",
  "bbl esports": "BBL",
  "fut esports": "FUT",
  fut: "FUT",
  "giantx": "GX",
  "team secret": "TS",
  "global esports": "GE",
  "rex regum qeon": "RRQ",
  "talon esports": "TLN",
  "detonation focusme": "DFM",
  "zeta division": "ZETA",
  "edward gaming": "EDG",
  trace: "TEC",
  "trace esports": "TEC",
  "wolves esports": "WOL",
  "nova esports": "NOVA",
  "all gamers": "AG",
  "bilibili gaming": "BLG",
  "dragon ranger gaming": "DRG",
  "m80": "M80",
  "g2 esports": "G2",
  g2: "G2",
  "nrg": "NRG",
  "100 thieves": "100T",
  "evil geniuses": "EG",
  loud: "LOUD",
  "paper rex": "PRX",
  fnatic: "FNC",
  drx: "DRX",
  t1: "T1",
};

function resolveAsset(url?: string) {
  if (!url) {
    return undefined;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  const base = process.env.VLR_BASE_URL ?? "https://www.vlr.gg";
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

function toVlrId(href: string, index: number) {
  const match = href.match(/\/(\d+)(?:\/|$)/);
  if (match?.[1]) {
    return `vlr-${match[1]}`;
  }

  return `vlr-live-${index + 1}`;
}

function fromVlrId(id: string) {
  const match = id.match(/^vlr-(\d+)$/);
  return match?.[1] ?? null;
}

function parseRowTeams($: ReturnType<typeof load>, element: unknown) {
  const root = $(element as never);

  const team1Name =
    root.find(".match-item-vs-team.mod-1 .match-item-vs-team-name, .match-item-vs-team.mod-1 .text-of").first().text().trim() ||
    root.find(".match-item-vs-team-name").eq(0).text().trim();

  const team2Name =
    root.find(".match-item-vs-team.mod-2 .match-item-vs-team-name, .match-item-vs-team.mod-2 .text-of").first().text().trim() ||
    root.find(".match-item-vs-team-name").eq(1).text().trim();

  const team1Logo =
    root.find(".match-item-vs-team.mod-1 img, .match-item-vs-team-logo.mod-1 img, .match-item-vs-team-logo img").first().attr("src")?.trim() ||
    root.find(".match-item-vs-team img").eq(0).attr("src")?.trim() ||
    "";

  const team2Logo =
    root.find(".match-item-vs-team.mod-2 img, .match-item-vs-team-logo.mod-2 img").first().attr("src")?.trim() ||
    root.find(".match-item-vs-team img").eq(1).attr("src")?.trim() ||
    "";

  return {
    team1Name,
    team2Name,
    team1Logo: resolveAsset(team1Logo),
    team2Logo: resolveAsset(team2Logo),
  };
}

function normalizeTeamShort(name: string) {
  const normalizedKey = name.trim().toLowerCase();
  if (TEAM_SHORT_OVERRIDES[normalizedKey]) {
    return TEAM_SHORT_OVERRIDES[normalizedKey];
  }

  const compactOriginal = name.replace(/\s+/g, "").trim();
  if (/^[A-Z0-9]{2,5}$/.test(compactOriginal)) {
    return compactOriginal;
  }

  const upperTokens = name.match(/\b[A-Z0-9]{2,5}\b/g)?.filter((token) => token.length >= 2) ?? [];
  if (upperTokens.length > 0) {
    return upperTokens[0];
  }

  const words = name
    .replace(/[^a-zA-Z0-9 .-]/g, " ")
    .split(/[\s.-]+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 3);
  }

  const compact = words[0] ?? name;
  return compact.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase();
}

function parseStatsTableRows($: ReturnType<typeof load>, tableNode: unknown) {
  const root = $(tableNode as never);

  const columns = root
    .find("thead th")
    .map((_: number, node: unknown) => $(node as never).text().trim())
    .get()
    .filter(Boolean);

  const rows = root
    .find("tbody tr")
    .map((_: number, statNode: unknown) => {
      const player = $(statNode as never)
        .find("td.mod-player a, td:nth-child(1) a, .text-of")
        .first()
        .text()
        .trim();
      const team = $(statNode as never)
        .find("td.mod-player .ge-text-light, td:nth-child(2), .team")
        .first()
        .text()
        .trim();
      const country = $(statNode as never).find("td.mod-player img.flag, img.flag").first().attr("title")?.trim();
      const countryFlagSrc = $(statNode as never).find("td.mod-player img.flag, img.flag").first().attr("src")?.trim() ?? "";
      const countryCode = countryFlagSrc.match(/\/([a-z]{2})\.(?:png|svg)/i)?.[1]?.toUpperCase();

      const agents = $(statNode as never)
        .find("td.mod-agents img, .mod-agents img, .mod-player-agent img")
        .map((__: number, imgNode: unknown) => {
          const name = $(imgNode as never).attr("alt")?.trim() || "Agent";
          const iconUrl = resolveAsset($(imgNode as never).attr("src")?.trim());
          if (!iconUrl) {
            return null;
          }
          return { name, iconUrl };
        })
        .get()
        .filter(Boolean) as Array<{ name: string; iconUrl: string }>;

      if (!player) {
        return null;
      }

      const values = $(statNode as never)
        .find("td")
        .map((__: number, cellNode: unknown) => $(cellNode as never).text().replace(/\s+/g, " ").trim())
        .get()
        .filter(Boolean)
        .slice(1);

      return {
        player,
        team: team || "UNK",
        country,
        countryCode,
        agents,
        values,
      };
    })
    .get()
    .filter(Boolean) as Array<{
    player: string;
    team: string;
    country?: string;
    countryCode?: string;
    agents?: Array<{ name: string; iconUrl: string }>;
    values: string[];
  }>;

  return { columns, rows };
}

function markVlrSuccess() {
  consecutiveFailures = 0;
  cooldownUntilMs = 0;
  lastFailureMessage = "";
}

function markVlrFailure(message: string) {
  consecutiveFailures += 1;
  lastFailureAtMs = Date.now();
  lastFailureMessage = message;

  const cooldown = Math.min(BASE_COOLDOWN_MS * Math.max(1, consecutiveFailures), MAX_COOLDOWN_MS);
  cooldownUntilMs = Date.now() + cooldown;
}

export function getVlrHealthStatus(): VlrHealthStatus {
  const now = Date.now();

  if (cooldownUntilMs > now) {
    return {
      state: "cooldown",
      message: "vlr.gg is down or rate-limited. Retrying shortly.",
      failureCount: consecutiveFailures,
      lastFailureAt: lastFailureAtMs ? new Date(lastFailureAtMs).toISOString() : undefined,
      cooldownUntil: new Date(cooldownUntilMs).toISOString(),
    };
  }

  if (consecutiveFailures > 0) {
    return {
      state: "down",
      message: lastFailureMessage || "vlr.gg is down right now.",
      failureCount: consecutiveFailures,
      lastFailureAt: lastFailureAtMs ? new Date(lastFailureAtMs).toISOString() : undefined,
    };
  }

  return {
    state: "ok",
    failureCount: 0,
  };
}

async function fetchMatchTeamsFromDetails(matchUrl?: string) {
  if (!matchUrl) {
    return null;
  }

  try {
    const html = await fetchHtml(matchUrl);
    const $ = load(html);

    const team1Name =
      $(".match-header-link-name.mod-1 .wf-title-med, .match-header-vs-team.mod-1 .wf-title-med, .match-header-vs-team.mod-1 .team-name")
        .first()
        .text()
        .trim() || undefined;
    const team2Name =
      $(".match-header-link-name.mod-2 .wf-title-med, .match-header-vs-team.mod-2 .wf-title-med, .match-header-vs-team.mod-2 .team-name")
        .first()
        .text()
        .trim() || undefined;

    const team1Logo = resolveAsset(
      $(".match-header-vs-team.mod-1 img, .match-header-link.mod-1 img").first().attr("src")?.trim(),
    );
    const team2Logo = resolveAsset(
      $(".match-header-vs-team.mod-2 img, .match-header-link.mod-2 img").first().attr("src")?.trim(),
    );

    return {
      team1Name,
      team2Name,
      team1Logo,
      team2Logo,
    };
  } catch {
    return null;
  }
}

async function fetchHtml(url: string) {
  if (cooldownUntilMs > Date.now()) {
    throw new Error("VLR_COOLDOWN_ACTIVE");
  }

  const inFlight = htmlInFlightByUrl.get(url);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "ValoPicksBot/1.0 (+https://valopicks.app)",
          Accept: "text/html,application/xhtml+xml",
        },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const message =
          response.status === 429
            ? "vlr.gg is rate-limiting requests."
            : response.status >= 500
              ? "vlr.gg is down right now."
              : `Failed VLR fetch: ${url} (${response.status})`;

        markVlrFailure(message);
        throw new Error(message);
      }

      const body = await response.text();
      markVlrSuccess();
      return body;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        markVlrFailure("vlr.gg timed out.");
        throw new Error("vlr.gg timed out.");
      }

      if (error instanceof Error && error.message === "VLR_COOLDOWN_ACTIVE") {
        throw error;
      }

      if (error instanceof Error && error.message) {
        if (!error.message.includes("vlr.gg") && !error.message.includes("Failed VLR fetch")) {
          markVlrFailure("vlr.gg is unavailable.");
        }
        throw error;
      }

      markVlrFailure("vlr.gg is unavailable.");
      throw error;
    } finally {
      clearTimeout(timeout);
      htmlInFlightByUrl.delete(url);
    }
  })();

  htmlInFlightByUrl.set(url, request);
  return request;
}

function parseMatches(html: string): ScrapedMatch[] {
  const $ = load(html);
  const rows: ScrapedMatch[] = [];

  $("a.wf-module-item, a.match-item, .wf-card a").each((_, element) => {
    const teamNames = $(element)
      .find(".match-item-vs-team-name, .match-item-vs-team .text-of")
      .map((__, n) => $(n).text().trim())
      .get()
      .filter(Boolean);

    if (teamNames.length < 2) {
      return;
    }

    const event =
      $(element).find(".match-item-event, .match-item-event-series").first().text().trim() || "VLR Event";

    const statusText = $(element).find(".ml-status, .match-item-time").first().text().toLowerCase();
    const status = statusText.includes("live") ? MatchStatus.LIVE : MatchStatus.SCHEDULED;

    rows.push({
      team1: teamNames[0],
      team2: teamNames[1],
      event,
      startTime: new Date(Date.now() + rows.length * 30 * 60 * 1000),
      status,
    });
  });

  return rows.slice(0, 24);
}

function parseLiveMatches(html: string): VlrMatchLive[] {
  const $ = load(html);
  const rows: VlrMatchLive[] = [];

  let currentDateLabel = "Today";

  $(".wf-label.mod-large").each((_, labelNode) => {
    const labelText = $(labelNode).text().trim();
    if (labelText) {
      currentDateLabel = labelText;
    }

    $(labelNode)
      .nextUntil(".wf-label.mod-large")
      .find("a.wf-module-item.match-item, a.match-item")
      .each((index, element) => {
        const href = $(element).attr("href")?.trim() ?? "";
        const matchUrl = resolveAsset(href);
        const id = toVlrId(href, rows.length + index);

        const { team1Name, team2Name, team1Logo, team2Logo } = parseRowTeams($, element);

        if (!team1Name || !team2Name) {
          return;
        }

        const eventSeries = $(element).find(".match-item-event, .match-item-event-series").first().text().trim();
        const eventStage = $(element).find(".match-item-event-series, .match-item-event-info").last().text().trim();

        const timeLabel = $(element).find(".match-item-time").first().text().trim();
        const statusLabel = $(element).find(".ml-status").first().text().trim() || timeLabel;
        const loweredStatus = statusLabel.toLowerCase();
        const status = loweredStatus.includes("live") ? "LIVE" : loweredStatus.includes("final") ? "FINISHED" : "SCHEDULED";

        const leagueIcon =
          $(element).find(".match-item-icon img, .match-item-event img").first().attr("src")?.trim() ?? "";

        rows.push({
          id,
          event: eventSeries || eventStage || "VLR Match",
          eventSeries: eventSeries || "VLR",
          eventStage: eventStage || undefined,
          startTime: new Date(Date.now() + rows.length * 30 * 60 * 1000).toISOString(),
          dateLabel: currentDateLabel,
          timeLabel,
          statusLabel,
          matchUrl,
          leagueIconUrl: resolveAsset(leagueIcon),
          team1: {
            name: team1Name,
            shortName: normalizeTeamShort(team1Name),
            logoUrl: team1Logo,
          },
          team2: {
            name: team2Name,
            shortName: normalizeTeamShort(team2Name),
            logoUrl: team2Logo,
          },
          status,
          communityTeam1Pick: 50,
          communityTeam2Pick: 50,
          predictions: [],
        });
      });
  });

  if (rows.length === 0) {
    $("a.wf-module-item.match-item, a.match-item").each((index, element) => {
      const href = $(element).attr("href")?.trim() ?? "";
      const id = toVlrId(href, index);
      const { team1Name, team2Name, team1Logo, team2Logo } = parseRowTeams($, element);

      if (!team1Name || !team2Name) {
        return;
      }

      rows.push({
        id,
        event: $(element).find(".match-item-event-series, .match-item-event").first().text().trim() || "VLR Match",
        startTime: new Date(Date.now() + index * 30 * 60 * 1000).toISOString(),
        dateLabel: "Today",
        timeLabel: $(element).find(".match-item-time").first().text().trim(),
        team1: { name: team1Name, shortName: normalizeTeamShort(team1Name), logoUrl: team1Logo },
        team2: { name: team2Name, shortName: normalizeTeamShort(team2Name), logoUrl: team2Logo },
        status: "SCHEDULED",
        communityTeam1Pick: 50,
        communityTeam2Pick: 50,
        predictions: [],
      });
    });
  }

  return rows.slice(0, 30);
}

export async function fetchVlrMatchesLive() {
  const now = Date.now();
  if (liveMatchesCache && liveMatchesCache.expiresAtMs > now) {
    return liveMatchesCache.matches;
  }

  if (liveMatchesInFlight) {
    return liveMatchesInFlight;
  }

  liveMatchesInFlight = (async () => {
  const base = process.env.VLR_BASE_URL ?? "https://www.vlr.gg";
    const matchesHtml = await fetchHtml(`${base}/matches`);
    const parsed = parseLiveMatches(matchesHtml);

    let detailFetchCount = 0;

    const withResolvedLogos = await Promise.all(
      parsed.map(async (match) => {
        if (match.team1.logoUrl && match.team2.logoUrl) {
          return match;
        }

        if (detailFetchCount >= MAX_DETAIL_LOGO_FETCHES) {
          return match;
        }

        detailFetchCount += 1;

        const detailTeams = await fetchMatchTeamsFromDetails(match.matchUrl);
        if (!detailTeams) {
          return match;
        }

        return {
          ...match,
          team1: {
            ...match.team1,
            name: detailTeams.team1Name || match.team1.name,
            shortName: normalizeTeamShort(detailTeams.team1Name || match.team1.name),
            logoUrl: detailTeams.team1Logo || match.team1.logoUrl,
          },
          team2: {
            ...match.team2,
            name: detailTeams.team2Name || match.team2.name,
            shortName: normalizeTeamShort(detailTeams.team2Name || match.team2.name),
            logoUrl: detailTeams.team2Logo || match.team2.logoUrl,
          },
        };
      }),
    );

    liveMatchesCache = {
      expiresAtMs: Date.now() + LIVE_CACHE_TTL_MS,
      matches: withResolvedLogos,
    };

    return withResolvedLogos;
  })();

  try {
    return await liveMatchesInFlight;
  } finally {
    liveMatchesInFlight = null;
  }
}

export async function fetchVlrMatchDetails(matchId: string): Promise<VlrMatchDetail | null> {
  const numericId = fromVlrId(matchId);
  if (!numericId) {
    return null;
  }

  const base = process.env.VLR_BASE_URL ?? "https://www.vlr.gg";

  try {
    const html = await fetchHtml(`${base}/${numericId}`);
    const $ = load(html);

    const teamNames = $(
      ".match-header-vs-team .wf-title-med, .match-header-link-name.mod-1 .wf-title-med, .match-header-link-name.mod-2 .wf-title-med",
    )
      .map((_, node) => $(node).text().trim())
      .get()
      .filter(Boolean);

    const team1Name = teamNames[0] ?? "Team 1";
    const team2Name = teamNames[1] ?? "Team 2";

    const scoreNodes = $(".match-header-vs-score .js-spoiler, .match-header-vs-score .match-header-vs-score-score")
      .map((_, node) => Number.parseInt($(node).text().trim(), 10))
      .get()
      .filter((value) => Number.isFinite(value));

    const mapRows = $(".vm-stats-game, .vm-stats-gamesnav-item")
      .map((_, mapNode) => {
        const name = $(mapNode).find(".map .text-of, .map, .vm-stats-gamesnav-item-name").first().text().trim() || "Map";
        const scores = $(mapNode)
          .find(".score, .team span, .vm-stats-gamesnav-item-score")
          .map((__, scoreNode) => Number.parseInt($(scoreNode).text().trim(), 10))
          .get()
          .filter((value) => Number.isFinite(value));

        return {
          name,
          team1Score: scores[0] ?? 0,
          team2Score: scores[1] ?? 0,
        };
      })
      .get()
      .slice(0, 5);

    let statsColumns = $(".wf-table.mod-overview thead th, .vm-stats-table thead th")
      .map((_, node) => $(node).text().trim())
      .get()
      .filter(Boolean);

    if (statsColumns.length === 0) {
      const candidate = $("table")
        .toArray()
        .find((tableNode) => {
          const headers = $(tableNode)
            .find("thead th")
            .map((_, node) => $(node).text().trim().toUpperCase())
            .get();

          return headers.includes("ACS") || headers.includes("KAST") || headers.includes("ADR");
        });

      if (candidate) {
        statsColumns = $(candidate).find("thead th").map((_, node) => $(node).text().trim()).get().filter(Boolean);
      }
    }

    const statsRows = $(".wf-table.mod-overview tbody tr, .vm-stats-table tbody tr")
      .map((_, statNode) => {
        const player = $(statNode)
          .find("td.mod-player a, td:nth-child(1) a, .text-of")
          .first()
          .text()
          .trim();
        const team = $(statNode)
          .find("td.mod-player .ge-text-light, td:nth-child(2), .team")
          .first()
          .text()
          .trim();
        const country = $(statNode).find("td.mod-player img.flag, img.flag").first().attr("title")?.trim();
        const countryFlagSrc = $(statNode).find("td.mod-player img.flag, img.flag").first().attr("src")?.trim() ?? "";
        const countryCode = countryFlagSrc.match(/\/([a-z]{2})\.(?:png|svg)/i)?.[1]?.toUpperCase();

        const agents = $(statNode)
          .find("td.mod-agents img, .mod-agents img, .mod-player-agent img")
          .map((__, imgNode) => {
            const name = $(imgNode).attr("alt")?.trim() || "Agent";
            const iconUrl = resolveAsset($(imgNode).attr("src")?.trim());
            if (!iconUrl) {
              return null;
            }
            return { name, iconUrl };
          })
          .get()
          .filter(Boolean) as Array<{ name: string; iconUrl: string }>;

        if (!player) {
          return null;
        }

        const values = $(statNode)
          .find("td")
          .map((__, cellNode) => $(cellNode).text().replace(/\s+/g, " ").trim())
          .get()
          .filter(Boolean)
          .slice(1);

        return {
          player,
          team: team || "UNK",
          country,
          countryCode,
          agents,
          values,
        };
      })
      .get()
      .filter(Boolean) as Array<{
      player: string;
      team: string;
      country?: string;
      countryCode?: string;
      agents?: Array<{ name: string; iconUrl: string }>;
      values: string[];
    }>;

    const statsByMap = mapRows
      .map((map, index) => {
        const tableNode = $(".vm-stats-table, .wf-table.mod-overview")
          .toArray()
          .find((node, nodeIndex) => nodeIndex === index + 1) ?? $(".vm-stats-table, .wf-table.mod-overview").toArray()[index];

        if (!tableNode) {
          return null;
        }

        const parsed = parseStatsTableRows($, tableNode);
        if (parsed.rows.length === 0) {
          return null;
        }

        return {
          map: map.name,
          columns: parsed.columns,
          rows: parsed.rows,
        };
      })
      .filter(Boolean) as Array<{
      map: string;
      columns: string[];
      rows: Array<{
        player: string;
        team: string;
        country?: string;
        countryCode?: string;
        agents?: Array<{ name: string; iconUrl: string }>;
        values: string[];
      }>;
    }>;

    if (statsRows.length === 0) {
      const genericRows = $("table tbody tr")
        .map((_, statNode) => {
          const player = $(statNode).find("td.mod-player a, td:nth-child(1) a").first().text().trim();
          const team = $(statNode).find("td.mod-player .ge-text-light, td:nth-child(2)").first().text().trim();
          const kills = Number.parseInt($(statNode).find("td.mod-kills, td:nth-child(4)").first().text().trim(), 10);
          const deaths = Number.parseInt($(statNode).find("td.mod-deaths, td:nth-child(5)").first().text().trim(), 10);
          const assists = Number.parseInt($(statNode).find("td.mod-assists, td:nth-child(6)").first().text().trim(), 10);

          if (!player) {
            return null;
          }

          return {
            player,
            team: team || "UNK",
            values: [
              Number.isFinite(kills) ? String(kills) : "0",
              Number.isFinite(deaths) ? String(deaths) : "0",
              Number.isFinite(assists) ? String(assists) : "0",
            ],
          };
        })
        .get()
        .filter(Boolean) as Array<{ player: string; team: string; values: string[] }>;

      if (genericRows.length > 0) {
        statsColumns = ["K", "D", "A"];
        genericRows.forEach((row) => {
          statsRows.push({ ...row, country: undefined });
        });
      }
    }

    const statusText = $(".match-header-vs-note").first().text().trim().toLowerCase();
    const status = statusText.includes("live") ? "LIVE" : statusText.includes("final") ? "FINISHED" : "SCHEDULED";

    const inferredTags = Array.from(
      new Set(
        statsRows
          .map((row) => row.team.trim().toUpperCase())
          .filter((value) => /^[A-Z0-9]{2,5}$/.test(value)),
      ),
    );

    const inferredTeam1Short = inferredTags[0] ?? normalizeTeamShort(team1Name);
    const inferredTeam2Short = inferredTags[1] ?? normalizeTeamShort(team2Name);

    return {
      id: matchId,
      event: $(".match-header-event .text-of, .match-header-event").first().text().trim() || "VLR Match",
      status,
      startTime: new Date().toISOString(),
      team1: {
        name: team1Name,
        shortName: inferredTeam1Short,
        logoUrl: resolveAsset($(".match-header-vs-team.mod-1 img").first().attr("src")?.trim()),
        score: scoreNodes[0],
      },
      team2: {
        name: team2Name,
        shortName: inferredTeam2Short,
        logoUrl: resolveAsset($(".match-header-vs-team.mod-2 img").first().attr("src")?.trim()),
        score: scoreNodes[1],
      },
      maps: mapRows,
      stats: {
        columns: statsColumns,
        rows: statsRows,
      },
      statsByMap,
    };
  } catch {
    const live = await fetchVlrMatchesLive().catch(() => []);
    const fallback = live.find((match) => match.id === matchId);
    if (!fallback) {
      return null;
    }

    return {
      id: fallback.id,
      event: fallback.event,
      status: fallback.status,
      startTime: fallback.startTime,
      team1: fallback.team1,
      team2: fallback.team2,
      maps: [],
      stats: {
        columns: ["K", "D", "A"],
        rows: [],
      },
    };
  }
}

function parsePlayers(html: string): ScrapedPlayer[] {
  const $ = load(html);
  const rows: ScrapedPlayer[] = [];

  $("table tbody tr").each((_, row) => {
    const handle = $(row).find("td.mod-player a, td:nth-child(1) a").first().text().trim();
    const teamName = $(row).find("td.mod-player .ge-text-light, td:nth-child(2)").first().text().trim() || "Unknown";
    const killsText = $(row).find("td.mod-kills, td:nth-child(4)").first().text().trim();
    const deathsText = $(row).find("td.mod-deaths, td:nth-child(5)").first().text().trim();
    const assistsText = $(row).find("td.mod-assists, td:nth-child(6)").first().text().trim();

    if (!handle) {
      return;
    }

    const kills = Number.parseInt(killsText, 10);
    const deaths = Number.parseInt(deathsText, 10);
    const assists = Number.parseInt(assistsText, 10);

    rows.push({
      handle,
      teamName,
      kills: Number.isNaN(kills) ? 0 : kills,
      deaths: Number.isNaN(deaths) ? 0 : deaths,
      assists: Number.isNaN(assists) ? 0 : assists,
    });
  });

  return rows.slice(0, 120);
}

async function upsertTeam(name: string) {
  const existing = await prisma.team.findFirst({
    where: {
      OR: [{ name }, { shortName: normalizeTeamShort(name) }],
    },
  });

  if (existing) {
    if (existing.name !== name) {
      return prisma.team.update({
        where: { id: existing.id },
        data: { name },
      });
    }
    return existing;
  }

  return prisma.team.create({
    data: {
      name,
      shortName: normalizeTeamShort(name),
      winRate: 0,
    },
  });
}

export async function syncVlrData() {
  const base = process.env.VLR_BASE_URL ?? "https://www.vlr.gg";
  const tournament = await prisma.tournament.upsert({
    where: { slug: "vlr-auto" },
    update: { featured: true, endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    create: {
      name: "VLR Auto Sync",
      slug: "vlr-auto",
      featured: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const [matchesHtml, playersHtml] = await Promise.all([
    fetchHtml(`${base}/matches`),
    fetchHtml(`${base}/stats`),
  ]);

  const matches = parseMatches(matchesHtml);
  const players = parsePlayers(playersHtml);

  let matchUpdates = 0;
  let playerUpdates = 0;

  for (const item of matches) {
    const [team1, team2] = await Promise.all([upsertTeam(item.team1), upsertTeam(item.team2)]);

    const existing = await prisma.match.findFirst({
      where: {
        team1Id: team1.id,
        team2Id: team2.id,
        event: item.event,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await prisma.match.update({
        where: { id: existing.id },
        data: {
          status: item.status,
          startTime: item.startTime,
          tournamentId: tournament.id,
        },
      });
    } else {
      await prisma.match.create({
        data: {
          event: item.event,
          status: item.status,
          startTime: item.startTime,
          bestOf: 3,
          mapPool: [],
          team1Id: team1.id,
          team2Id: team2.id,
          tournamentId: tournament.id,
        },
      });
    }

    matchUpdates += 1;
  }

  for (const item of players) {
    const team = await upsertTeam(item.teamName);
    const fantasyPrice = Math.max(8, Math.min(35, Math.round(item.kills * 0.15 + item.assists * 0.08 - item.deaths * 0.03)));

    await prisma.player.upsert({
      where: { handle: item.handle },
      update: {
        teamId: team.id,
        fantasyPrice,
      },
      create: {
        handle: item.handle,
        fullName: item.handle,
        role: "Flex",
        teamId: team.id,
        fantasyPrice,
      },
    });

    playerUpdates += 1;
  }

  return {
    ok: true,
    matchUpdates,
    playerUpdates,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Extended endpoints (added by rebuild) ────────────────────────────
const RANKINGS_CACHE = new Map<string, { at: number; data: unknown[] }>();
const RANKINGS_TTL = 60 * 60 * 1000;

export async function fetchVlrRankings(region: string): Promise<unknown[]> {
  const cached = RANKINGS_CACHE.get(region);
  if (cached && Date.now() - cached.at < RANKINGS_TTL) return cached.data;

  const regionSlug: Record<string, string> = {
    na: "north-america", eu: "europe", emea: "europe",
    ap: "asia-pacific", pacific: "asia-pacific",
    kr: "korea", br: "brazil", la: "latin-america", oce: "oceania",
  };
  const slug = regionSlug[region.toLowerCase()] ?? region;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const res = await fetch(`https://www.vlr.gg/rankings/${slug}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ValoPicks/1.0)" },
    signal: controller.signal,
  });
  clearTimeout(timeout);
  const html = await res.text();
  const $ = load(html);
  const rankings: unknown[] = [];
  $(".rank-item").each((_, el) => {
    const $el = $(el);
    const rank = $el.find(".rank-item-rank-num").text().trim();
    const team = $el.find(".rank-item-team-name").text().trim();
    const record = $el.find(".rank-item-team-val").first().text().trim();
    const logo = $el.find("img.team-img").attr("src") ?? "";
    if (team) rankings.push({ rank, team, record, logo: logo ? `https:${logo}` : null });
  });
  RANKINGS_CACHE.set(region, { at: Date.now(), data: rankings });
  return rankings;
}

const STATS_CACHE = new Map<string, { at: number; data: unknown[] }>();
const STATS_TTL = 30 * 60 * 1000;

export async function fetchVlrStats(region: string, timespan: string): Promise<unknown[]> {
  const key = `${region}:${timespan}`;
  const cached = STATS_CACHE.get(key);
  if (cached && Date.now() - cached.at < STATS_TTL) return cached.data;

  const url = `https://www.vlr.gg/stats/?event_group_id=all&region=${region}&country=all&min_rounds=200&min_rating=1550&agent=all&map_id=all&timespan=${timespan}d`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ValoPicks/1.0)" },
    signal: controller.signal,
  });
  clearTimeout(timeout);
  const html = await res.text();
  const $ = load(html);
  const stats: unknown[] = [];
  $("tr").each((_, el) => {
    const $el = $(el);
    const player = $el.find(".mod-player .text-of").text().trim();
    if (!player) return;
    const org = $el.find(".mod-player .ge-text-light").text().trim();
    const rating = $el.find(".mod-stat").eq(0).find(".color-sq").text().trim();
    const acs = $el.find(".mod-stat").eq(1).find(".color-sq").text().trim();
    const kd = $el.find(".mod-kd-diff").text().trim();
    const kast = $el.find(".mod-stat").eq(4).find(".color-sq").text().trim();
    const adr = $el.find(".mod-stat").eq(5).find(".color-sq").text().trim();
    const hs = $el.find(".mod-stat").eq(6).find(".color-sq").text().trim();
    const fb = $el.find(".mod-first-bloods .color-sq").text().trim();
    stats.push({ player, org, rating, acs, kd, kast, adr, hs, firstBloods: fb });
  });
  STATS_CACHE.set(key, { at: Date.now(), data: stats });
  return stats;
}
