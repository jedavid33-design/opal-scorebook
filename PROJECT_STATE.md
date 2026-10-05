# Opal Scorebook — PROJECT_STATE.md

Authoritative project state. Updated 2026-10-04.

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

- 2026-10-01: skip runner-placement prompt on the third out (Julie: "Third
  out — doesn't need to ask where everyone ended up"). placementReview now
  applies the play's default placements directly when current outs + outs
  already decided on the play reach 3 (groundout/flyout/lineout/sac/FC with
  2 out, DP with 1 out) — identical to tapping Done immediately — then ends
  the half-inning. Plays where the third out isn't decided yet (hits, errors,
  marking a runner out in the review) still show the prompt. Caught during
  dev: the skip check initially ran before applyPlacement's const
  initialization (temporal-dead-zone ReferenceError); the check now sits
  after the definition. Verified with a 14-assertion node harness. Commit
  bb1be89. Live on Pages (verified).

- 2026-10-01: Julie's UX round (from iPad screenshots). (a) New "Pop fly"
  in-play outcome: P-notation (e.g. P4), batter out, runners hold; honors
  the third-out auto-skip. (b) Pitch buttons reordered: Called K left of
  Swing K on the top row, Ball + Foul below, In Play full-width unchanged.
  (c) PA pitch list: pitches numbered (badge per pitch) and the list
  auto-scrolls to the latest pitch on every render. (d) Setup tab removed;
  the screen is now titled "Lineup" — tap the score line (WHIT 4 @ ASTR 1,
  pencil affordance by the inning) to open it anytime; showView guards the
  missing tab button. (e) Small-window: roster-load row stacks under 700px
  (team + date side by side, Load roster full-width below) instead of the
  cramped 3-col squeeze. Verified: node --check, zero dangling $('#id')
  refs, 10-assertion harness (POP skip/show paths, showView without
  tab-setup, pitch numbering, GO third-out regression). Commit 09023c6.
  Live on Pages (verified markers).

- 2026-10-01: Julie asked "how to do a foul out" — added a real "Foul out"
  in-play option instead of a workaround: standard F-notation (F2), batter
  out, runners hold but can tag up in placement review, honors the
  third-out auto-skip. Also fixed POP bookkeeping gaps from the earlier
  change: P-codes now classify as outs (red diamond styling via clsOf) and
  "Re-pick fielders" in the notation editor works for pop flies; the editor
  preserves "Fouled out" wording instead of rewriting it as a flyout.
  Verified: node --check, 11-assertion harness (FL skip/show paths, POP/FL
  classification, notation preservation). Commit 4b9091b. Live on Pages.

- 2026-10-01: Julie: foul outs now notate lowercase (f2) vs uppercase for
  fly outs (F8), so the diamond tells them apart. paKind/clsOf updated;
  notation editor preserves the lowercase form on fielder re-pick.
  Verified: node --check, 8-assertion harness. Commit 1bfa6eb. Live.

- 2026-10-01: Julie: "can't decide if I want to make some notation for abs
  challenges" → chose the whole thing, discreet. Added ABS challenge
  tracking: (a) per-team remaining counter ("CH 2·2") in the score header,
  tap to open a stepper (manual adjust, e.g. a challenge burned on a
  conference); (b) a dashed "C" button appears by the count whenever the
  last pitch was a called ball/strike, opening a challenge sheet (who
  challenged defaults to fielding team on balls / batting team on strikes,
  result upheld/overturned); (c) challenged pitches get a tiny C badge
  (C↺ if overturned) in the pitch list. Rules: 2 challenges per team, kept
  when overturned (upheld decrements, floor 0); only called balls/strikes
  are challengeable; overturning flips the call and recounts — strikeout
  triggers a K, ball four triggers a walk; a committed strikeout is
  un-done cleanly (outs/order restored, count flipped); a committed walk
  or any PA that already moved on (incl. a K that ended the half-inning)
  is notation-only with a toast explaining why; extra innings grant +1
  per team (only if at 0), per MLB's 2026 ABS rules. Past-game mode is
  read-only (no C button, header not tappable). Verified: node --check,
  21-assertion harness (eligibility, upheld decrement/floor, overturn
  flips incl. foul-ball recount edge, K/BB forward-commit, un-K,
  third-out-K/BB/closed-PA notation-only paths, extra-inning grant).
  Commit ad3cf3f566e9. Live on Pages (verified markers).

- 2026-10-01: audit fix pack — all 20 findings from the 2026-10-01 audit fixed
  (5 major, 15 minor), verified by a new committed harness
  (harness/scorebook-harness.js, 137 checks) that loads the real index.html
  script with stubbed DOM/storage and exercises every fix, plus worker.js
  against a mocked D1. Majors: (A1) sync is no longer last-write-wins —
  worker uses integer revision numbers (D1 `games.rev` column added via
  migration; PUT sends base_rev, stale writes get 409 {error:'stale',rev};
  blind writes only when base_rev is omitted = Julie's explicit "Keep mine");
  on 409 the local rev is NOT advanced so every later push keeps 409ing until
  she resolves via the Games-tab card ("Load it" / "Keep mine (overwrites)").
  (A2) the launch pull never auto-replaces a started same-game local copy —
  server-newer routes to the conflict card. (A3) runner-placement review
  refuses and toasts when two runners would end on the same base. (A4) undo
  keeps a parallel length array so Re-score "Rewind & re-enter" is refused
  with an explanation when the needed snapshot has aged out (80-cap); undo
  preserves rev/serverUpdatedAt so it can't manufacture a conflict. (A5) the
  illegal-pitch double-count is gone — one pitch event per pitch for
  auto-ball, illegal pitch, and pitchout; overturn recounts now agree
  (the 2-1 + illegal-pitch → overturn scenario recounts exactly 3 balls).
  Minors: (A6) "Out of challenges" sheet with no result buttons at 0 +
  defense-in-depth guard; (A7) challenge stepper capped at 2; (A8) verified
  against the actual 2026 MLB ABS rule — +1 challenge for EACH extra inning
  when at 0, so the existing per-inning grant is correct, no code change;
  (A9) already-challenged pitches show "Already challenged" with no result
  buttons; (A10) "Load it" on a different newer game archives the outgoing
  local game first; (A11) staleness compares server updated_at, not device
  clocks; (A12) a failed finish-push marks the archive entry pendingFinish
  and the next launch pull retries it; (A13) corrupt local saves are stashed
  to osb1-corrupt-<ts> with a toast instead of silently resetting; (A14)
  corrupt undo entries toast "Couldn't undo that step"; (A15) ensureShape
  pads short lineups to 9/10 and coerces bad state; (A16) fix-notation keeps
  stored point-in-time names for unchanged error positions, only genuinely
  new positions resolve against the current lineup; (A17) Re-score with no
  undo history (e.g. game loaded from the other device) explains the other
  device wiped it; (A18) pitchout logs a single pitch event; (A19) archive
  cap 50→100 with a heads-up toast at 90; (A20) this harness + the old
  sync-worker/worker.js draft is now labeled NEVER DEPLOY. Frozen rules
  untouched (2/team, overturn keeps, +1 in extras only if at 0, floor 0).
  D1 migration: ALTER TABLE games ADD COLUMN rev INTEGER NOT NULL DEFAULT 0
  (schema-only; existing rows default to rev 0). Worker deployed (health now
  reports ver 2026-10-01-rev1, verified live). Git: local checkout had no
  .git — recovered via init/fetch/reset to origin/main (e581da1), committed,
  pushed; Pages auto-deploys.


- 2026-10-04: Rowan audit/fix pass. Fixed standalone runner-action base
  collisions so Steal / Defensive Indifference / Wild Pitch / Passed Ball can
  no longer silently overwrite a runner already occupying the destination;
  coordinated multi-runner advances remain legal. Normalized undo transaction
  boundaries: opening In Play no longer burns a snapshot, and HBP / ball four
  plus their runner-placement commit now consume one undo step rather than two;
  redundant pre-choice snapshots were removed from steal, DI, pickoff, and
  WP/PB flows. Fixed batting-around display in the classic Book: an inning cell
  now stacks every PA for that batting-order slot instead of showing only the
  first. Reworked Lineup navigation for iPad/phone: sticky Away/Home team
  switcher, per-team 9-slot completion count, one team panel visible at a time,
  quick Roster/Lineup jumps, and Start/Back-to-score control in the sticky bar;
  tapping the score header opens the currently batting team's lineup. Added
  regression coverage for all four areas. Full harness: 147 passed, 0 failed.
  Commits 32b36d6 (app) + 0b1135c (regressions). Worker unchanged; no Worker
  deployment required.


- 2026-10-05: First weird-game scoring usability batch. Wild pitch / passed
  ball is now stored and displayed as a separate runner/game event instead of a
  numbered pitch, matching the tracker convention; subsequent real pitches keep
  the correct pitch number. Lineup now gives a non-blocking warning and highlight
  when multiple active players share the same defensive position. Added custom
  pull-to-refresh from the top of the app (saved state is persisted before reload)
  and a discreet fixed build label, v2026.10.05.1. Full regression harness:
  154 passed, 0 failed. App commit 574339a; regression commit c6da1c2. Worker
  unchanged; no Worker deployment required.


- 2026-10-05: Compact split-view scoring pass. Protected the count from
  squeezing in narrow windows; moved challenge action off the count row and onto
  the currently challengeable pitch (with a small previous-call fallback after
  a terminal PA); compacted Score controls for iPad Split View while keeping
  comfortable tap targets; reorganized In Play into On base vs Out columns with
  Sacrifice separate; added HR location picker for LF / LCF / CF / RCF / RF
  while preserving result code HR. Bumped discreet app version to
  v2026.10.05.2. Full regression harness: 164 passed, 0 failed. App commits
  97ad4d1 + b5df501; regression commit 8745d73. Worker unchanged; no Worker
  deployment required.


- 2026-10-05: Intentional Walk now replaces Pitchout in the scoring controls.
  IBB is a one-tap terminal PA result, uses the normal forced-runner movement,
  records result code IBB, and adds no pitch events. The old pitchout handling
  remains readable internally for compatibility with existing game data, but
  there is no Pitchout scoring button. App version v2026.10.05.3. Full harness:
  168 passed, 0 failed. App commit 22aef62; regression commit 9375f5a.


- 2026-10-05: Foul Tip now has its own pitch control. It counts exactly like
  a swinging strike, including recording strike three as a swinging K, while
  retaining "Foul tip" in pitch history. Count-rebuild, pitch-count, and
  add-missed-pitch logic also recognize foul tips correctly. Narrow split-view
  secondary pitch row is now four compact columns; phone-width remains 2x2.
  App version v2026.10.05.4. Full harness: 175 passed, 0 failed. App commit
  1b19623; regression commit 64fd0e7.


- 2026-10-05: Foul Tip moved onto the strike row in the compact pitch stack.
  Narrow scoring order is now In Play; called strike / swinging strike / Foul Tip;
  Ball / Foul; Intentional Walk / Hit by Pitch. Compact called/swinging strike
  buttons use ꓘ / K with accessibility labels. App version v2026.10.05.6.
  Full harness: 177 passed, 0 failed. App commit f952c1a; regression commit f77364d.


- 2026-10-05: Full-lineup substitution mode replaced the old substitution modal.
  Tapping Subs now opens the lineup screen (fielding team first, with team tabs
  available). In substitution mode, tap the outgoing player to open that exact
  batting-order slot, then tap a roster player to fill it. Defensive positions
  stay editable via dropdowns; position changes update fielding lookup and the
  current-pitcher state. No-DH pitching changes now replace the old pitcher in
  the same batting slot, so the removed pitcher cannot bat again. With a DH,
  pitcher changes stay in the dedicated non-batting pitcher slot. Substitution
  history is retained on the lineup slot and pitching changes are logged.
  App version v2026.10.05.7. Full regression harness: 193 passed, 0 failed.
  App commits 6d501d7 + f426bd4; regression commits 6540e79 + bcff4c7.
  Worker unchanged; no Worker deployment required.


- 2026-10-05: Batting-team substitution view is now filtered. Subs opens on
  the fielding team automatically. Switching to the batting team shows only the
  current batter (pinch hitter target) and occupied-base runners (pinch runner
  targets), hiding the rest of the lineup and defensive-position warnings.
  Pinch hitters replace the current batting-order slot while inheriting the
  count. Pinch runners replace both the runner on base and that player's
  batting-order slot, preventing removed runners from batting again. Team-tab
  switches in substitution mode jump directly to the relevant lineup/target
  section. Removed players are not returned to the eligible roster pool.
  App version v2026.10.05.8. Full regression harness: 207 passed, 0 failed.
  App commit 5e2d894; regression commit a2f3a88. Worker unchanged.


- 2026-10-05: Called and Swinging labels replaced the compact K symbols in
  the strike row. Scoring behavior is unchanged; this is a clarity-only UI
  change. App version v2026.10.05.9. Full regression harness: 207 passed,
  0 failed. App commit afcdef3; regression commit 32b0c90. Worker unchanged.


- 2026-10-05: Pitch-button typography hierarchy refined for narrow split-screen scoring.
  In Play now uses the former large Called/Swinging text size (21px); Called,
  Swinging, Foul Tip, Ball, and Foul use a consistent 16px; Intentional Walk
  and Hit by Pitch use a slightly smaller 14px. Layout and scoring behavior are
  unchanged. App version v2026.10.05.10. Full regression harness: 210 passed,
  0 failed. App commit 2e5996e; regression commit c51384b. Worker unchanged.


- 2026-10-05: Mid-PA intentional-walk pitch preservation is now regression-locked.
  Example: Ball, Ball, then Intentional Walk commits result IBB with exactly the
  two thrown pitch events preserved and adds no extra pitches. App behavior was
  already correct; this change adds explicit coverage so future pitch-total work
  cannot regress it. Full harness: 214 passed, 0 failed. Regression commit
  43d4636. App version remains v2026.10.05.10; Worker unchanged.


- 2026-10-05: WP/PB moved from a separate runner button to pitch holds.
  Ball, Called, and Swinging now support one continuous hold gesture: hold the
  pitch, slide left for Wild Pitch or right for Passed Ball, then release. That
  single gesture records both the pitch and the WP/PB event; ordinary taps
  remain ordinary pitches. The separate Wild / Passed runner button was removed.
  Normal strike three again commits immediately on tap. Held strike three uses
  the uncaught-third-strike flow, including the first-base/two-out eligibility
  rule, runner placement, batter reach, and error tagging through the placement
  sheet. Ball four with a held WP/PB remains a BB while preserving the thrown
  pitch and the WP/PB event. App version v2026.10.05.12. Full regression
  harness: 230 passed, 0 failed. App commits d420098 + 0d17250; regression
  commit 52f22ac. Worker unchanged; no Worker deployment required.
