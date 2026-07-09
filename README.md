# 2026 World Cup Watch Planner

Pacific Time schedule for all FIFA World Cup 2026 matches on Fox / FS1, with calendar downloads.

**Live site:** https://twojayspnw.github.io/world-cup-2026-watch-plan/

**Status:** Archived after the tournament. The site is a static snapshot; knockout teams and venues are no longer synced from ESPN.

## Local rebuild (optional)

```bash
node scripts/update-from-espn.mjs
node scripts/build.mjs
```

## Development

Extract fresh match data from the Cursor canvas (optional):

```bash
node scripts/extract-matches.mjs
node scripts/build.mjs
```
