#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  ESPN_URL,
  buildUtcIndex,
  findEspnMatch,
  formatVenue,
  getCompetitors,
  getVenue,
} from "./lib/espn.mjs";
import { displayTeam, isPlaceholder } from "./lib/teams.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataPath = path.join(root, "data", "matches.json");
const metaPath = path.join(root, "data", "meta.json");

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function main() {
  const data = loadJson(dataPath);
  const res = await fetch(ESPN_URL);
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  const scoreboard = await res.json();
  const events = scoreboard.events ?? [];

  const byUtc = buildUtcIndex(data.matches);

  let updated = 0;
  let venuesUpdated = 0;
  const unmatched = [];

  for (const event of events) {
    const match = findEspnMatch(data.matches, event, byUtc);
    if (!match) {
      unmatched.push(event.name);
      continue;
    }

    const venue = formatVenue(getVenue(event));
    if (venue && match.venue !== venue) {
      match.venue = venue;
      venuesUpdated++;
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
    venueUpdates: venuesUpdated,
    unmatchedEspn: unmatched.slice(0, 5),
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");

  console.log(`ESPN events: ${events.length}`);
  console.log(`Venues updated: ${venuesUpdated}`);
  console.log(`Knockout matchups updated: ${updated}`);
  if (unmatched.length) {
    console.log(`Unmatched ESPN events: ${unmatched.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
