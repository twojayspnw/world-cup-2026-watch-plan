#!/usr/bin/env node
/**
 * One-time / manual: extract matches from the Cursor canvas source into data/matches.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ptToUtcIso } from "./lib/time.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const canvasPath =
  process.env.CANVAS_PATH ||
  path.join(
    process.env.HOME,
    ".cursor/projects/empty-window/canvases/world-cup-2026-watch-plan.canvas.tsx",
  );

const src = fs.readFileSync(canvasPath, "utf8");
const start = src.indexOf("const MATCHES: Match[] = [");
const end = src.indexOf("];", start) + 2;
let MATCHES;
eval(src.slice(start, end).replace("const MATCHES: Match[]", "MATCHES"));

const KNOCKOUT = new Set(["Ro32", "Ro16", "QF", "SF", "3P", "Final"]);

const matches = MATCHES.map((m) => ({
  ...m,
  utcKickoff: ptToUtcIso(m.ptDate, m.ptTime),
  autoUpdate: KNOCKOUT.has(m.phase),
  homeTeam: null,
  awayTeam: null,
}));

/** FOX schedule page omits this; ESPN/FIFA include it as match 104. */
const SUPPLEMENTAL = [
  {
    id: "k32",
    ptDate: "2026-07-18",
    ptTime: "2:00 PM",
    matchup: "Third Place Match — Miami",
    detail: "Hard Rock Stadium · Semifinal losers",
    phase: "3P",
    network: "FOX",
    tubi: false,
    usa: false,
  },
];

for (const extra of SUPPLEMENTAL) {
  if (!matches.some((m) => m.id === extra.id)) {
    matches.push({
      ...extra,
      utcKickoff: ptToUtcIso(extra.ptDate, extra.ptTime),
      autoUpdate: true,
      homeTeam: null,
      awayTeam: null,
    });
  }
}

matches.sort((a, b) =>
  a.ptDate === b.ptDate
    ? a.ptTime.localeCompare(b.ptTime, undefined, { numeric: true })
    : a.ptDate.localeCompare(b.ptDate),
);

const out = {
  version: 1,
  source: "FOX Sports schedule + ESPN auto-sync for knockouts",
  matches,
};

fs.mkdirSync(path.join(root, "data"), { recursive: true });
fs.writeFileSync(
  path.join(root, "data", "matches.json"),
  JSON.stringify(out, null, 2) + "\n",
);
console.log(`Wrote ${matches.length} matches to data/matches.json`);
