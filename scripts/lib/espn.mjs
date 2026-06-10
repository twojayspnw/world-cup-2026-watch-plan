import { utcMinuteKey } from "./time.mjs";
import { displayTeam, isPlaceholder, pairsMatch } from "./teams.mjs";

export const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200";

export function getCompetitors(event) {
  const comps = event.competitions?.[0]?.competitors ?? [];
  const home = comps.find((c) => c.homeAway === "home")?.team?.displayName;
  const away = comps.find((c) => c.homeAway === "away")?.team?.displayName;
  return { home, away, key: utcMinuteKey(event.date) };
}

export function getVenue(event) {
  return event.competitions?.[0]?.venue ?? null;
}

export function formatVenue(venue) {
  if (!venue?.fullName) return null;
  const city = venue.address?.city;
  return city ? `${venue.fullName}, ${city}` : venue.fullName;
}

export function findEspnMatch(matches, event, byUtc) {
  const { home, away, key } = getCompetitors(event);
  const candidates = byUtc.get(key) ?? [];

  if (candidates.length === 1) return candidates[0];

  const byTeams = candidates.find((m) => pairsMatch(home, away, m));
  if (byTeams) return byTeams;

  if (!isPlaceholder(home) && !isPlaceholder(away)) {
    const h = displayTeam(home);
    const a = displayTeam(away);
    const hit = candidates.find((m) => {
      const title = m.matchup.toLowerCase();
      return title.includes(h.toLowerCase()) && title.includes(a.toLowerCase());
    });
    if (hit) return hit;

    return matches.find((m) => pairsMatch(home, away, m)) ?? null;
  }

  return null;
}

export function buildUtcIndex(matches) {
  const byUtc = new Map();
  for (const m of matches) {
    const key = utcMinuteKey(m.utcKickoff);
    if (!byUtc.has(key)) byUtc.set(key, []);
    byUtc.get(key).push(m);
  }
  return byUtc;
}
