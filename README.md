# Road to Glory 2026 ⚽🏆

A football draft game for the **2026 FIFA World Cup**, inspired by the viral
[38-0](https://www.38-0.org/) (Premier League perfect-season game) and the
basketball game it came from, 82-0.

**Draft your XI. Win all 8. Go unbeaten.**

## How to play

1. **Draft** — you're shown three random real players for each of 11 positions
   (4-3-3). Pick one for each slot and build the strongest squad you can.
2. **Tournament** — your XI runs the gauntlet of the new 48-team World Cup
   format: 3 group games, then five knockout rounds (Round of 32 → Final).
3. **Goal** — win every match. One loss and you're out. Draw a knockout and
   it's a penalty shootout. Win all eight in normal time for a **Perfect Run**.

Match results are simulated from your squad rating versus each opponent
nation's strength, so a stronger squad wins more often — but nothing is
guaranteed. Share your run with a Wordle-style emoji grid.

## Tech

- [Vite](https://vite.dev/) + React 18 + TypeScript
- No backend — all logic and data are client-side
- Player pool and team ratings live in `src/data/`; the draft, bracket and
  match-simulation engine in `src/game/engine.ts`

## Develop

```bash
npm install
npm run dev      # start dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Notes

Player ratings, squads and team strengths are subjective and tuned for fun —
not an official or predictive ranking. Built with [Claude Code](https://claude.com/claude-code).
