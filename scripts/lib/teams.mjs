const ALIASES = new Map([
  ["united states", "usa"],
  ["u s a", "usa"],
  ["bosnia herzegovina", "bosnia and herzegovina"],
  ["cote d ivoire", "ivory coast"],
  ["cote d'ivoire", "ivory coast"],
  ["korea republic", "south korea"],
  ["republic of ireland", "ireland"],
  ["curacao", "curaçao"],
  ["turkiye", "türkiye"],
  ["congo dr", "congo dr"],
  ["dr congo", "congo dr"],
]);

export function normalizeTeam(name) {
  if (!name) return "";
  let n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return ALIASES.get(n) ?? n;
}

export function isPlaceholder(name) {
  if (!name) return true;
  const n = name.toLowerCase();
  return (
    /\bgroup\s+[a-l]\b/.test(n) ||
    /\b\d+(st|nd|rd)\s+place\b/.test(n) ||
    /\bwinner\b/.test(n) ||
    /\btbd\b/.test(n) ||
    /^round of \d+/.test(n) ||
    /^semifinal \d/.test(n) ||
    /\bloser\b/.test(n) ||
    /^quarterfinal/.test(n) ||
    /^group [a-l] (winner|2nd)/.test(n)
  );
}

export function teamsFromMatchup(matchup) {
  const parts = matchup.split(/\s+vs\.?\s+/i);
  if (parts.length === 2) return parts.map((s) => s.trim());
  return [];
}

export function pairKey(a, b) {
  return [normalizeTeam(a), normalizeTeam(b)].sort().join("|");
}

export function pairsMatch(home, away, match) {
  const espn = pairKey(home, away);
  if (match.homeTeam && match.awayTeam) {
    return pairKey(match.homeTeam, match.awayTeam) === espn;
  }
  const fromTitle = teamsFromMatchup(match.matchup);
  if (fromTitle.length === 2) {
    return pairKey(fromTitle[0], fromTitle[1]) === espn;
  }
  return false;
}

export function displayTeam(espnName) {
  if (espnName === "United States") return "USA";
  if (espnName === "Bosnia-Herzegovina") return "Bosnia and Herzegovina";
  if (espnName === "Côte d'Ivoire" || espnName === "Cote d'Ivoire")
    return "Ivory Coast";
  if (espnName === "Korea Republic") return "South Korea";
  return espnName;
}

const KNOCKOUT_TITLE =
  /round of|semifinal|quarterfinal|third place|world cup final/i;

/** Teams playing in this match (empty for TBD knockout slots). */
export function getMatchTeams(match) {
  if (match.homeTeam && match.awayTeam) {
    return [match.homeTeam, match.awayTeam];
  }
  const parts = teamsFromMatchup(match.matchup);
  if (parts.length === 2 && !KNOCKOUT_TITLE.test(parts[0])) {
    return parts;
  }
  return [];
}

export function collectAllTeams(matches) {
  const set = new Set();
  for (const m of matches) {
    for (const t of getMatchTeams(m)) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function teamsDataAttr(teams) {
  return teams.map((t) => normalizeTeam(t)).join("|");
}
