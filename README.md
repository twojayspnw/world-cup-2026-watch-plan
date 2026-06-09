# 2026 World Cup Watch Planner

Pacific Time schedule for all FIFA World Cup 2026 matches on Fox / FS1, with calendar downloads.

**Live site:** https://twojayspnw.github.io/world-cup-2026-watch-plan/

## Auto-updating knockout teams

Knockout round matchups (`Round of 32` through the `Final`) start as placeholders and are **automatically filled** when ESPN publishes real team names.

| Piece | Role |
|-------|------|
| `data/matches.json` | Source of truth for all 104 matches |
| `scripts/update-from-espn.mjs` | Pulls ESPN's public scoreboard API and updates knockout `matchup` fields |
| `scripts/build.mjs` | Regenerates `index.html` |
| `.github/workflows/update-bracket.yml` | Runs every 3 hours during June–July, or on demand |

### Manual run

```bash
node scripts/update-from-espn.mjs
node scripts/build.mjs
```

### Trigger from GitHub

Actions → **Sync knockout teams** → **Run workflow**

## Development

Extract fresh match data from the Cursor canvas (optional):

```bash
node scripts/extract-matches.mjs
node scripts/build.mjs
```
