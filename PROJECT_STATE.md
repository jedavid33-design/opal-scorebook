# Opal Scorebook — PROJECT_STATE.md

Authoritative project state. Updated 2026-09-30.

## What it is
Mobile-first tap-flow baseball scorebook web app (vanilla HTML/CSS/JS, GitHub Pages,
Cloudflare backend for sync — free tiers only). For Julie to score Astros and WPBL games,
replacing the "visco" app she currently uses.

## Design principles (from Julie)
- The scoring IS the point — the app never auto-scores, even in reconstruction mode.
  The data feed supplies rosters/game state; every pitch goes through her taps.
- Tap flow, not grid fill-in: pick batter → tap pitches/outcomes → app renders the
  classic scorebook page (diamonds, inning grid) behind the scenes.
- One-handed first: big tap targets, almost no typing.
- Opal treatment: dark flowing opal-drift background, plum accents, frosted glass cards.

## Core features (v1 prototype scope)
1. New game setup: away/home teams, 9-man lineups (name, #, pos), big-touch entry.
2. Scoring screen: count / outs / bases at a glance; current batter highlighted.
3. Pitch buttons: Ball, Called Strike, Swinging Strike, Foul, In Play, Pitchout,
   **Auto Ball (pitch timer violation)**, **Auto Strike (batter timer violation)**,
   **Illegal Pitch** (ball; advances runners like a balk when occupied).
4. Compound play builder: a plate appearance holds an event sequence —
   defensive indifference, K + stolen base, strike-'em-out-throw-'em-out DP, etc.,
   with proper scorebook notation. Runner actions available between pitches AND
   after the batter's outcome until "Next batter" is tapped.
5. Runner actions: steal attempt (safe/out + CS fielders), defensive indifference,
   pickoff (out/safe), wild pitch / passed ball, balk.
6. In-play outcomes: hits (1B/2B/3B/HR), outs (fielder sequence e.g. 6-3, fly/line),
   errors, fielder's choice, sacs; manual runner placement after each outcome.
7. Book view: classic scorebook grid (batters × innings, diamond per PA) + linescore.
8. Local-first (localStorage) in prototype; sync later.

## Queued updates (Julie's list)
(none — both built 2026-09-30, see log)

## Acceptance test (Julie, 2026-09-30)
- Once substitutions + play editing + roster/lineup loading land, she'll score a few
  games with odd plays to shake out what's missing.

## Later phases
- Phase 2: MLB Stats API (free) — AUTOMATIC ROSTERS ONLY (Julie, 2026-09-30). The feed
  pulls the active roster as the player pool; Julie fills out the 9-man lineup herself
  by tapping from it — lineups are never auto-loaded. Also live games + historical
  "moment in time" (full play-by-play as reference for finished games). Reconstruction
  mode = feed as reference/scaffolding, she still taps every pitch.
- Phase 3: record book — cumulative player stats across scored games.
- Phase 4: WPBL manual-entry polish (no public feed expected); sync iPhone + iPad
  via Cloudflare Worker + D1 (free tier).
- Possible: export scorebook page as image/PDF.

## Pain points it fixes vs current app
- Complex/compound plays hard to score → play builder with event sequences.
- No easy defensive indifference → one-tap runner action.
- No easy strikeout/steal or K+CS double plays → runner actions chainable after K.
- Automatic balls/strikes for timer violations + illegal pitches buried → one-tap
  pitch buttons.

## Naming
- App: **Opal Scorebook**. Repo: `jedavid33-design/opal-scorebook` (not created yet).

## Log
- 2026-09-30: un-parked (was parked per earlier decision); plot agreed with Julie;
  v1 prototype (single-file index.html, localStorage) started.
- 2026-09-30: v1 prototype built and logic-tested (22/22 harness checks: walks/K/hits/
  outs/DI/half-inning/undo). Repo `jedavid33-design/opal-scorebook` created, Pages live at
  https://jedavid33-design.github.io/opal-scorebook/ . Next: Julie's tap-through feedback,
  then MLB feed (phase 2).
- 2026-09-30: hit detail (Julie) — singles/doubles/triples now ask hit type (liner/grounder/
  fly/bunt) + which fielder played it, logged as "Singled on a line drive to RF". Fielder pads
  now show positions (P/C/1B/…) with numbers as sublabels instead of 1-9. Fixed real bug the
  harness caught: ev() dropped all event text (log showed "undefined").
- 2026-09-30 (evening): hit detail merged into one screen (Julie) — hit type + fielder
  position picked together with a live readout ("Singled on a line drive to RF"); Done
  enables only when both are chosen.
- 2026-09-30 (evening): double plays (Julie) — new "Double Play" outcome with three kinds:
  ground-ball DP (fielder sequence e.g. 6-4-3, pick the runner out), lined into DP (catch +
  doubled-off putout), and strike-'em-out-throw-'em-out (swinging/looking + CS fielders).
  Two outs recorded, correct half-inning rollover, gentle message when no runner is on.
- 2026-09-30 (night): substitutions + play editing (Julie, impatience-approved) —
  ⇄ Subs button on the Score tab: pinch hitter/runner, pitching change, defensive sub,
  from team bench or typed new (auto-added to bench); sub log + ⇄ markers in the Book.
  Play-by-play list in the Book with per-play Edit → "rewind & re-enter" (pops snapshots
  back to before that play; later plays erased). Design fix the harness forced: subs
  between plays write only to the sub log, never into PA events, so rewinds can't erase
  an inning-break pitching change. Roster decision (Julie): MLB feed will pull active
  rosters automatically; she fills out the lineup herself by tapping from the roster.
