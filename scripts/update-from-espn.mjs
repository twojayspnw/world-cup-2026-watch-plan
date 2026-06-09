#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { utcMinuteKey } from "./lib/time.mjs";
import {
  displayTeam,
  isPlaceholder,
  pairsMatch,
} from "./lib/teams.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataPath = path.join(root, "data", "matches.json");
const metaPath = path.join(root, "data", "meta.json");

const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200";

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function getCompetitors(event) {
  const comps = event.competitions?.[0]?.competitors ?? [];
  const home = comps.find((c) => c.homeAway === "home")?.team?.displayName;
  const away = comps.find((c) => c.homeAway === "away")?.team?.displayName;
  return { home, away, key: utcMinuteKey(event.date) };
}

function findMatch(matches, event, byUtc) {
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
  }

  return null;
}

async function main() {
  const data = loadJson(dataPath);
  const res = await fetch(ESPN_URL);
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  const scoreboard = await res.json();
  const events = scoreboard.events ?? [];

  const byUtc = new Map();
  for (const m of data.matches) {
    const key = utcMinuteKey(m.utcKickoff);
    if (!byUtc.has(key)) byUtc.set(key, []);
    byUtc.get(key).push(m);
  }

  let updated = 0;
  const unmatched = [];

  for (const event of events) {
    const match = findMatch(data.matches, event, byUtc);
    if (!match) {
      unmatched.push(event.name);
      continue;
    }

    const { home, away } = getCompetitors(event);
    if (!match.autoUpdate) continue;
    if (isPlaceholder(home) || isPlaceholder(away)) continue;

    const homeTeam = displayTeam(home);
    const awayTeam = displayTeam(away);
    const matchup = `${homeTeam} vs ${awayTeam}`;
    const usa = /^(USA|United States)$/i.test(homeTeam) || /^(USA|United States)$/i.test(awayTeam);

    const changed =
      match.homeTeam !== homeTeam ||
      match.awayTeam !== awayTeam ||
      match.matchup !== matchup;

    if (changed) {
      match.homeTeam = homeTeam;
      match.awayTeam = awayTeam;
      match.matchup = matchup;
      match.usa = usa;
      updated++;
    }
  }

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n");

  const meta = {
    lastUpdated: new Date().toISOString(),
    espnEvents: events.length,
    knockoutUpdates: updated,
    unmatchedEspn: unmatched.slice(0, 5),
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");

  console.log(`ESPN events: ${events.length}`);
  console.log(`Knockout matchups updated: ${updated}`);
  if (unmatched.length) {
    console.log(`Unmatched ESPN events: ${unmatched.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
