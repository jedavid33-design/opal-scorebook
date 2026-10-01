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
- 2026-09-30 (night): in-place play editing (Julie: "I don't like the rewind and
  enter") — Edit now offers three paths: Fix notation, Add missed pitch, Re-score
  (the old rewind). Fix notation edits result code + play text in place without
  touching outs/runners/score; hits get hit-type+fielder re-pick, fielder-outs get
  fielder re-pick; warns when the new code changes the play type (out vs hit) and
  lets her save anyway. Outcome event = last 'o' event so mid-PA sub notes aren't
  mistaken for the outcome. Add missed pitch (Julie: realized after the game she
  didn't enter a pitch) inserts pitch events before the outcome — no rewind, no
  re-entering later plays. Contradiction handling (Julie's question): pitches that
  would contradict the outcome are blocked with a plain-English reason (4th ball
  on a non-walk, 3rd strike on a non-K, etc.; fouls always allowed; K/BB already
  at their caps); the message points to Re-score if the outcome itself was wrong.
  57 harness checks passing (31 prior + 26 new). Commit c76c623.

- 2026-09-30 (night): MLB roster auto-load + tap-to-fill lineups + durable edit
  history. Setup tab now has, per team: an MLB team dropdown (all 30), season
  input, and Load roster button hitting the free MLB Stats API active-roster
  endpoint; the returned roster becomes a tappable player pool (sorted by last
  name, jersey number shown, position prefilled) and the team name fills in.
  Lineup NEVER auto-loads — Julie taps a pool player to fill the first empty
  slot, or taps a lineup slot first to fill/replace that exact slot (Clear and
  Done controls appear for the selected slot); duplicate-player and full-lineup
  guards with plain-English messages. Pool doubles as the substitution bench
  (sub modal reads/writes pool; legacy bench saves migrate into pool). Undo
  history is now persisted to localStorage ('osb1-undo') on every snapshot, so
  Re-score/rewind survives an app reload — verified by a harness test that
  scores two PAs, simulates a full reload, then rewinds. WPBL stays manual
  entry. 75 harness checks passing (57 prior + 18 new). Commit 34be33b, live on
  Pages (verified). Julie's acceptance-test gate: sub details (defensive
  positions), device tap-through, then she scores odd-play games.

- 2026-09-30 (later): roster date picker. The per-team Season box became an
  optional Roster date field (native date picker, one-handed friendly). When a
  date is set, Load roster fetches the active roster as of that day via the
  MLB Stats API date parameter (verified: 2026-06-15 Astros roster differs from
  today's — e.g. Jake Meyers/Spencer Arrighetti then vs Lucas Spence/Nick Allen
  now); blank date keeps the current-season behavior. Pool header shows which
  date the roster is for. 78 harness checks passing. Commit cc8f704, live on
  Pages (verified).

- 2026-09-30 (later): clear-lineup button per team on the setup screen, with a
  confirm prompt. 81 harness checks passing. Commit 487809c, live on Pages
  (verified).

- 2026-09-30 (later): DH support. Per-team DH checkbox on setup; when on, a
  10th lineup slot appears for the pitcher labeled "P · doesn't bat" (no pos
  select). The batting order was already modulo 9, so the pitcher can never
  come to bat. Pool taps skip the pitcher slot unless it's explicitly selected;
  pitching changes update the 10th slot with ⇄ history; PH/D sub slot pickers
  show only the 9 batting slots. 89 harness checks passing. Commit da0be49,
  live on Pages (verified).

- 2026-09-30 (later): roster pool now behaves as the bench. Tapping a player
  into the lineup removes them from the pool; clearing a slot or the whole
  lineup returns those players to the pool; replacing a slot swaps them. Subs
  (PH/PR/P/defensive) remove the incoming player from the pool while the
  replaced player stays out of the game, like real baseball. Loading a roster
  filters out anyone already in the lineup, and old saves are cleaned up on
  load. 96 harness checks passing. Commit 8aa7134, live on Pages (verified).

- 2026-10-01: DH pitcher auto-route fix (Julie's bug report: "Lineup is full"
  when tapping a pitcher after filling nine batting slots). With DH on, tapping
  a roster player whose position maps to pitcher now fills the 10th P slot
  automatically; an explicitly selected slot still wins; non-pitchers still get
  the full-lineup message. 98 harness checks passing. Commit c6d550d, live on
  Pages (verified).

- 2026-10-01: field-layout fielder picker + advance-on-error (Julie's "kinda
  play that causes issues lol": single with runners advancing on a throwing
  error, 1B, E8). "Played by" for hits and all fielder pads now use a tap-the-
  field SVG (positions 1-9 where they stand, numbered badges keep tap order for
  sequences like 6-4-3) instead of the 3x3 button grid. Every runner row in the
  placement review has an E button: tap it, pick the fielder on the field, and
  that runner's advance is tagged with the error — so a batter can single but
  reach second on E8 while two runners score, rendered as "1B, E8" in the book
  and play-by-play; plain singles stay "1B". Reached-on-error outcomes can't
  double-tag (E5 + E5 collapses to E5). Linescore errors now charge the
  FIELDING team (was wrongly charging the batting team) and count each distinct
  error in a PA (E5 + E8 = 2 Es). 124 harness checks passing. Commit 9f59401,
  live on Pages (verified).

- 2026-10-01: per-player error charges (Julie: "they should also count on the
  player too"). Every PA with an error now stores errBy — the player names at
  the error positions, resolved from the fielding team's lineup at commit time,
  so a later defensive sub can't move the blame. Fix notation re-resolves the
  charge when the error fielder changes. New Fielding card in the Book view
  lists each team's players with their E counts. 130 harness checks passing.
  Commit 93ba4b9, live on Pages (verified).

- 2026-10-01: modal-visibility bug fix (Julie: "not registering the play after I
  enter it"). In placement review, the E and Out buttons open a sub-picker
  (fielderSingle/fielderPad) whose OK handler closes the modal before calling
  back into draw() — but draw() never re-showed the modal, so the sheet went
  invisible with Done unreachable and the play was never committed. Same defect
  in fix-notation's re-pick flows. Fix: both draw() functions now re-add the
  modal's visible class on every render. Reproduced on the live page in a real
  browser; regression tests M1-M3 fail without the fix and pass with it.
  136 harness checks passing. Commit ef350ad, live on Pages (verified).

- 2026-10-01: narrow-window optimization for iPad (Julie: "optimized for
  smaller windows for my iPad" — Slide Over / Split View). Book grid and
  linescore no longer crush in narrow windows: tables get a min-width and
  scroll sideways, with the player-name column sticky (solid dark-plum
  background) so you never lose track of who's who while scrolling. Under
  400px the diamonds shrink slightly (44→36px) to reduce scrolling. CSS-only
  change — no logic touched. Pushed via GitHub API (no local .git in this
  checkout), commit 0b89e4b, Pages rebuilds automatically.

- 2026-10-01: cross-device sync + past games (Julie: "save the game state
  between devices/browsers, so I can go between devices ama also look at
  old games"). New Cloudflare Worker `opal-scorebook-sync`
  (https://opal-scorebook-sync.4d8v7jw78c.workers.dev) + D1 database
  `opal-scorebook` (table `games`: id, sync_code, name, device, created_at,
  updated_at, finished, score, state). No accounts: client generates a
  sync code (XXXX-XXXX-XXXX); every row carries it and every request must
  present the matching code (wrong code -> 404, cross-code write -> 403).
  App changes (index.html): new 4th tab "Games" with (a) Sync card —
  enable/disable, code display, device name, Sync now, "use a code" for the
  second device; (b) Past games list (local archive always kept, 50 max;
  cloud archive when sync on) with read-only viewer. Current game
  auto-pushes (debounced 2.5s) after every scoring change; on launch the
  app pulls — blank local + remote game -> auto-load; same game newer on
  the other device -> auto-update; different newer game -> "Load it / Keep
  mine" card. Viewing a past game is read-only: banner + inert controls on
  Score, Edit buttons and End-game hidden in Book, save() is a no-op, Setup
  tab shows a notice; "Back to current game" restores the live game.
  Conflicts are last-write-wins. NOTE: a half-finished alternate sync draft
  exists at sync-worker/worker.js (different API: Bearer-hashed codes);
  the live system is the root worker.js + this app code — do not deploy
  the draft over opal-scorebook-sync. Commits e6542c2 (app), 5777ba1
  (worker), b4dbdc3 (deploy script). Live on Pages (verified).
