import { load } from "cheerio";
import type { VlrMatchLive } from "@/lib/vlr-scraper";

export type LiquipediaLeagueCatalogItem = {
  label: string;
  iconUrl?: string;
};

export type LiquipediaTeamRosterPlayer = {
  handle: string;
  fullName?: string;
  role?: string;
  country?: string;
  countryFlagUrl?: string;
};

export type LiquipediaPortalTeam = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  region: string;
  iconUrl?: string;
  roster: LiquipediaTeamRosterPlayer[];
};

const LIQUIPEDIA_BASE_URL = process.env.LP_BASE_URL ?? "https://liquipedia.net";
const LIQUIPEDIA_PAGE_CANDIDATES = [
  `${LIQUIPEDIA_BASE_URL}/valorant/Liquipedia:Matches?action=render`,
  `${LIQUIPEDIA_BASE_URL}/valorant/Portal:Matches?action=render`,
  `${LIQUIPEDIA_BASE_URL}/valorant/Main_Page?action=render`,
];

const LIVE_CACHE_TTL_MS = 40_000;
let liveMatchesCache: { expiresAtMs: number; matches: VlrMatchLive[] } | null = null;
let liveMatchesInFlight: Promise<VlrMatchLive[]> | null = null;

let leagueCatalogCache: { expiresAtMs: number; leagues: LiquipediaLeagueCatalogItem[] } | null = null;
let leagueCatalogInFlight: Promise<LiquipediaLeagueCatalogItem[]> | null = null;

let portalTeamsCache: { expiresAtMs: number; teams: LiquipediaPortalTeam[] } | null = null;
let portalTeamsInFlight: Promise<LiquipediaPortalTeam[]> | null = null;

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

  return `${LIQUIPEDIA_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function normalizeTeamShort(name: string) {
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

function toPortalTeamId(slug: string) {
  return `lp-team-${slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

function parsePortalTeams(html: string): LiquipediaPortalTeam[] {
  const $ = load(html);
  const parsed: LiquipediaPortalTeam[] = [];
  const regionIds = new Set([
    "North_America",
    "Europe",
    "CIS",
    "Turkey",
    "Korea",
    "Japan",
    "Southeast_Asia",
    "Brazil",
    "Latin_America_North",
    "Latin_America_South",
    "Middle_East_&_Africa",
    "China",
    "Oceania",
  ]);

  $("h4").each((_, headingNode) => {
    const heading = $(headingNode);
    const regionId = heading.attr("id")?.trim() ?? "";
    if (!regionIds.has(regionId)) {
      return;
    }

    const regionName = heading.text().replace(/\s+/g, " ").trim();
    const sectionRoot = heading.parent().nextAll(".toggle-group").first();
    if (sectionRoot.length === 0) {
      return;
    }

    sectionRoot.find("table.wikitable.collapsible").each((__, tableNode) => {
      const table = $(tableNode);

      const teamLink = table.find("tr").first().find(".team-template-text a").first();
      const teamName = teamLink.text().replace(/\s+/g, " ").trim();
      const teamHref = teamLink.attr("href")?.trim() ?? "";

      if (!teamName || !teamHref.includes("/valorant/")) {
        return;
      }

      const slug = teamHref.replace(/^.*\/valorant\//, "").replace(/#.*/, "").replace(/\?.*/, "");
      const iconUrl = resolveAsset(
        table
          .find("tr")
          .first()
          .find(".team-template-image-icon img")
          .first()
          .attr("src")
          ?.trim(),
      );

      const roster = table
        .find("tr")
        .slice(2)
        .map((___, rowNode) => {
          const row = $(rowNode);
          const cells = row.find("td");
          if (cells.length < 1) {
            return null;
          }

          const handle = cells.eq(0).find("a").last().text().replace(/\s+/g, " ").trim();
          if (!handle) {
            return null;
          }

          const fullName = cells.eq(1).text().replace(/\s+/g, " ").trim() || undefined;
          const role = cells.eq(2).text().replace(/\s+/g, " ").trim() || undefined;
          const country = cells.eq(0).find(".flag a").first().attr("title")?.trim() || undefined;
          const countryFlagUrl = resolveAsset(cells.eq(0).find(".flag img").first().attr("src")?.trim());

          return {
            handle,
            fullName,
            role,
            country,
            countryFlagUrl,
          } satisfies LiquipediaTeamRosterPlayer;
        })
        .get()
        .filter(Boolean) as LiquipediaTeamRosterPlayer[];

      parsed.push({
        id: toPortalTeamId(slug),
        slug,
        name: teamName,
        shortName: normalizeTeamShort(teamName),
        region: regionName,
        iconUrl,
        roster,
      });
    });
  });

  const unique = new Map<string, LiquipediaPortalTeam>();
  parsed.forEach((team) => {
    const key = team.slug.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, team);
      return;
    }

    const existing = unique.get(key);
    if (!existing) {
      return;
    }

    if ((team.roster?.length ?? 0) > (existing.roster?.length ?? 0)) {
      unique.set(key, team);
    }
  });

  return Array.from(unique.values()).slice(0, 800);
}

function toLpId(href: string, index: number) {
  const clean = href
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+/, "")
    .replace(/\?.*$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return `lp-${clean || `match-${index + 1}`}`;
}

function parseTeamsFromRow($: ReturnType<typeof load>, row: unknown) {
  const root = $(row as never);

  const leftName =
    root.find(".team-left .team-template-text, td.team-left .team-template-text, .team-left .name, td.team-left a").first().text().trim() ||
    undefined;

  const rightName =
    root.find(".team-right .team-template-text, td.team-right .team-template-text, .team-right .name, td.team-right a").first().text().trim() ||
    undefined;

  if (leftName && rightName) {
    return {
      team1Name: leftName,
      team2Name: rightName,
      team1Logo: resolveAsset(root.find(".team-left img, td.team-left img").first().attr("src")?.trim()),
      team2Logo: resolveAsset(root.find(".team-right img, td.team-right img").first().attr("src")?.trim()),
    };
  }

  const names = root
    .find(
      ".team-template-text, .team-template-team-standard .name, .team-template-team-standard a, .match-info-header-opponent-left .name a, .match-info-header-opponent:not(.match-info-header-opponent-left) .name a, .match-info-header-opponent .name",
    )
    .map((_, node) => $(node).text().trim())
    .get()
    .filter(Boolean);

  if (names.length >= 2) {
    return {
      team1Name: names[0],
      team2Name: names[1],
      team1Logo: resolveAsset(root.find("img").eq(0).attr("src")?.trim()),
      team2Logo: resolveAsset(root.find("img").eq(1).attr("src")?.trim()),
    };
  }

  return null;
}

function parseStatus(text: string): "LIVE" | "SCHEDULED" | "FINISHED" {
  const lowered = text.toLowerCase();

  if (lowered.includes("live") || lowered.includes("ongoing")) {
    return "LIVE";
  }

  if (lowered.includes("finished") || lowered.includes("completed") || lowered.includes("final")) {
    return "FINISHED";
  }

  return "SCHEDULED";
}

function getStatusFromNode($: ReturnType<typeof load>, row: ReturnType<ReturnType<typeof load>>) {
  const timerFinished = row.find(".timer-object").first().attr("data-finished")?.trim().toLowerCase();
  if (timerFinished === "finished") {
    return "FINISHED" as const;
  }

  const explicitLive = row.find(".live, .match-live, .match-status-live").first().text().trim().toLowerCase();
  if (explicitLive.includes("live")) {
    return "LIVE" as const;
  }

  const rowText = row.text().replace(/\s+/g, " ").trim();
  return parseStatus(rowText);
}

function rankMatchForDisplay(match: VlrMatchLive) {
  const now = Date.now();
  const startTimeMs = new Date(match.startTime).getTime();

  if (match.status === "LIVE") {
    return -2_000_000_000;
  }

  if (match.status === "SCHEDULED") {
    return Math.abs(startTimeMs - now);
  }

  return 1_000_000_000 + Math.abs(startTimeMs - now);
}

function parseLiquipediaMatches(html: string): VlrMatchLive[] {
  const $ = load(html);

  const rowNodes = $(
    "div.match-info, tr.match-row, tr[data-toggle-area-content], table.infobox_matches_content tr, table.wikitable tr, .panel-box .brkts-matchlist tr",
  ).toArray();

  const parsed: VlrMatchLive[] = [];

  rowNodes.forEach((rowNode, index) => {
    const row = $(rowNode);
    const teams = parseTeamsFromRow($, rowNode);

    if (!teams?.team1Name || !teams?.team2Name || teams.team1Name === teams.team2Name) {
      return;
    }

    const href =
      row.find("a[href*='/valorant/Match:']").first().attr("href")?.trim() ??
      row.find("a[href*='/valorant/'][title*='Match:']").first().attr("href")?.trim() ??
      row.find("a[href*='/valorant/']").first().attr("href")?.trim() ??
      "";
    const matchUrl = resolveAsset(href);
    const id = toLpId(href, index);

    const timestampRaw = row.find("[data-timestamp]").first().attr("data-timestamp")?.trim() ?? "";
    const parsedTimestamp = Number.parseInt(timestampRaw, 10);
    const timestampMs = Number.isFinite(parsedTimestamp)
      ? parsedTimestamp > 9_999_999_999
        ? parsedTimestamp
        : parsedTimestamp * 1000
      : Date.now() + index * 45 * 60 * 1000;

    const eventSeries =
      row.find(".match-info-tournament-name a span, .league-icon-small-image + span, .matchlist-tournament, .team-right + td a").first().text().trim() ||
      row
        .closest("table, .panel-box, .fo-nttax-infobox")
        .prevAll("h2, h3, h4, .panel-box-heading")
        .first()
        .text()
        .trim() ||
      "Liquipedia";

    const eventStage = row.find(".brkts-popup-header, .brkts-match-info, .match-info-tournament-name").first().text().trim() || undefined;

    const timeLabel = row.find(".timer-object, .match-countdown, .date-time").first().text().trim() || "TBD";

    const leagueIconUrl = resolveAsset(row.find(".league-icon-small-image img").first().attr("src")?.trim());

    parsed.push({
      id,
      event: eventSeries || "Liquipedia Match",
      eventSeries: eventSeries || "Liquipedia",
      eventStage,
      startTime: new Date(timestampMs).toISOString(),
      dateLabel: new Date(timestampMs).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
      timeLabel,
      statusLabel: row.find(".match-status").first().text().trim() || timeLabel,
      matchUrl,
      leagueIconUrl,
      team1: {
        name: teams.team1Name,
        shortName: normalizeTeamShort(teams.team1Name),
        logoUrl: teams.team1Logo,
      },
      team2: {
        name: teams.team2Name,
        shortName: normalizeTeamShort(teams.team2Name),
        logoUrl: teams.team2Logo,
      },
      status: getStatusFromNode($, row),
      communityTeam1Pick: 50,
      communityTeam2Pick: 50,
      predictions: [],
      bettingSource: "liquipedia",
    });
  });

  const deduped = parsed.filter(
    (match, index, array) =>
      array.findIndex((candidate) => candidate.id === match.id || (candidate.matchUrl && candidate.matchUrl === match.matchUrl)) === index,
  );

  return deduped.sort((a, b) => rankMatchForDisplay(a) - rankMatchForDisplay(b)).slice(0, 80);
}

function parseLiquipediaLeagueCatalog(html: string): LiquipediaLeagueCatalogItem[] {
  const $ = load(html);
  const items: LiquipediaLeagueCatalogItem[] = [];

  const eventAnchors = $("a[href*='/valorant/']")
    .toArray()
    .map((anchor) => {
      const text = $(anchor).text().replace(/\s+/g, " ").trim();
      const href = $(anchor).attr("href")?.trim() ?? "";

      if (!text || text.length < 6 || !href.includes("/valorant/")) {
        return null;
      }

      const looksLikeLeague =
        /vct|vcl|gc|game changers|masters|challengers|ascension|stage|split|kickoff|playoffs|spain|las|tr|mena|br|lan|kr|jp|na/i.test(
          text,
        );

      if (!looksLikeLeague) {
        return null;
      }

      const row = $(anchor).closest("tr, li, .panel-box, .infobox_matches_content, .fo-nttax-infobox");
      const iconUrl = resolveAsset(
        row.find(".league-icon-small-image img, img").first().attr("src")?.trim() ||
          $(anchor).closest("a").find("img").first().attr("src")?.trim(),
      );

      return {
        label: text,
        iconUrl,
      };
    })
    .filter(Boolean) as LiquipediaLeagueCatalogItem[];

  eventAnchors.forEach((item) => {
    if (!items.some((existing) => existing.label.toLowerCase() === item.label.toLowerCase())) {
      items.push(item);
    }
  });

  return items.slice(0, 120);
}

async function fetchLiquipediaHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ValoPicksBot/1.0 (contact: support@valopicks.local)",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Liquipedia fetch failed: ${response.status}`);
  }

  return response.text();
}

export async function fetchLiquipediaMatchesLive(): Promise<VlrMatchLive[]> {
  const now = Date.now();
  if (liveMatchesCache && liveMatchesCache.expiresAtMs > now) {
    return liveMatchesCache.matches;
  }

  if (liveMatchesInFlight) {
    return liveMatchesInFlight;
  }

  liveMatchesInFlight = (async () => {
    for (const url of LIQUIPEDIA_PAGE_CANDIDATES) {
      try {
        const html = await fetchLiquipediaHtml(url);
        const matches = parseLiquipediaMatches(html);
        if (matches.length > 0) {
          liveMatchesCache = {
            expiresAtMs: Date.now() + LIVE_CACHE_TTL_MS,
            matches,
          };
          return matches;
        }
      } catch {
        continue;
      }
    }

    liveMatchesCache = {
      expiresAtMs: Date.now() + LIVE_CACHE_TTL_MS,
      matches: [],
    };

    return [];
  })();

  try {
    return await liveMatchesInFlight;
  } finally {
    liveMatchesInFlight = null;
  }
}

export async function fetchLiquipediaLeagueCatalog(): Promise<LiquipediaLeagueCatalogItem[]> {
  const now = Date.now();
  if (leagueCatalogCache && leagueCatalogCache.expiresAtMs > now) {
    return leagueCatalogCache.leagues;
  }

  if (leagueCatalogInFlight) {
    return leagueCatalogInFlight;
  }

  leagueCatalogInFlight = (async () => {
    const collected: LiquipediaLeagueCatalogItem[] = [];

    for (const url of LIQUIPEDIA_PAGE_CANDIDATES) {
      try {
        const html = await fetchLiquipediaHtml(url);
        const parsed = parseLiquipediaLeagueCatalog(html);
        parsed.forEach((league) => {
          if (!collected.some((existing) => existing.label.toLowerCase() === league.label.toLowerCase())) {
            collected.push(league);
          }
        });
      } catch {
        continue;
      }
    }

    leagueCatalogCache = {
      expiresAtMs: Date.now() + LIVE_CACHE_TTL_MS,
      leagues: collected,
    };

    return collected;
  })();

  try {
    return await leagueCatalogInFlight;
  } finally {
    leagueCatalogInFlight = null;
  }
}

export async function fetchLiquipediaPortalTeams(): Promise<LiquipediaPortalTeam[]> {
  const now = Date.now();
  if (portalTeamsCache && portalTeamsCache.expiresAtMs > now) {
    return portalTeamsCache.teams;
  }

  if (portalTeamsInFlight) {
    return portalTeamsInFlight;
  }

  portalTeamsInFlight = (async () => {
    const portalUrl = `${LIQUIPEDIA_BASE_URL}/valorant/Portal:Teams?action=render`;
    const html = await fetchLiquipediaHtml(portalUrl);
    const teams = parsePortalTeams(html);

    portalTeamsCache = {
      expiresAtMs: Date.now() + 5 * 60_000,
      teams,
    };

    return teams;
  })();

  try {
    return await portalTeamsInFlight;
  } catch {
    return [];
  } finally {
    portalTeamsInFlight = null;
  }
}

export async function fetchLiquipediaPortalTeamBySlug(slug: string): Promise<LiquipediaPortalTeam | null> {
  const normalizedSlug = decodeURIComponent(slug).trim().toLowerCase().replace(/\s+/g, "_");
  const teams = await fetchLiquipediaPortalTeams();
  return teams.find((team) => team.slug.toLowerCase() === normalizedSlug) ?? null;
}
