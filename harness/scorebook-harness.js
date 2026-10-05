#!/usr/bin/env node
/* Opal Scorebook — regression + audit-fix harness (A20).
 * Loads the REAL index.html <script> with stubbed DOM/localStorage/fetch and
 * asserts scoring behavior plus every 2026-10-01 audit fix. Also exercises
 * worker.js (rev versioning / 409) against a mocked D1.
 * Run: node harness/scorebook-harness.js   (exit 1 on any failure)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---------- tiny DOM / browser stubs ---------- */
const els = {};
function makeEl() {
  const t = {
    _html: '', _text: '', _value: '', children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: {}, dataset: {},
    addEventListener() {}, removeEventListener() {},
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    appendChild() {}, closest() { return null; },
    click() {}, focus() {},
  };
  return new Proxy(t, {
    get(o, p) {
      if (p === 'innerHTML') return o._html;
      if (p === 'textContent') return o._text;
      if (p === 'value') return o._value;
      return p in o ? o[p] : undefined;
    },
    set(o, p, v) {
      if (p === 'innerHTML') o._html = String(v);
      else if (p === 'textContent') o._text = String(v);
      else if (p === 'value') o._value = v;
      else o[p] = v;
      return true;
    },
  });
}
const store = {};
global.__store = store;
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
global.document = {
  querySelector: (s) => els[s] || (els[s] = makeEl()),
  querySelectorAll: () => [],
  addEventListener() {},
  createElement: () => makeEl(),
};
Object.defineProperty(global, 'navigator', { value: { userAgent: 'node-harness' }, configurable: true });
global.window = { scrollTo() {} };
global.confirm = () => true;
global.setTimeout = () => 0;
global.clearTimeout = () => {};
global.fetch = async () => { throw new Error('no network in harness'); };
const el = (s) => els[s] || (els[s] = makeEl());
function resetDom() { for (const k of Object.keys(els)) delete els[k]; }

/* ---------- load the real app script ---------- */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('no <script> found in index.html'); process.exit(2); }
const exportLine = `;globalThis.__sb=(()=>({` +
  `get S(){return S;},set S(v){S=v;},` +
  `get undoStack(){return undoStack;},get undoMeta(){return undoMeta;},` +
  `get pendingRemote(){return pendingRemote;},set pendingRemote(v){pendingRemote=v;},` +
  `get syncInfo(){return syncInfo;},` +
  `get corruptStashed(){return corruptStashed;},set corruptStashed(v){corruptStashed=v;},` +
  `blank,blankTeam,ensureShape,snap,persistUndo,rebuildUndoMeta,save,persistLocal,load,undo,` +
  `batTeam,curBatter,pname,ev,innRuns,scoreRun,` +
  `demoLineups,rosterToPool,renderSetup,applySetupTeam,showSetupTeam,` +
  `renderScore,openModal,closeModal,baseName,` +
  `endHalfCheck,errPositions,fielderName,stripDupErr,commitPA,` +
  `doPitch,addCountBall,addCountStrike,doWalk,` +
  `lastPitchEv,lastPitch,chalTeamName,recountCount,` +
  `challengeSheet,doChallenge,chalStepper,` +
  `hitMovers,holdMovers,moveRunnerEvents,paErrTag,placementCollision,placementReview,advanceAll,` +
  `actSteal,actPick,actWPPB,actBalk,actDI,runnerActionCollision,applySub,` +
  `paAt,pasAt,clsOf,teamHits,paErrDisp,teamErrs,playerErrs,renderFielding,bookTable,` +
  `editRescoreReachable,confirmEditPA,outcomeIdx,describePA,paKind,applyNotationFix,applyFixNotation,` +
  `pitchCounts,tryAddPitch,` +
  `syncCfg,setSyncCfg,gameName,gameScore,gameStarted,queuePush,pushGame,fetchGameList,pullOnStart,loadRemoteGame,` +
  `getArchive,updateArchive,addToArchive,archiveCurrentGame,endGame,` +
  `renderGames,renderPendingCard,renderSyncCard,renderPastList,renderAll,showView,toast,esc,genId` +
  `}))();`;
eval(m[1] + exportLine);
const sb = globalThis.__sb;

/* ---------- assert helpers ---------- */
let pass = 0, fail = 0;
const failures = [];
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; failures.push(name); console.log('FAIL:', name); }
}
function eq(a, b, name) {
  ok(a === b, `${name} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
}

/* ---------- test setup ---------- */
function newGame() {
  for (const k of Object.keys(store)) delete store[k];
  resetDom();
  sb.S = sb.blank();
  const mk = (pre) => Array.from({ length: 9 },
    (_, i) => ({ name: pre + (i + 1), num: String(10 + i), pos: String([6, 4, 3, 9, 5, 7, 8, 2, 1][i]) }));
  sb.S.away.lineup = mk('Astro'); sb.S.home.lineup = mk('Rival');
  sb.S.away.name = 'Astros'; sb.S.home.name = 'Rivals';
  sb.S.started = true; sb.S.bat = 'away';
  sb.ensureShape();
  sb.undoStack.length = 0; sb.undoMeta.length = 0;
  sb.corruptStashed = false;
}
function strikeout() { sb.doPitch('cstr'); sb.doPitch('cstr'); sb.doPitch('cstr'); }

async function main() {

  /* ===== regression: core scoring (the original 22-check areas) ===== */
  newGame();
  sb.doPitch('ball'); sb.doPitch('ball'); sb.doPitch('ball'); sb.doPitch('ball');
  el('#plDone').onclick(); // walk Done
  eq(sb.S.pas.length, 1, 'walk commits a PA');
  eq(sb.S.pas[0].result, 'BB', 'walk result code');
  ok(!!sb.S.bases[0], 'walk puts BR on 1st');
  eq(sb.S.balls, 0, 'count resets after walk');

  newGame(); strikeout();
  eq(sb.S.pas.length, 1, 'K commits a PA');
  eq(sb.S.outs, 1, 'K records an out');
  eq(sb.S.order.away, 1, 'K advances the order');

  newGame(); sb.doPitch('sstr'); sb.doPitch('sstr'); sb.doPitch('foul');
  eq(sb.S.strikes, 2, 'foul with 2 strikes stays at 2');
  eq(sb.S.pas.length, 0, 'no PA committed yet');

  newGame(); strikeout();
  const outsAfter = sb.S.outs;
  sb.undo();
  eq(sb.S.outs, outsAfter - 1, 'undo restores outs');
  eq(sb.S.pas.length, 0, 'undo removes the PA');

  newGame();
  sb.S.pa = [{ t: 'p', text: 'Ball' }];
  sb.placementReview(sb.hitMovers(1), '1B', 'Singled');
  el('#plDone').onclick();
  eq(sb.S.pas.length, 1, 'hit commits a PA');
  eq(sb.S.pas[0].result, '1B', 'single result recorded');
  ok(!!sb.S.bases[0], 'BR on 1st after the single');
  eq(sb.S.order.away, 1, 'order advances after the single');

  newGame();
  sb.S.bases[0] = { t: 'away', i: 0 };
  const fakeB = [{ dataset: { b: '0' }, onclick: null }];
  el('#sheet').querySelectorAll = (sel) => (sel === '[data-b]' ? fakeB : []);
  sb.actDI();
  fakeB[0].onclick();
  ok(!sb.S.bases[0] && !!sb.S.bases[1], 'defensive indifference advances the runner');
  eq(sb.S.pas.length, 0, 'DI does not end the PA');

  newGame();
  sb.S.bases[0] = { t: 'away', i: 0 };
  sb.actBalk();
  ok(!sb.S.bases[0] && !!sb.S.bases[1], 'balk advances runner 1st->2nd');

  newGame();
  eq(JSON.stringify(sb.moveRunnerEvents({ who: 'BR', label: 'B', from: 0, to: 4, out: null })),
    JSON.stringify([['r', 'B scores']]), 'moveRunnerEvents: BR scores');
  eq(sb.moveRunnerEvents({ who: 'R', label: 'R', from: 1, to: 1, out: null }).length, 0,
    'moveRunnerEvents: hold is silent');
  const hm = sb.hitMovers(2);
  eq(hm[0].to, 2, 'hitMovers: BR to 2nd on a double');

  newGame();
  sb.S.pa = [{ t: 'p', text: 'Ball' }, { t: 'p', text: 'Called strike' }, { t: 'p', text: 'Foul ball' }];
  sb.recountCount(sb.S.pa);
  eq(sb.S.balls, 1, 'recountCount balls'); eq(sb.S.strikes, 2, 'recountCount strikes (foul caps at 2)');

  newGame();
  sb.S.chal = { away: 2, home: 2 };
  sb.S.pa = [{ t: 'p', text: 'Called strike' }]; sb.S.bat = 'away';
  sb.doChallenge('away', 'upheld');
  eq(sb.S.chal.away, 1, 'upheld challenge costs one');
  sb.S.chal.away = 0;
  sb.doChallenge('away', 'upheld');
  eq(sb.S.chal.away, 0, 'challenge counter floors at 0');

  newGame();
  sb.S.chal = { away: 2, home: 2 };
  sb.S.pa = [{ t: 'p', text: 'Called strike' }]; sb.S.bat = 'away';
  sb.doChallenge('away', 'overturned');
  eq(sb.S.chal.away, 2, 'overturned challenge is kept');

  newGame();
  sb.S.chal = { away: 0, home: 0 }; sb.S.bat = 'home'; sb.S.half = 1; sb.S.inning = 9; sb.S.outs = 3;
  sb.endHalfCheck();
  eq(sb.S.inning, 10, 'half-inning rolls to the 10th');
  eq(sb.S.chal.away, 1, 'extras grant 0->1 at the 10th');
  eq(sb.S.chal.home, 1, 'extras grant 0->1 for both teams');

  newGame();
  sb.S.away.pool = [{ name: 'Sub Guy', num: '99', pos: '7' }];
  sb.applySub('away', 'PH', 0, null, { name: 'Sub Guy', num: '99' });
  eq(sb.S.away.lineup[0].name, 'Sub Guy', 'pinch hitter subs in');
  eq(sb.S.subLog.length, 1, 'sub is logged');

  newGame();
  eq(sb.clsOf('1B'), 'hit', 'clsOf hit');
  eq(sb.clsOf('K'), 'out', 'clsOf K');
  eq(sb.gameName(), 'Astros @ Rivals', 'gameName');
  sb.S.runs = { away: [2, 1], home: [0, 3] };
  eq(sb.gameScore(), '3-3', 'gameScore');

  /* ===== A5: single pitch-event logging (the P2-10 major) ===== */
  newGame();
  sb.doPitch('autoball');
  eq(sb.S.pa.filter((e) => e.t === 'p').length, 1, 'A5: auto ball logs ONE pitch event');
  eq(sb.S.balls, 1, 'A5: auto ball counts one ball');
  ok(/^Automatic ball/.test(sb.S.pa[0].text), 'A5: auto-ball text still reads as a ball');

  newGame();
  sb.doPitch('illegal');
  eq(sb.S.pa.filter((e) => e.t === 'p').length, 1, 'A5: illegal pitch logs ONE pitch event');
  eq(sb.S.balls, 1, 'A5: illegal pitch counts one ball');

  newGame();
  sb.doPitch('pitchout');
  eq(sb.S.pa.filter((e) => e.t === 'p').length, 1, 'A18: pitchout logs ONE pitch event');
  eq(sb.S.balls, 1, 'A18: pitchout counts one ball');

  // The exact audit scenario: 2-1 count with an illegal pitch, overturn a called
  // strike -> must recount 3 balls, NOT 4, and must not award a walk.
  newGame();
  sb.doPitch('ball');      // 1-0
  sb.doPitch('illegal');   // 2-0 (one event)
  sb.doPitch('cstr');      // 2-1
  eq(sb.S.pa.filter((e) => e.t === 'p').length, 3, 'A5: 3 pitches, 3 events');
  const lp = sb.lastPitch();
  ok(!!lp && lp.live && lp.evts[lp.idx].text === 'Called strike', 'A5: last pitch is the challengeable called strike');
  sb.doChallenge('away', 'overturned'); // batting team challenges the strike
  eq(sb.S.balls, 3, 'A5: overturn recounts exactly 3 balls (no double-count)');
  eq(sb.S.strikes, 0, 'A5: overturn recounts 0 strikes');
  eq(sb.S.pas.length, 0, 'A5: no phantom walk committed');
  ok(sb.S.pa.length > 0, 'A5: PA still live after the overturn');

  // pitchCounts agrees (used by Add-missed-pitch contradiction checks)
  newGame();
  sb.doPitch('autoball'); sb.doPitch('illegal');
  const pc = sb.pitchCounts({ events: sb.S.pa });
  eq(pc.b, 2, 'A5: pitchCounts sees 2 balls for auto+illegal');

  /* ===== A3: runner collision ===== */
  newGame();
  sb.S.pa = [{ t: 'p', text: 'Ball' }];
  const badMovers = [
    { who: 'BR', label: 'BR (batter)', from: 0, to: 2, out: null },
    { who: 'R', r: { t: 'away', i: 0 }, label: 'R1', from: 1, to: 2, out: null },
  ];
  sb.placementReview(badMovers, '1B', 'Singled');
  el('#plDone').onclick();
  eq(sb.S.pas.length, 0, 'A3: colliding placement does not commit');
  eq(sb.undoStack.length, 0, 'A3: rejected before snap()');
  ok(el('#toast').textContent.indexOf("can't end on 2nd") >= 0, 'A3: plain-English message');
  eq(sb.placementCollision(badMovers), 2, 'A3: placementCollision finds base 2');
  eq(sb.placementCollision([
    { who: 'BR', label: 'x', from: 0, to: 1, out: null },
    { who: 'R', r: {}, label: 'y', from: 1, to: 2, out: null },
    { who: 'R', r: {}, label: 'z', from: 2, to: 4, out: null },
  ]), 0, 'A3: legal placement passes');
  // scoring (to=4) twice is fine
  eq(sb.placementCollision([
    { who: 'BR', label: 'x', from: 0, to: 4, out: null },
    { who: 'R', r: {}, label: 'y', from: 3, to: 4, out: null },
  ]), 0, 'A3: two runners scoring is not a collision');

  /* ===== A4: rewind reachability / A17: cross-device load ===== */
  newGame(); strikeout(); strikeout(); strikeout();
  eq(sb.S.pas.length, 3, 'setup: 3 PAs');
  ok(sb.editRescoreReachable(2), 'A4: last PA reachable');
  ok(sb.editRescoreReachable(0), 'A4: first PA reachable while history intact');
  while (sb.undoStack.length > 5) { sb.undoStack.shift(); sb.undoMeta.shift(); }
  ok(!sb.editRescoreReachable(0), 'A4: evicted PA correctly unreachable');
  ok(sb.editRescoreReachable(2), 'A4: last PA still reachable after partial eviction');
  resetDom(); sb.confirmEditPA(0);
  eq(el('#ceYes').onclick, undefined, 'A4: Rewind button disabled when unreachable');
  ok(el('#sheet').innerHTML.indexOf("Can't rewind that far") >= 0, 'A4: explains why');
  resetDom(); sb.confirmEditPA(2);
  ok(typeof el('#ceYes').onclick === 'function', 'A4: Rewind button live when reachable');
  // A17: cross-device load wipes undo -> explain, don't silently no-op
  sb.undoStack.length = 0; sb.undoMeta.length = 0; resetDom();
  ok(!sb.editRescoreReachable(1), 'A17: unreachable with empty history');
  sb.confirmEditPA(1);
  ok(el('#sheet').innerHTML.indexOf('other device') >= 0, 'A17: explains the missing history');
  // old-format undo stores (plain array) rebuild meta instead of crashing
  sb.undoStack.push(JSON.stringify(sb.S)); resetDom();
  sb.undoMeta.length = 0;
  sb.editRescoreReachable(2); // triggers rebuildUndoMeta
  eq(sb.undoMeta.length, sb.undoStack.length, 'A4: meta rebuilt for legacy undo stores');

  /* ===== A6: no free challenges at 0 ===== */
  newGame();
  sb.S.chal = { away: 0, home: 2 }; sb.S.bat = 'home';
  sb.S.pa = [{ t: 'p', text: 'Ball' }]; // ball -> challenged by fielding team (away)
  resetDom(); sb.challengeSheet();
  eq(el('#chUp').onclick, undefined, 'A6: no Upheld button at 0 challenges');
  eq(el('#chOv').onclick, undefined, 'A6: no Overturned button at 0 challenges');
  ok(el('#sheet').innerHTML.indexOf('Out of challenges') >= 0, 'A6: "Out of challenges" shown');
  sb.doChallenge('away', 'upheld');
  eq(sb.S.chal.away, 0, 'A6: guard in doChallenge holds at 0');
  ok(!sb.S.pa[0].ch, 'A6: no challenge badge written at 0');

  /* ===== A7: stepper ceiling ===== */
  newGame(); sb.S.chal = { away: 2, home: 2 };
  const fakeCA = [{ dataset: { ca: 'away|1' }, onclick: null }, { dataset: { ca: 'away|-1' }, onclick: null }];
  el('#sheet').querySelectorAll = (sel) => (sel === '[data-ca]' ? fakeCA : []);
  sb.chalStepper();
  fakeCA[0].onclick();
  eq(sb.S.chal.away, 2, 'A7: stepper + capped at 2');
  fakeCA[1].onclick();
  eq(sb.S.chal.away, 1, 'A7: stepper - still works');

  /* ===== A8: extras grant verified per-inning (no code change) ===== */
  newGame();
  sb.S.chal = { away: 0, home: 1 }; sb.S.bat = 'home'; sb.S.half = 1; sb.S.inning = 10; sb.S.outs = 3;
  sb.endHalfCheck();
  eq(sb.S.inning, 11, 'A8: rolls to the 11th');
  eq(sb.S.chal.away, 1, 'A8: per-inning re-grant at the 11th (2026 rule)');
  eq(sb.S.chal.home, 1, 'A8: team that kept its challenge is not topped up');

  /* ===== A9: one challenge per pitch ===== */
  newGame();
  sb.S.chal = { away: 2, home: 2 }; sb.S.bat = 'away';
  sb.S.pa = [{ t: 'p', text: 'Ball' }];
  sb.doChallenge('home', 'upheld');
  eq(sb.S.chal.home, 1, 'A9 setup: first challenge costs one');
  ok(!!sb.S.pa[0].ch, 'A9 setup: badge recorded');
  resetDom(); sb.challengeSheet();
  eq(el('#chUp').onclick, undefined, 'A9: no result buttons on a challenged pitch');
  ok(el('#sheet').innerHTML.indexOf('Already challenged') >= 0, 'A9: "Already challenged" shown');
  sb.doChallenge('home', 'overturned');
  eq(sb.S.chal.home, 1, 'A9: guard in doChallenge blocks the second challenge');

  /* ===== A13: corrupt save ===== */
  for (const k of Object.keys(store)) delete store[k];
  store['osb1'] = '{corrupt json';
  sb.load();
  ok(sb.S === null, 'A13: corrupt load leaves S null for init to blank');
  ok(sb.corruptStashed === true, 'A13: corrupt flag set');
  ok(Object.keys(store).some((k) => k.indexOf('osb1-corrupt-') === 0), 'A13: raw payload stashed');
  ok(store[Object.keys(store).find((k) => k.indexOf('osb1-corrupt-') === 0)] === '{corrupt json',
    'A13: stashed payload is the original bytes');

  /* ===== A14: corrupt undo entry ===== */
  newGame(); strikeout();
  const sBefore = JSON.stringify(sb.S);
  sb.undoStack.push('{bad'); sb.undoMeta.push([-1, -1]);
  resetDom(); sb.undo();
  ok(el('#toast').textContent.indexOf("Couldn't undo that step") >= 0, 'A14: toast on corrupt undo entry');
  eq(JSON.stringify(sb.S), sBefore, 'A14: state untouched by the failed undo');

  /* ===== A15: shape hardening ===== */
  newGame();
  sb.S.away.lineup = [{ name: 'Solo', num: '1', pos: '6' }];
  sb.S.bat = 'bogus';
  sb.ensureShape();
  eq(sb.S.away.lineup.length, 9, 'A15: short lineup padded to 9');
  eq(sb.S.bat, 'away', 'A15: bad bat value coerced');
  ok(!!sb.curBatter(), 'A15: curBatter() no longer undefined');
  newGame();
  sb.S.home.dh = true; sb.S.home.lineup = [{ name: 'x', num: '', pos: '' }];
  sb.ensureShape();
  eq(sb.S.home.lineup.length, 10, 'A15: DH lineup padded to 10');

  /* ===== A16: fix-notation keeps point-in-time error blame ===== */
  newGame();
  sb.S.pa = [{ t: 'o', text: 'Reached on error E5' }];
  sb.commitPA('E5', 'E5,E8'); // E5 outcome + extra E8 tag
  const fpa = sb.S.pas[0];
  eq(fpa.errBy.join(','), 'Rival5,Rival7', 'A16 setup: point-in-time names stored');
  sb.S.home.lineup[4].name = 'NewGuy';   // defensive sub at 3B (pos 5)
  sb.S.home.lineup[6].name = 'New8Guy';  // defensive sub at CF (pos 8)
  sb.applyFixNotation(fpa, 'E6', 'Reached on error E6');
  eq(fpa.result, 'E6', 'A16: result updated');
  eq(fpa.errBy[1], 'Rival7', 'A16: unchanged error position keeps the stored name');
  eq(fpa.errBy[0], 'Rival1', 'A16: genuinely new error position resolves to current lineup');

  /* ===== roster surname suffix sorting ===== */
  const suffixRoster = sb.rosterToPool([
    { person:{fullName:'Kris Bryant'}, jerseyNumber:'23', position:{abbreviation:'3B'} },
    { person:{fullName:'Albert Almora Jr.'}, jerseyNumber:'5', position:{abbreviation:'CF'} },
    { person:{fullName:'Luis Garcia Jr.'}, jerseyNumber:'2', position:{abbreviation:'2B'} },
    { person:{fullName:'Will Smith'}, jerseyNumber:'16', position:{abbreviation:'C'} },
  ]);
  eq(suffixRoster.map(p=>p.name).join('|'),
    'Albert Almora Jr.|Kris Bryant|Luis Garcia Jr.|Will Smith',
    'roster: Jr./Sr./Roman numeral suffixes do not become the surname');

  /* ===== 2026-10-04: runner safety + undo boundaries + batting-around + lineup nav ===== */
  newGame();
  sb.renderSetup();
  sb.showSetupTeam('home');
  ok(el('#awayPanel').hidden === true && el('#homePanel').hidden === false,
    'N1: Lineup team switch shows only Home');
  sb.showSetupTeam('away');
  ok(el('#awayPanel').hidden === false && el('#homePanel').hidden === true,
    'N1: Lineup team switch returns to Away');

  newGame();
  sb.S.bases[0] = { t: 'away', i: 0 };
  sb.S.bases[1] = { t: 'away', i: 1 };
  eq(sb.runnerActionCollision({ 0: 2 }), 2,
    'N2: standalone runner move refuses an occupied destination');
  eq(sb.runnerActionCollision({ 0: 2, 1: 3 }), 0,
    'N2: coordinated advances may vacate the destination');
  eq(sb.runnerActionCollision({ 1: 4 }), 0,
    'N2: scoring runner leaves no base collision');

  newGame();
  let u0 = sb.undoStack.length;
  sb.doPitch('inplay');
  eq(sb.undoStack.length, u0,
    'N3: opening In Play does not consume an undo snapshot');

  newGame();
  u0 = sb.undoStack.length;
  sb.doPitch('hbp');
  el('#plDone').onclick();
  eq(sb.undoStack.length, u0 + 1,
    'N3: HBP + placement is one undoable action');

  newGame();
  sb.doPitch('ball'); sb.doPitch('ball'); sb.doPitch('ball');
  u0 = sb.undoStack.length;
  sb.doPitch('ball');
  el('#plDone').onclick();
  eq(sb.undoStack.length, u0 + 1,
    'N3: ball four + placement is one undoable action');

  newGame();
  sb.S.pas = [
    { team: 'away', b: 0, inning: 1, half: 0, result: '1B', batter: 'Astro1', events: [] },
    { team: 'away', b: 0, inning: 1, half: 0, result: 'K', batter: 'Astro1', events: [] },
  ];
  eq(sb.pasAt('away', 0, 1).length, 2,
    'N4: batting around keeps multiple PAs for one lineup slot in an inning');
  const batAroundBook = sb.bookTable('away');
  ok(batAroundBook.indexOf('paStack') >= 0 && batAroundBook.indexOf('>1B<') >= 0 && batAroundBook.indexOf('>K<') >= 0,
    'N4: scorebook renders both batting-around diamonds in the inning cell');

  /* ===== A19: archive cap ===== */
  newGame();
  for (let i = 0; i < 105; i++) sb.addToArchive({ gid: 'g' + i, name: 'n', score: '0-0', date: i, state: {} });
  eq(sb.getArchive().length, 100, 'A19: archive capped at 100');

  /* ===== A20: process ===== */
  ok(fs.existsSync(path.join(ROOT, 'harness', 'scorebook-harness.js')),
    'A20: this harness is committed in the repo');
  ok(fs.readFileSync(path.join(ROOT, 'sync-worker', 'worker.js'), 'utf8').indexOf('NEVER DEPLOY') >= 0,
    'A20: incompatible draft worker is labeled');

  /* ===== sync: rev versioning + 409 (the P1-5 major) ===== */
  const fakeServer = () => {
    const rows = {};
    const fetch = async (url, opts = {}) => {
      const u = String(url);
      const method = (opts.method || 'GET').toUpperCase();
      const resp = (status, obj) => ({ ok: status >= 200 && status < 300, status, json: async () => obj });
      const listM = /\/api\/games(\?|$)/.test(u) && !/\/api\/games\/[A-Za-z0-9-]/.test(u);
      if (listM && method === 'GET') {
        const games = Object.entries(rows).map(([id, r]) => ({
          id, name: r.name, device: r.device, created_at: r.created_at,
          updated_at: r.updated_at, finished: r.finished, score: r.score, rev: r.rev,
        })).sort((a, b) => b.updated_at - a.updated_at);
        return resp(200, { games });
      }
      const m2 = u.match(/\/api\/games\/([A-Za-z0-9-]{8,64})/);
      if (m2) {
        const id = m2[1];
        if (method === 'GET') {
          const r = rows[id];
          if (!r) return resp(404, { error: 'not found' });
          return resp(200, Object.assign({ id }, r, { state: JSON.stringify(r.state) }));
        }
        if (method === 'PUT') {
          const body = JSON.parse(opts.body);
          const ex = rows[id];
          const curRev = ex ? ex.rev : 0;
          if (ex && body.base_rev !== undefined && body.base_rev !== null && Number(body.base_rev) !== curRev)
            return resp(409, { error: 'stale', rev: curRev });
          const now = Date.now();
          const newRev = ex ? curRev + 1 : 0;
          rows[id] = {
            sync_code: body.code, name: body.name, device: body.device,
            created_at: ex ? ex.created_at : now, updated_at: now,
            finished: body.finished ? 1 : 0, score: body.score, state: body.state, rev: newRev,
          };
          return resp(200, { ok: true, id, updated_at: now, rev: newRev });
        }
      }
      return resp(404, { error: 'not found' });
    };
    return { fetch, rows };
  };

  // A1: stale push rejected, local kept, Julie chooses
  newGame();
  sb.setSyncCfg({ code: 'TEST-CODE-1234', device: 'harness' });
  const srv = fakeServer();
  global.fetch = srv.fetch;
  let r = await sb.pushGame(false, sb.S);
  ok(r === true, 'A1: first push accepted');
  eq(sb.S.rev, 0, 'A1: new row starts at rev 0');
  ok(sb.S.serverUpdatedAt > 0, 'A11: serverUpdatedAt stored from push response');
  sb.doPitch('ball');
  r = await sb.pushGame(false, sb.S);
  eq(sb.S.rev, 1, 'A1: second push advances rev to 1');
  // ...meanwhile the other device pushes twice (server rev -> 3)
  srv.rows[sb.S.gid].rev = 3;
  srv.rows[sb.S.gid].updated_at = Date.now() + 5000;
  sb.doPitch('foul');
  const paBefore = JSON.stringify(sb.S.pa);
  r = await sb.pushGame(false, sb.S);
  ok(r === false, 'A1: stale push rejected with 409');
  ok(!!sb.pendingRemote && sb.pendingRemote.conflict === true, 'A1: conflict card raised');
  eq(sb.S.rev, 1, 'A1: local rev NOT advanced on 409 — keeps 409ing until Julie resolves');
  eq(JSON.stringify(sb.S.pa), paBefore, 'A1: local plays preserved, nothing clobbered');
  ok(sb.syncInfo.msg.indexOf('Games tab') >= 0, 'A1: sync status points at the Games tab');
  // Julie taps "Keep mine (overwrites)" -> explicit force
  resetDom(); sb.renderPendingCard();
  await el('#prKeep').onclick();
  eq(sb.S.rev, 4, 'A1: force push accepted as Julie\'s explicit choice');
  eq(sb.pendingRemote, null, 'A1: card cleared after resolution');

  // A2: same-gid server-newer NEVER auto-replaces a started local game
  srv.rows[sb.S.gid].rev = 5; // other device pushed again
  srv.rows[sb.S.gid].updated_at = Date.now() + 9000;
  const localPa = JSON.stringify(sb.S.pa);
  await sb.pullOnStart(false);
  ok(!!sb.pendingRemote && sb.pendingRemote.conflict === true, 'A2: same-gid server-newer routes to the card');
  eq(JSON.stringify(sb.S.pa), localPa, 'A2: local game NOT auto-replaced');
  eq(sb.undoStack.length > 0, true, 'A2: undo history intact');
  // ...Julie taps "Load it"
  resetDom(); sb.renderPendingCard();
  await el('#prLoad').onclick();
  eq(sb.S.rev, 5, 'A1: Load it adopts the server rev');
  eq(sb.undoStack.length, 0, 'A17: undo cleared on cross-device load');
  ok(sb.S.serverUpdatedAt > 0, 'A11: serverUpdatedAt adopted on load');
  // A4: undo preserves rev/serverUpdatedAt so it can't manufacture a conflict
  sb.doPitch('ball');
  const revKept = sb.S.rev, tsKept = sb.S.serverUpdatedAt;
  sb.undo();
  eq(sb.S.rev, revKept, 'A4: undo preserves rev across pops');
  eq(sb.S.serverUpdatedAt, tsKept, 'A4: undo preserves serverUpdatedAt');

  // A10: different-gid "Load it" archives the outgoing local game first
  newGame();
  sb.setSyncCfg({ code: 'TEST-CODE-1234', device: 'harness' });
  global.fetch = srv.fetch;
  sb.doPitch('ball');
  await sb.pushGame(false, sb.S);
  const myGid = sb.S.gid;
  const other = sb.blank(); other.gid = 'gOTHER1234'; other.started = true;
  other.away.name = 'Mets'; other.home.name = 'Yankees';
  srv.rows['gOTHER1234'] = {
    sync_code: 'TEST-CODE-1234', name: 'Mets @ Yankees', device: 'iPhone',
    created_at: 1, updated_at: Date.now() + 10000, finished: 0, score: '0-0', state: other, rev: 0,
  };
  await sb.pullOnStart(false);
  ok(!!sb.pendingRemote && !sb.pendingRemote.conflict, 'A10: different-gid pending card');
  resetDom(); sb.renderPendingCard();
  await el('#prLoad').onclick();
  ok(sb.getArchive().some((a) => a.gid === myGid), 'A10: outgoing local game archived on Load it');
  eq(sb.S.gid, 'gOTHER1234', 'A10: remote game loaded');

  // A12: failed finish-push is retried on next pull
  newGame();
  sb.setSyncCfg({ code: 'TEST-CODE-1234', device: 'harness' });
  global.fetch = srv.fetch;
  sb.doPitch('ball');
  await sb.pushGame(false, sb.S);
  const finGid = sb.S.gid;
  global.fetch = async () => { throw new Error('offline'); };
  await sb.endGame();
  const archEntry = sb.getArchive().find((a) => a.gid === finGid);
  ok(!!archEntry && archEntry.pendingFinish === true, 'A12: failed finish-push marked pendingFinish');
  global.fetch = srv.fetch;
  await sb.pullOnStart(false);
  ok(sb.getArchive().find((a) => a.gid === finGid).pendingFinish === false,
    'A12: pendingFinish retried on next pull and cleared');
  ok(srv.rows[finGid] && srv.rows[finGid].finished === 1, 'A12: server row marked finished after retry');

  /* ===== worker.js: rev + 409 against a mocked D1 ===== */
  await (async () => {
    const wsrc = fs.readFileSync(path.join(ROOT, 'worker.js'), 'utf8')
      .replace('export default', 'globalThis.__worker =');
    eval(wsrc);
    const worker = globalThis.__worker;
    const rows = new Map();
    const env = {
      DB: {
        prepare(sql) {
          return {
            sql, params: [],
            bind(...p) { this.params = p; return this; },
            async first() {
              if (this.sql.indexOf('SELECT sync_code, created_at, rev') === 0) {
                const r = rows.get(this.params[0]);
                return r ? { sync_code: r.sync_code, created_at: r.created_at, rev: r.rev } : null;
              }
              if (this.sql.indexOf('SELECT * FROM games') === 0) {
                const r = rows.get(this.params[0]);
                return (r && r.sync_code === this.params[1]) ? Object.assign({ id: this.params[0] }, r) : null;
              }
              return null;
            },
            async all() {
              const out = [...rows.entries()]
                .filter(([, r]) => r.sync_code === this.params[0])
                .map(([id, r]) => ({ id, name: r.name, device: r.device, created_at: r.created_at, updated_at: r.updated_at, finished: r.finished, score: r.score, rev: r.rev }))
                .sort((a, b) => b.updated_at - a.updated_at).slice(0, 200);
              return { results: out };
            },
            async run() {
              if (this.sql.indexOf('INSERT INTO games') === 0) {
                const [id, code, name, device, created, updated, finished, score, state, rev] = this.params;
                rows.set(id, { sync_code: code, name, device, created_at: created, updated_at: updated, finished, score, state, rev });
              } else if (this.sql.indexOf('DELETE FROM games') === 0) {
                const r = rows.get(this.params[0]);
                if (r && r.sync_code === this.params[1]) rows.delete(this.params[0]);
              }
              return { success: true };
            },
          };
        },
      },
    };
    const wfetch = async (method, p, body) => {
      const req = {
        method, url: 'https://x' + p,
        json: async () => { if (body === undefined) throw new Error('no body'); return body; },
      };
      const res = await worker.fetch(req, env);
      return { status: res.status, body: await res.json() };
    };
    const G = 'gtestgame1', C = 'TEST-CODE-1234';
    let w = await wfetch('GET', '/api/health');
    eq(w.body.ver, '2026-10-01-rev1', 'worker: health reports version');
    w = await wfetch('PUT', '/api/games/' + G, { code: C, name: 'A @ B', device: 't', state: { x: 1 } });
    eq(w.status, 200, 'worker: new PUT accepted');
    eq(w.body.rev, 0, 'worker: new row rev 0');
    w = await wfetch('PUT', '/api/games/' + G, { code: C, base_rev: 0, state: { x: 2 } });
    eq(w.body.rev, 1, 'worker: matching base_rev advances rev');
    w = await wfetch('PUT', '/api/games/' + G, { code: C, base_rev: 0, state: { x: 3 } });
    eq(w.status, 409, 'worker: stale base_rev -> 409');
    eq(w.body.rev, 1, 'worker: 409 reports current rev');
    w = await wfetch('GET', '/api/games/' + G + '?code=' + C);
    eq(w.body.rev, 1, 'worker: row unchanged by the stale write');
    w = await wfetch('PUT', '/api/games/' + G, { code: C, state: { x: 4 } });
    eq(w.body.rev, 2, 'worker: force PUT (no base_rev) overwrites');
    w = await wfetch('PUT', '/api/games/' + G, { code: 'WRONG-CODE-1', base_rev: 2, state: {} });
    eq(w.status, 403, 'worker: cross-code PUT forbidden');
    w = await wfetch('GET', '/api/games?code=' + C);
    ok(w.body.games.length === 1 && w.body.games[0].rev === 2, 'worker: list includes rev');
    w = await wfetch('PUT', '/api/games/' + G, { code: C, base_rev: 'abc', state: {} });
    eq(w.status, 409, 'worker: garbage base_rev -> 409, not a silent write');
    w = await wfetch('PUT', '/api/games/' + G, { code: C, base_rev: 2, state: 'x'.repeat(2000001) });
    eq(w.status, 413, 'worker: 2MB cap still enforced');
    w = await wfetch('DELETE', '/api/games/' + G + '?code=' + C);
    eq(w.status, 200, 'worker: DELETE ok');
    w = await wfetch('GET', '/api/games/' + G + '?code=' + C);
    eq(w.status, 404, 'worker: deleted row gone');
  })();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('HARNESS ERROR:', e); process.exit(2); });
