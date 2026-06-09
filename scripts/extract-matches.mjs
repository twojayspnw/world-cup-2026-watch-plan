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

const KNOCKOUT = new Set(["Ro32", "Ro16", "QF", "SF", "Final"]);

const matches = MATCHES.map((m) => ({
  ...m,
  utcKickoff: ptToUtcIso(m.ptDate, m.ptTime),
  autoUpdate: KNOCKOUT.has(m.phase),
  homeTeam: null,
  awayTeam: null,
}));

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
