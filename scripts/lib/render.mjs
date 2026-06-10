import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { utcMinuteKey } from "./time.mjs";
import {
  collectAllTeams,
  getMatchTeams,
  teamsDataAttr,
} from "./teams.mjs";
import { TZ_OPTIONS } from "./tz-options.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function addMinutes(dt, add) {
  const total = dt.h * 60 + dt.min + add;
  let d = dt.d + Math.floor(total / (24 * 60));
  let rem = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return { ...dt, d, h: Math.floor(rem / 60), min: rem % 60 };
}

function parseDateTime(ptDate, ptTime) {
  const [y, mo, d] = ptDate.split("-").map(Number);
  const mins = parseMinutes(ptTime);
  return { y, mo, d, h: Math.floor(mins / 60), min: mins % 60 };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatIcs(dt) {
  return `${dt.y}${pad2(dt.mo)}${pad2(dt.d)}T${pad2(dt.h)}${pad2(dt.min)}00`;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function icsEscape(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function streamLabel(m) {
  const tv = m.network === "FOX" ? "Fox" : "FS1";
  return tv + " · FOX One" + (m.tubi ? " · Tubi" : "");
}

function buildIcs(m) {
  const startDt = parseDateTime(m.ptDate, m.ptTime);
  const endDt = addMinutes(startDt, 120);
  const desc = [
    "Watch: " + streamLabel(m),
    m.detail,
    "Kickoff: " + formatDate(m.ptDate) + " " + m.ptTime + " PT",
  ].join("\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WC2026 Watch Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + m.id + "@wc2026-watch-plan",
    "DTSTAMP:20260609T120000Z",
    "DTSTART;TZID=America/Los_Angeles:" + formatIcs(startDt),
    "DTEND;TZID=America/Los_Angeles:" + formatIcs(endDt),
    "SUMMARY:" + icsEscape(m.matchup),
    "DESCRIPTION:" + icsEscape(desc),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function calendarButton(m) {
  const fname = slugify(m.matchup) + ".ics";
  const href =
    "data:text/calendar;charset=utf-8," + encodeURIComponent(buildIcs(m));
  return (
    '<a class="cal-btn" href="' +
    href +
    '" download="' +
    fname +
    '">Add to calendar</a>'
  );
}

export function overlapIds(matches) {
  const counts = new Map();
  const slotKey = (m) => m.ptDate + "|" + m.ptTime;
  for (const m of matches) {
    counts.set(slotKey(m), (counts.get(slotKey(m)) ?? 0) + 1);
  }
  const ids = new Set();
  for (const m of matches) {
    if ((counts.get(slotKey(m)) ?? 0) > 1) ids.add(m.id);
  }
  return ids;
}

export function matchCard(m, overlap) {
  const teams = getMatchTeams(m);
  const classes = [
    "match",
    overlap.has(m.id) ? "overlap" : "",
    m.usa ? "usa" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const net = m.network === "FOX" ? "fox" : "fs1";
  return (
    '<article class="' +
    classes +
    '" data-id="' +
    m.id +
    '" data-phase="' +
    m.phase +
    '" data-network="' +
    m.network +
    '" data-usa="' +
    m.usa +
    '" data-overlap="' +
    overlap.has(m.id) +
    '" data-teams="' +
    esc(teamsDataAttr(teams)) +
    '">' +
    '<div class="match-top"><time class="kickoff">' +
    esc(m.ptTime) +
    '</time><span class="net ' +
    net +
    '">' +
    (m.network === "FOX" ? "Fox" : "FS1") +
    "</span></div>" +
    "<h3 class=\"matchup\">" +
    esc(m.matchup) +
    "</h3>" +
    '<p class="detail">' +
    esc(m.detail) +
    " · " +
    esc(m.phase) +
    "</p>" +
    '<p class="stream">' +
    esc(streamLabel(m)) +
    "</p>" +
    calendarButton(m) +
    "</article>"
  );
}

export function matchRow(m, overlap) {
  const teams = getMatchTeams(m);
  const cls = [overlap.has(m.id) ? "overlap" : "", m.usa ? "usa" : ""]
    .filter(Boolean)
    .join(" ");
  const net = m.network === "FOX" ? "fox" : "fs1";
  return (
    '<tr class="' +
    cls +
    '" data-id="' +
    m.id +
    '" data-phase="' +
    m.phase +
    '" data-network="' +
    m.network +
    '" data-usa="' +
    m.usa +
    '" data-overlap="' +
    overlap.has(m.id) +
    '" data-teams="' +
    esc(teamsDataAttr(teams)) +
    '">' +
    "<td>" +
    esc(m.ptTime) +
    "</td><td><strong>" +
    esc(m.matchup) +
    '</strong><div class="detail">' +
    esc(m.detail) +
    '</div></td><td class="hide-mobile">' +
    esc(m.phase) +
    '</td><td><span class="net ' +
    net +
    '">' +
    (m.network === "FOX" ? "Fox" : "FS1") +
    '</span><div class="stream">' +
    esc(streamLabel(m)) +
    "</div></td><td>" +
    calendarButton(m) +
    "</td></tr>"
  );
}

const CSS = `  :root {
    --bg: #0f1115; --surface: #1a1d24; --border: #2a2f3a;
    --text: #e8eaed; --muted: #9aa0a6; --accent: #4c8bf5;
    --fox: #003366; --fs1: #555; --warn: #c9a227;
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-left: env(safe-area-inset-left, 0px);
    --safe-right: env(safe-area-inset-right, 0px);
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg); color: var(--text); margin: 0;
    padding: calc(16px + var(--safe-top)) calc(16px + var(--safe-right)) calc(24px + var(--safe-bottom)) calc(16px + var(--safe-left));
    line-height: 1.45; max-width: 900px; margin-inline: auto;
  }
  h1 { font-size: clamp(1.25rem, 4vw, 1.6rem); margin: 0 0 8px; line-height: 1.2; }
  h2 { font-size: 1.05rem; margin: 24px 0 12px; }
  .sub { color: var(--muted); font-size: 0.9rem; margin-bottom: 16px; }
  .banner { background: #1e2a3a; border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; font-size: 0.88rem; }
  .updated { color: var(--muted); font-size: 0.78rem; margin-bottom: 16px; }
  .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
  @media (min-width: 520px) { .stats { grid-template-columns: repeat(4, 1fr); } }
  .stat { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
  .stat .label { color: var(--muted); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .stat .value { font-size: 1.35rem; font-weight: 600; margin-top: 4px; }
  .filters { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 14px; }
  @media (min-width: 640px) { .filters { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 960px) { .filters { grid-template-columns: repeat(4, 1fr) auto; align-items: end; } }
  #tz-note { color: var(--muted); font-size: 0.85rem; margin: -8px 0 16px; }
  label { display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; color: var(--muted); }
  select { background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 12px 10px; font-size: 16px; width: 100%; }
  .count-note { color: var(--muted); font-size: 0.85rem; padding: 4px 0; }
  details.day { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 8px; overflow: hidden; }
  summary { cursor: pointer; padding: 14px; font-weight: 600; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 8px; min-height: 48px; }
  summary::-webkit-details-marker { display: none; }
  .day-label::before { content: '▸ '; color: var(--muted); }
  details[open] .day-label::before { content: '▾ '; }
  .badge { font-size: 0.72rem; font-weight: 600; padding: 4px 8px; border-radius: 999px; background: #2a2f3a; color: var(--muted); white-space: nowrap; flex-shrink: 0; }
  .badge.warn { background: #3d3418; color: var(--warn); }
  .cards { padding: 0 12px 12px; display: grid; gap: 10px; }
  .match { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
  .match.overlap { border-left: 3px solid var(--warn); }
  .match.usa { border-color: #2a4a7a; background: rgba(76,139,245,0.06); }
  .match-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
  .kickoff { font-weight: 700; font-size: 0.95rem; }
  .matchup { font-size: 1rem; margin: 0 0 4px; font-weight: 600; line-height: 1.3; }
  .venue, .detail, .stream { color: var(--muted); font-size: 0.82rem; margin: 0 0 4px; }
  .cal-btn {
    display: inline-flex; align-items: center; justify-content: center;
    min-height: 44px; margin-top: 10px; padding: 10px 14px; border-radius: 8px;
    background: #243044; border: 1px solid var(--border); color: var(--text);
    font-size: 0.88rem; font-weight: 600; text-decoration: none;
  }
  .cal-btn:active { background: #2f3d56; }
  .net { display: inline-block; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; color: #fff; }
  .net.fox { background: var(--fox); }
  .net.fs1 { background: var(--fs1); }
  .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; padding: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; min-width: 640px; }
  th, td { text-align: left; padding: 10px 14px; border-top: 1px solid var(--border); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; font-size: 0.72rem; text-transform: uppercase; }
  tr.overlap td:first-child { border-left: 3px solid var(--warn); }
  tr.usa td { background: rgba(76,139,245,0.08); }
  .hidden { display: none !important; }
  .mobile-only { display: block; }
  .desktop-only { display: none; }
  @media (min-width: 768px) {
    .mobile-only { display: none; }
    .desktop-only { display: block; }
    .hide-mobile { display: table-cell; }
  }
  @media (max-width: 767px) { .hide-mobile { display: none; } }`;

function buildClientScript(matches, overlap) {
  const data = matches.map((m) => ({
    id: m.id,
    utcKickoff: m.utcKickoff,
    matchup: m.matchup,
    detail: m.detail,
    venue: m.venue || null,
    phase: m.phase,
    network: m.network,
    tubi: m.tubi,
    usa: m.usa,
    teams: teamsDataAttr(getMatchTeams(m)),
  }));
  const appPath = path.join(__dirname, "..", "schedule.app.js");
  return fs
    .readFileSync(appPath, "utf8")
    .replace("__MATCH_DATA__", JSON.stringify(data))
    .replace("__OVERLAP_IDS__", JSON.stringify([...overlap]));
}

export function buildHtml(matches, meta = {}) {
  const overlap = overlapIds(matches);
  const overlapSlots = new Set(
    [...overlap].map((id) => {
      const m = matches.find((x) => x.id === id);
      return utcMinuteKey(m.utcKickoff);
    }),
  ).size;

  const updatedLine = meta.lastUpdated
    ? '<p class="updated">Knockout teams last synced ' +
      new Date(meta.lastUpdated).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        dateStyle: "medium",
        timeStyle: "short",
      }) +
      " PT · auto-updates from ESPN</p>"
    : "";

  const allTeams = collectAllTeams(matches);
  const teamOptions = allTeams
    .map(
      (t) =>
        '<option value="team:' +
        esc(teamsDataAttr([t])) +
        '">' +
        esc(t) +
        "</option>",
    )
    .join("\n");

  const tzOptions = TZ_OPTIONS.map(
    (o) =>
      '<option value="' + esc(o.value) + '">' + esc(o.label) + "</option>",
  ).join("\n");

  const clientJs = buildClientScript(matches, overlap);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="color-scheme" content="dark">
<title>2026 World Cup Watch Planner</title>
<style>
${CSS}
</style>
</head>
<body>
<h1>2026 FIFA World Cup Watch Planner</h1>
<p class="sub">Choose your timezone below. Tap Add to calendar for a 2-hour event in that zone.</p>
<p id="tz-note" class="sub">Loading times…</p>
${updatedLine}
<div class="banner">Fox + FS1 via Fox One ($19.99/mo). Free on Tubi: Mexico vs South Africa (Jun 11) and USA vs Paraguay (Jun 12).</div>
<div class="stats">
  <div class="stat"><div class="label">Matches</div><div class="value">${matches.length}</div></div>
  <div class="stat"><div class="label">On Fox</div><div class="value">${matches.filter((m) => m.network === "FOX").length}</div></div>
  <div class="stat"><div class="label">On FS1</div><div class="value">${matches.filter((m) => m.network === "FS1").length}</div></div>
  <div class="stat"><div class="label">Overlap slots</div><div class="value">${overlapSlots}</div></div>
</div>
<h2>USA group stage</h2>
<div id="usa-mobile" class="cards mobile-only"></div>
<div class="table-wrap desktop-only"><table><thead><tr><th>Date</th><th>Kickoff</th><th>Match</th><th>Watch</th><th>Calendar</th></tr></thead><tbody id="usa-desktop"></tbody></table></div>
<h2>Full schedule</h2>
<div class="filters">
  <label>Timezone<select id="f-tz">${tzOptions}</select></label>
  <label>Phase<select id="f-phase"><option value="all">All phases</option><option value="Group">Group stage</option><option value="Ro32">Round of 32</option><option value="Ro16">Round of 16</option><option value="QF">Quarterfinals</option><option value="SF">Semifinals</option><option value="3P">Third place</option><option value="Final">Final</option></select></label>
  <label>Network<select id="f-network"><option value="all">All networks</option><option value="FOX">Fox</option><option value="FS1">FS1</option></select></label>
  <label>Show<select id="f-show"><option value="all">All matches</option><option value="overlap">Overlapping kickoffs</option>${teamOptions}</select></label>
  <div class="count-note" id="count-note">${matches.length} of ${matches.length} matches</div>
</div>
<div id="schedule"></div>
<script>${clientJs}</script>
</body>
</html>
`;
}
