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
  const classes = new Set();
  const t = {
    _html: '', _text: '', _value: '', children: [],
    classList: {
      add(...names) { names.forEach(n => classes.add(n)); },
      remove(...names) { names.forEach(n => classes.delete(n)); },
      toggle(name, force) {
        const add = force === undefined ? !classes.has(name) : !!force;
        if (add) classes.add(name); else classes.delete(name);
        return add;
      },
      contains(name) { return classes.has(name); },
    },
    style: {}, dataset: {},
    addEventListener() {}, removeEventListener() {},
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; }, hasAttribute() { return false; },
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
  `get substitutionMode(){return substitutionMode;},get pendingSub(){return pendingSub;},get subIncoming(){return subIncoming;},` +
  `get viewing(){return viewing;},set viewing(v){viewing=v;},` +
  `APP_VERSION,blank,blankTeam,localISODate,displayGameDate,ensureShape,snap,persistUndo,rebuildUndoMeta,save,persistLocal,load,undo,` +
  `batTeam,curBatter,pname,ev,innRuns,scoreRun,syncPitcherFromLineup,fieldingTeam,activePitcherLabel,pitchCountsAsThrown,contactPitchBonus,pitcherAppearanceOrder,pitcherPitchSummary,pitcherPitchCount,` +
  `demoLineups,rosterPoolSort,rosterToPool,transactionQuery,transactionPlayersToPool,mergeRosterPool,rosterQuery,clearSlot,scoreTeamAbbr,duplicatePositions,renderPositionWarning,renderSetup,applySetupTeam,showSetupTeam,` +
  `runnerLineupSlot,offensiveSubTargets,offensiveSubHTML,selectIncomingSub,cancelIncomingSub,applyIncomingLineupSub,applyIncomingOffensiveSub,beginLineupSub,beginOffensiveSub,cancelPendingSub,completeLineupSub,completeOffensiveSub,openSubstitutionLineup,finishSubstitutionMode,tapPoolPlayer,` +
  `renderScore,openModal,closeModal,baseName,` +
  `endHalfCheck,errPositions,fielderName,stripDupErr,commitPA,` +
  `doPitch,doPitchWPPB,addCountBall,addCountStrike,strikeoutReview,calledStrikeoutReview,swingingStrikeoutReview,commitCaughtStrikeout,commitBuntStrikeout,uncaughtThirdStrike,walkMovers,fielderChoiceMovers,doWalk,` +
  `lastPitchEv,lastPitch,challengeTeamFor,chalTeamName,countAfterPitch,recountCount,` +
  `challengeSheet,doChallenge,chalStepper,` +
  `outcomeModal,handleOutcome,hitPicker,fcPlayText,fielderChoicePicker,groundRuleDouble,bindDoubleGesture,dpModal,triplePlayEligible,triplePlayCandidates,triplePlayDisplay,commitTriplePlay,triplePlayModal,buntOutNotation,scoreBuntOut,bindBuntOutGesture,foulOutNotation,scoreFoulOut,bindFoulOutGesture,homeRunText,homeRunLocation,hitMovers,holdMovers,sacrificeMovers,resultAwardBase,ensureRunnerIdentity,runnerAdvanceData,runnerAdvanceEvent,setRunnerEnd,runnerEndFor,currentRunnerBase,runnerPathById,moveRunnerEvents,paErrTag,placementCollision,needsAdvanceReason,advanceReasonChoices,extraAdvanceReason,placementReview,advanceAll,` +
  `recordRunnerOut,runnerAtBase,runnerActionMenu,actSteal,actPick,actWPPB,actBalk,actDI,runnerActionCollision,applySub,` +
  `paAt,pasAt,clsOf,isSacrificeDoublePlay,sacrificeDoublePlayFielding,paResultDisplay,paBatterIsOut,paInningEnded,legacyRunnerNamedOut,legacyRunnerAnonymousOutPossible,paBookJourney,bookAdvanceBatterSlot,bookAdvanceLabel,bookAdvanceLabelPos,bookDiamondHTML,teamHits,paErrDisp,teamErrs,playerErrs,renderFielding,bookTable,renderDecisions,renderBookBanner,renderPbp,terminalPitchLabel,paPitchAudit,beginPastEditIfNeeded,deleteStoredPitch,deletePitchPicker,auditEditPA,pitchAuditModal,` +
  `editRescoreReachable,confirmEditPA,outcomeIdx,describePA,paKind,applyNotationFix,applyFixNotation,editPA,fixNotation,officialRuling,` +
  `pitchCounts,tryAddPitch,teamRunTotal,cleanPitcherName,pitcherCandidates,decisionList,decisionInputRow,decisionPitcherPicker,gamePitchingCheckHTML,gameDecisionSheet,persistViewedGameEdit,startPastGameEdit,finishPastGameEdit,` +
  `syncCfg,setSyncCfg,gameName,gameScore,gameStarted,queuePush,pushGame,fetchGameList,pullOnStart,loadRemoteGame,` +
  `getArchive,updateArchive,addToArchive,archiveCurrentGame,endGame,` +
  `renderGames,renderPendingCard,renderSyncCard,renderPastList,bindPitchGestures,applyScoreProportionalScale,renderAll,showView,initPullToRefresh,toast,esc,genId` +
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

  /* ===== runner actions live on base diamonds ===== */
  newGame();
  sb.S.bases[1]={t:'away',i:2};
  sb.runnerActionMenu(1);
  ok(el('#sheet').innerHTML.indexOf('Steal')>=0 &&
     el('#sheet').innerHTML.indexOf('Pickoff')>=0 &&
     el('#sheet').innerHTML.indexOf('Def. Indiff.')>=0,
    'RA1: tapping an occupied base opens Steal / Pickoff / Defensive Indifference for that runner');
  ok(el('#sheet').innerHTML.indexOf('On 2nd')>=0,
    'RA1: base action menu identifies the tapped runner base');
  el('#raDI').onclick();
  ok(!sb.S.bases[1]&&!!sb.S.bases[2],
    'RA1: direct base Defensive Indifference acts on the tapped runner without another runner picker');

  newGame();
  sb.S.bases[0]={t:'away',i:0};
  sb.runnerActionMenu(0);
  el('#raSteal').onclick();
  ok(el('#sheet').innerHTML.indexOf('Steal — #10 Astro1')>=0,
    'RA1: direct base Steal goes straight to that runner safe/out flow');

  newGame();
  sb.S.bases[0]={t:'away',i:0};
  sb.renderScore();
  ok(el('#b1').classList.contains('runnerTap'),
    'RA1: occupied base is rendered as an actionable runner target');
  ok(el('#hPitcher').classList.contains('balkTap'),
    'RA1: pitcher becomes the Balk tap target when runners are aboard');
  ok(html.indexOf('id="stealBtn"')<0 &&
     html.indexOf('id="diBtn"')<0 &&
     html.indexOf('id="pickBtn"')<0 &&
     html.indexOf('id="balkBtn"')<0,
    'RA1: old bottom runner-action buttons are removed');


  newGame();
  sb.S.bases[0] = { t: 'away', i: 0 };
  sb.actBalk();
  ok(!sb.S.bases[0] && !!sb.S.bases[1], 'balk advances runner 1st->2nd');

  newGame();
  const scoredRunner={t:'away',i:0,rid:'r-score'};
  const scoreEvents=sb.moveRunnerEvents({who:'BR',label:'B',from:0,award:1,to:4,out:null,r:scoredRunner},'1B');
  eq(scoreEvents.length,1,'moveRunnerEvents: BR extra movement creates one structured event');
  eq(scoreEvents[0][1].advance.from,1,'moveRunnerEvents: BR extra movement starts at awarded base');
  eq(scoreEvents[0][1].advance.to,4,'moveRunnerEvents: BR score path ends at home');
  eq(sb.moveRunnerEvents({ who: 'R', label: 'R', from: 1, to: 1, out: null, r:{t:'away',i:0,rid:'r-hold'} }).length, 0,
    'moveRunnerEvents: hold is silent');
  const hm = sb.hitMovers(2);
  eq(hm[0].to, 2, 'hitMovers: BR to 2nd on a double');
  eq(hm[0].award,2,'hitMovers: double remembers 2B was the awarded base');

  const singleThrow=sb.hitMovers(1)[0];
  singleThrow.r={t:'away',i:0,rid:'r-throw'};singleThrow.to=2;singleThrow.adv='throw';
  const throwEvt=sb.moveRunnerEvents(singleThrow,'1B')[0][1];
  eq(throwEvt.advance.from,1,'PATH1: single plus extra advance starts path at first');
  eq(throwEvt.advance.to,2,'PATH1: single plus extra advance ends at second');
  eq(throwEvt.advance.reason,'throw','PATH1: single advanced to second preserves on-throw reason');
  ok(/on throw/.test(throwEvt.text),'PATH1: on-throw advancement stays readable in play text');

  let advanceRedraws=0;
  sb.extraAdvanceReason({who:'BR',label:'Batter',from:0,award:1,defaultTo:1,to:2,adv:null,err:null},()=>{advanceRedraws++;});
  ok(el('#sheet').innerHTML.indexOf('On Throw')>=0 &&
     el('#sheet').innerHTML.indexOf('Error')>=0 &&
     el('#sheet').innerHTML.indexOf('Other')>=0,
    'PATH1: extra-base placement asks why the batter advanced beyond the hit');
  ok(sb.needsAdvanceReason({who:'R',from:2,defaultTo:2,to:3,out:null,adv:null,err:null}),
    'PATH1: existing runner moved beyond default placement requires an advancement reason');
  ok(!sb.needsAdvanceReason({who:'R',from:2,defaultTo:3,to:3,out:null,adv:null,err:null}),
    'PATH1: runner at the play-default destination does not get an unnecessary reason prompt');
  ok(!sb.needsAdvanceReason({who:'R',from:1,defaultTo:2,to:3,out:null,adv:null,err:null},'1B'),
    'PATH1: runner going first-to-third on a single does not need an advancement reason');
  ok(!sb.needsAdvanceReason({who:'R',from:2,defaultTo:3,to:4,out:null,adv:null,err:null},'1B'),
    'PATH1: runner going second-to-home on a single does not need an advancement reason');
  ok(!sb.needsAdvanceReason({who:'R',from:1,defaultTo:3,to:4,out:null,adv:null,err:null},'2B'),
    'PATH1: runner going first-to-home on a double does not need an advancement reason');
  ok(sb.needsAdvanceReason({who:'BR',from:0,award:1,defaultTo:1,to:2,out:null,adv:null,err:null},'1B'),
    'PATH1: batter taking second after a single still needs an advancement reason');
  ok(!sb.needsAdvanceReason({who:'R',from:1,defaultTo:1,to:2,out:null,adv:null,err:null},'FC'),
    'PATH1: surviving runner advancing on a fielder\'s choice does not need an advancement reason');

  /* ===== fielder's choice with no out ===== */
  newGame();
  sb.outcomeModal();
  ok(el('#sheet').innerHTML.indexOf('data-o="FC"')<0,
    'FCNO1: fielder\'s choice is hidden with no runners aboard');

  newGame();
  sb.S.bases[0]={t:'away',i:1};
  sb.outcomeModal();
  ok(el('#sheet').innerHTML.indexOf('data-o="FC"')>=0,
    'FCNO1: fielder\'s choice appears when a preceding runner exists');

  let fcm=sb.fielderChoiceMovers(null,'6-4');
  const fcBr=fcm.find(m=>m.who==='BR');
  const fcR1=fcm.find(m=>m.who==='R'&&m.from===1);
  eq(fcBr.to,1,'FCNO1: no-out FC awards batter first base');
  eq(fcR1.to,2,'FCNO1: runner on first is forced to second');
  ok(!fcm.some(m=>m.out),'FCNO1: no-out FC mover set records no outs');

  newGame();
  sb.S.bases[0]={t:'away',i:1};
  sb.S.bases[1]={t:'away',i:2};
  fcm=sb.fielderChoiceMovers(null,'6-4');
  eq(fcm.find(m=>m.who==='R'&&m.from===1).to,2,
    'FCNO1: runner from first advances one forced base');
  eq(fcm.find(m=>m.who==='R'&&m.from===2).to,3,
    'FCNO1: force chain advances runner from second to third');

  newGame();
  sb.S.bases[0]={t:'away',i:1};
  const fcout=sb.fielderChoiceMovers(0,'6-4');
  ok(fcout.some(m=>m.who==='R'&&m.from===1&&m.out&&m.out.f==='6-4'),
    'FCNO1: existing FC-with-out path still marks selected runner out');

  /* ===== FC contact + fielding sequence: ground bunt force-out ===== */
  newGame();
  sb.S.bases[0]={t:'away',i:1};
  sb.fielderChoicePicker(()=>{});
  const fcSheet=el('#sheet').innerHTML;
  const fcTypes=[
    'data-fcht="ground ball"','data-fcht="line drive"','data-fcht="fly ball"',
    'data-fcht="pop up"','data-fcht="ground bunt"'
  ];
  const fcTypeOrder=fcTypes.map(x=>fcSheet.indexOf(x));
  ok(fcTypeOrder.every(x=>x>=0) && fcTypeOrder.every((x,i)=>i===0||x>fcTypeOrder[i-1]),
    'FC2: fielder choice picker has Ground / Line / Fly / Pop Up / Bunt in order');
  ok(fcSheet.includes('Fielders — tap in order') && fcSheet.includes('id="fcDone" disabled')
    && fcSheet.includes('id="fcCancel"') && fcSheet.includes('id="fcBack"'),
    'FC2: contact and fielding sequence share a screen with gated Done/Back/Cancel');
  eq(sb.fcPlayText('ground bunt','1-6',false),"Fielder's choice on a ground bunt 1-6",
    'FC2: ground bunt force-out stores contact and 1-6 fielders');
  eq(sb.fcPlayText('ground bunt','1-6',true),"Fielder's choice on a ground bunt 1-6 — no out",
    'FC2: no-out FC retains contact type and fielders');
  const fcFixed=sb.applyNotationFix('FC','ground bunt','1-6');
  eq(fcFixed.result,'FC','FC2: correcting FC notation keeps FC score code');
  eq(fcFixed.text,"Fielder's choice on a ground bunt 1-6",
    'FC2: past FC notation edits preserve ground bunt and 1-6');

  ok(!sb.needsAdvanceReason({who:'R',from:1,defaultTo:1,to:2,out:null,adv:null,err:null},'SAC'),
    'PATH1: runner advancing on a sacrifice bunt does not need an advancement reason');
  ok(!sb.needsAdvanceReason({who:'R',from:3,defaultTo:3,to:4,out:null,adv:null,err:null},'SF'),
    'PATH1: runner advancing on a sacrifice fly does not need an advancement reason');
  ok(!sb.needsAdvanceReason({who:'R',from:1,defaultTo:1,to:2,out:null,adv:null,err:null},'6-3'),
    'PATH1: runner advancing on an ordinary groundout does not need an advancement reason');
  ok(!sb.needsAdvanceReason({who:'R',from:2,defaultTo:2,to:3,out:null,adv:null,err:null},'BGO5-3'),
    'PATH1: runner advancing on a bunt groundout does not need an advancement reason');
  ok(sb.needsAdvanceReason({who:'BR',from:0,award:1,defaultTo:1,to:2,out:null,adv:null,err:null},'FC'),
    'PATH1: batter taking second after a fielder\'s choice still needs an advancement reason');
  const fcRunnerMove={who:'R',label:'Runner',from:1,defaultTo:1,to:2,out:null,adv:null,err:null,r:{t:'away',i:0,rid:'r-fc-extra'}};
  const fcRunnerEvt=sb.moveRunnerEvents(fcRunnerMove,'FC')[0][1];
  eq(fcRunnerEvt.advance.reason,'FC',
    'PATH1: ordinary surviving-runner advancement on a fielder\'s choice is stored as caused by the FC');
  ok(sb.advanceReasonChoices('SF').tag && !sb.advanceReasonChoices('SF').sb,
    'PATH1: sacrifice fly offers tagged up but not stolen base');
  const autoSfMove={who:'R',label:'Runner',from:3,defaultTo:3,to:4,out:null,adv:'tag',err:null,r:{t:'away',i:0,rid:'r-sf-auto'}};
  const autoSfEvt=sb.moveRunnerEvents(autoSfMove,'SF')[0][1];
  eq(autoSfEvt.advance.reason,'tag',
    'PATH1: sacrifice-fly advancement can be stored automatically as tagged up');
  ok(sb.advanceReasonChoices('F8').tag && !sb.advanceReasonChoices('F8').sb,
    'PATH1: ordinary flyout offers tagged up but not stolen base');
  ok(sb.advanceReasonChoices('L6').tag && sb.advanceReasonChoices('P5').tag &&
     sb.advanceReasonChoices('f9').tag && sb.advanceReasonChoices('fP5').tag,
    'PATH1: caught line, pop, and foul outs support tagged-up advancement');
  ok(!sb.advanceReasonChoices('6-3').tag && !sb.advanceReasonChoices('SAC').tag,
    'PATH1: groundouts and sacrifice bunts do not offer tagged up');
  ok(sb.advanceReasonChoices('BB').sb && sb.advanceReasonChoices('IBB').sb &&
     sb.advanceReasonChoices('K-WP').sb && sb.advanceReasonChoices('ꓘ-PB').sb,
    'PATH1: stolen base is available for walk and strikeout contexts');
  ok(!sb.advanceReasonChoices('1B').sb && !sb.advanceReasonChoices('FC').sb &&
     !sb.advanceReasonChoices('SF').sb && !sb.advanceReasonChoices('HBP').sb,
    'PATH1: stolen base is hidden outside walks and strikeouts');
  const tagMove={who:'R',label:'Runner',from:3,defaultTo:3,to:4,out:null,adv:'tag',err:null,r:{t:'away',i:0,rid:'r-tag'}};
  const tagEvt=sb.moveRunnerEvents(tagMove,'SF')[0][1];
  eq(tagEvt.advance.reason,'tag','PATH1: tagged-up advancement is stored structurally');
  ok(/tags up and scores/.test(tagEvt.text),'PATH1: tagged-up score is readable in play events');
  const sacDpPa={result:'SF',events:[
    {t:'o',text:'Sac fly F8'},
    {t:'o',text:'Batter out F8'},
    {t:'r',text:'Runner tags up and scores'},
    {t:'o',text:'Runner out 8-4-3'}
  ]};
  ok(sb.isSacrificeDoublePlay(sacDpPa),
    'PATH1: sac fly with a runner out on the same play is recognized as a sacrifice double play');
  eq(sb.sacrificeDoublePlayFielding(sacDpPa).catcher,'8',
    'PATH1: sacrifice double play preserves the sacrifice catch fielder');
  eq(sb.sacrificeDoublePlayFielding(sacDpPa).runnerOut,'8-4-3',
    'PATH1: sacrifice double play preserves the separate runner-out fielding sequence');
  eq(sb.paResultDisplay(sacDpPa),'SF8-DP 8-4-3',
    'PATH1: scorebook notation shows both SF8 and 8-4-3 DP');
  eq(sb.paResultDisplay(sacDpPa,true),'Sacrifice double play · SF8 · 8-4-3 DP',
    'PATH1: long-form display shows both sacrifice and runner-out fielding');
  eq(sacDpPa.result,'SF',
    'PATH1: sacrifice double play display does not overwrite the batter\'s underlying SF result');
  const plainSf={result:'SF',events:[{t:'o',text:'Sac fly F8'},{t:'o',text:'Batter out F8'}]};
  ok(!sb.isSacrificeDoublePlay(plainSf),
    'PATH1: ordinary sacrifice fly is not mislabeled as a double play');
  eq(sb.paResultDisplay(plainSf),'SF',
    'PATH1: ordinary sacrifice fly keeps SF notation');
  const hitRunnerMove={who:'R',label:'Runner',from:1,defaultTo:2,to:3,out:null,adv:null,err:null,r:{t:'away',i:0,rid:'r-hit-extra'}};
  const hitRunnerEvt=sb.moveRunnerEvents(hitRunnerMove,'1B')[0][1];
  eq(hitRunnerEvt.advance.reason,'1B',
    'PATH1: ordinary extra baserunner advancement on a hit is stored as caused by the hit');
  const runnerMove={who:'R',label:'Walked runner',from:2,defaultTo:2,to:3,out:null,adv:null,err:null,r:{t:'away',i:0,rid:'r-placement-sb'}};
  sb.extraAdvanceReason(runnerMove,()=>{advanceRedraws++;});
  el('#advSB').onclick();
  eq(runnerMove.adv,'SB','PATH1: advancement reason picker can explicitly mark stolen base');
  const placedSteal=sb.moveRunnerEvents(runnerMove,'BB')[0][1];
  eq(placedSteal.advance.reason,'SB','PATH1: walk-placement steal is stored as SB rather than BB advancement');
  eq(placedSteal.advance.from,2,'PATH1: placement steal path starts at second');
  eq(placedSteal.advance.to,3,'PATH1: placement steal path ends at third');

  newGame();
  sb.doWalk('BB','Walk',true);
  el('#plDone').onclick();
  const walked=sb.S.bases[0];
  ok(walked&&walked.rid,'PATH2: walked batter receives stable runner identity');
  eq(sb.S.pas[0].runnerId,walked.rid,'PATH2: walk PA is linked to that runner identity');
  // Put the same runner on second to model the current-game state, then steal third.
  sb.S.bases[0]=null;sb.S.bases[1]=walked;
  const runnerBtn={dataset:{b:'1'},onclick:null},destBtn={dataset:{d:'3'},onclick:null};
  el('#sheet').querySelectorAll=sel=>sel==='[data-b]'?[runnerBtn]:sel==='[data-d]'?[destBtn]:[];
  sb.actSteal();runnerBtn.onclick();el('#stSafe').onclick();destBtn.onclick();
  ok(!sb.S.bases[1]&&sb.S.bases[2]===walked,'PATH2: runner on second steals third');
  const stealEvt=sb.S.pa.find(e=>e.advance&&e.advance.reason==='SB');
  ok(!!stealEvt,'PATH2: stolen-base movement is stored structurally');
  eq(stealEvt.advance.from,2,'PATH2: stolen-base path starts at second');
  eq(stealEvt.advance.to,3,'PATH2: stolen-base path ends at third');
  const walkedPath=sb.runnerPathById(walked.rid);
  eq(walkedPath.steps[0].reason,'BB','PATH2: path begins with the walk to first');
  ok(walkedPath.steps.some(x=>x.reason==='SB'&&x.from===2&&x.to===3),
    'PATH2: path carries the same walked runner through the steal of third');

  /* ===== Book 2.0 Phase 1: runner journey diamonds ===== */
  newGame();
  sb.placementReview(sb.hitMovers(1),'1B','Singled');
  el('#plDone').onclick();
  const phasePa=sb.S.pas[0],phaseRid=phasePa.runnerId;
  let journey=sb.paBookJourney(phasePa);
  eq(journey.status,'onbase','BOOK2-1: safe batter is shown still on base');
  eq(journey.base,1,'BOOK2-1: single journey ends at first while runner remains there');
  let dia=sb.bookDiamondHTML(phasePa);
  ok(dia.indexOf('bdRoute')>=0&&dia.indexOf('>1B<')>=0,
    'BOOK2-1: scorebook diamond draws a base path and live ending base');

  const liveRunner=sb.S.bases[0];
  sb.S.bases[0]=null;sb.S.bases[1]=liveRunner;
  sb.ev('r',sb.runnerAdvanceEvent(liveRunner,'Runner advances to Second',1,2,'play'));
  journey=sb.paBookJourney(phasePa);
  eq(journey.routeTo,2,'BOOK2-1: later runner movement extends the original PA path to second');

  sb.setRunnerEnd(liveRunner,'scored',4);
  sb.ev('r',sb.runnerAdvanceEvent(liveRunner,'Runner scores',2,4,'play'));
  sb.S.bases[1]=null;
  journey=sb.paBookJourney(phasePa);
  eq(journey.status,'scored','BOOK2-1: scored runner gets terminal run status');
  ok(sb.bookDiamondHTML(phasePa).indexOf('>R<')>=0,
    'BOOK2-1: scored journey renders an R marker');

  newGame();
  sb.placementReview(sb.hitMovers(1),'1B','Singled');
  el('#plDone').onclick();
  const outPa=sb.S.pas[0],outRunner=sb.S.bases[0];
  sb.S.bases[0]=null;
  sb.recordRunnerOut('Picked off 1-3 — '+sb.pname(outRunner),outRunner,1);
  journey=sb.paBookJourney(outPa);
  eq(journey.status,'out','BOOK2-1: later runner out is linked back to the reaching PA');
  ok(sb.bookDiamondHTML(outPa).indexOf('>OUT<')>=0,
    'BOOK2-1: runner-out journey renders OUT');

  newGame();
  sb.placementReview(sb.hitMovers(1),'1B','Singled');
  el('#plDone').onclick();
  const strandPa=sb.S.pas[0],strandRid=strandPa.runnerId;
  sb.S.outs=3;sb.endHalfCheck();
  eq(sb.runnerEndFor(strandRid).status,'stranded',
    'BOOK2-1: inning end records runners left on base');
  eq(sb.paBookJourney(strandPa).status,'stranded',
    'BOOK2-1: stranded runner is reported from stored lifecycle');
  ok(sb.bookDiamondHTML(strandPa).indexOf('>LOB<')>=0,
    'BOOK2-1: stranded journey renders LOB');

  newGame();
  const directOut={team:'away',b:0,inning:1,half:0,result:'F8',batter:'Astro1',events:[]};
  eq(sb.paBookJourney(directOut).status,'out',
    'BOOK2-1: batter outs with no runner identity still render as outs');
  ok(sb.bookDiamondHTML(directOut).indexOf('>OUT<')>=0,
    'BOOK2-1: direct batter out gets OUT marker');

  /* ===== Book 2.0 Phase 2: advancement reasons + batter slot ===== */
  newGame();
  sb.S.pas=[
    {team:'away',b:3,inning:1,half:0,result:'BB',batter:'Astro4',events:[]}
  ];
  eq(sb.bookAdvanceLabel({reason:'SB',from:1,to:2,pa:0}),'SB4',
    'BOOK2-2: stolen-base label includes the coinciding batter slot');
  eq(sb.bookAdvanceLabel({reason:'WP',from:1,to:2,pa:0}),'WP4',
    'BOOK2-2: wild-pitch label includes the coinciding batter slot');
  eq(sb.bookAdvanceLabel({reason:'tag',from:3,to:4,pa:0}),'TAG4',
    'BOOK2-2: tag-up label includes the coinciding batter slot');
  eq(sb.bookAdvanceLabel({reason:'throw',from:1,to:2,pa:0}),'TH4',
    'BOOK2-2: on-throw label includes the coinciding batter slot');
  eq(sb.bookAdvanceLabel({reason:'error',fielder:'5',from:1,to:2,pa:0}),'E5/4',
    'BOOK2-2: error label separates fielder number from coinciding batter slot');

  newGame();
  sb.placementReview(sb.hitMovers(1),'1B','Singled');
  el('#plDone').onclick();
  const phase2Pa=sb.S.pas[0],phase2Runner=sb.S.bases[0];
  sb.S.bases[0]=null;sb.S.bases[1]=phase2Runner;
  sb.ev('r',sb.runnerAdvanceEvent(phase2Runner,'Runner steals Second',1,2,'SB'));
  const phase2Dia=sb.bookDiamondHTML(phase2Pa);
  ok(phase2Dia.indexOf('class="bdReason"')>=0 && phase2Dia.indexOf('>SB2<')>=0,
    'BOOK2-2: live Book diamond renders the advance reason with the current batter slot');



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
  sb.S.chal={away:2,home:2};sb.S.bat='away';
  sb.S.pa=[{t:'p',text:'Ball'}];
  eq(sb.challengeTeamFor(sb.lastPitch()),'home','challenge UI: defense is inferred for a called ball');
  sb.challengeSheet();
  ok(el('#sheet').innerHTML.indexOf('Who challenged?')<0 &&
     el('#sheet').innerHTML.indexOf('data-ct=')<0,
    'challenge UI: challenger picker is removed');
  el('#chUp').onclick();
  eq(sb.S.chal.home,1,'challenge UI: upheld ball challenge charges the defense automatically');
  eq(sb.S.chal.away,2,'challenge UI: ball challenge does not charge the offense');

  newGame();
  sb.S.chal={away:2,home:2};sb.S.bat='away';
  sb.S.pa=[{t:'p',text:'Called strike'}];
  eq(sb.challengeTeamFor(sb.lastPitch()),'away','challenge UI: offense is inferred for a called strike');
  sb.challengeSheet();
  el('#chUp').onclick();
  eq(sb.S.chal.away,1,'challenge UI: upheld strike challenge charges the offense automatically');
  eq(sb.S.chal.home,2,'challenge UI: strike challenge does not charge the defense');
  newGame();
  sb.S.chal = { away: 0, home: 0 }; sb.S.bat = 'home'; sb.S.half = 1; sb.S.inning = 9; sb.S.outs = 3;
  sb.endHalfCheck();
  eq(sb.S.inning, 10, 'half-inning rolls to the 10th');
  eq(sb.S.chal.away, 1, 'extras grant 0->1 at the 10th');
  eq(sb.S.chal.home, 1, 'extras grant 0->1 for both teams');

  newGame();
  sb.S.inning=5;sb.S.half=0;sb.S.bat='away';sb.S.outs=2;
  sb.S.order.away=3;sb.S.balls=2;sb.S.strikes=1;
  sb.S.pa=[{t:'p',text:'Ball'},{t:'p',text:'Called strike'}];
  sb.S.bases[0]={t:'away',i:1};
  sb.S.bases[0]=null;
  sb.recordRunnerOut('Picked off 1-3 — #11 Astro2');
  eq(sb.S.half,1,'runner-out third out advances top half to bottom half');
  eq(sb.S.inning,5,'runner-out third out stays in same inning after top half');
  eq(sb.S.bat,'home','runner-out third out switches batting team');
  eq(sb.S.outs,0,'runner-out third out resets outs');
  eq(sb.S.balls,0,'runner-out third out resets balls');
  eq(sb.S.strikes,0,'runner-out third out resets strikes');
  eq(sb.S.order.away,3,'runner-out third out does not advance unfinished batter');
  eq(sb.S.pa.length,0,'runner-out third out clears live PA from next half');
  eq(sb.S.interruptedPAs.length,1,'runner-out third out preserves interrupted PA');
  eq(sb.S.interruptedPAs[0].events.filter(e=>e.t==='p').length,2,
    'runner-out third out preserves real pitches for future totals');
  ok(sb.S.interruptedPAs[0].events.some(e=>/Picked off/.test(e.text)),
    'runner-out third out preserves pickoff event');

  newGame();
  sb.S.inning=5;sb.S.half=1;sb.S.bat='home';sb.S.outs=2;
  sb.S.order.home=6;sb.S.pa=[{t:'p',text:'Swinging strike'}];
  sb.recordRunnerOut('Caught stealing 2-6 — #12 Rival3');
  eq(sb.S.inning,6,'caught-stealing third out advances to next inning');
  eq(sb.S.half,0,'caught-stealing third out advances bottom half to next top');
  eq(sb.S.bat,'away','caught-stealing third out switches batting team');
  eq(sb.S.order.home,6,'caught-stealing third out leaves unfinished batter due next time');
  eq(sb.S.interruptedPAs.length,1,'caught-stealing third out preserves interrupted PA');
  ok(sb.S.interruptedPAs[0].events.some(e=>/Caught stealing/.test(e.text)),
    'caught-stealing third out preserves runner-out event');

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

  const compoundRoster = sb.rosterToPool([
    { person:{fullName:'Tommy La Stella'}, jerseyNumber:'2', position:{abbreviation:'2B'} },
    { person:{fullName:'Adam Lind'}, jerseyNumber:'26', position:{abbreviation:'1B'} },
    { person:{fullName:'Elly De La Cruz'}, jerseyNumber:'44', position:{abbreviation:'SS'} },
    { person:{fullName:'Sam Dyson'}, jerseyNumber:'49', position:{abbreviation:'P'} },
  ]);
  eq(compoundRoster.map(p=>p.name).join('|'),
    'Elly De La Cruz|Sam Dyson|Tommy La Stella|Adam Lind',
    'roster: compound surnames sort under the leading surname particle');

  /* ===== MLB broadcast abbreviations in scoring header ===== */
  newGame();
  sb.S.away.name='Red Sox';sb.S.away.poolMeta={mlbId:111};
  sb.S.home.name='Blue Jays';sb.S.home.poolMeta={mlbId:141};
  sb.renderScore();
  eq(el('#hAway').textContent,'BOS','ABBR1: Red Sox use BOS broadcast abbreviation');
  eq(el('#hHome').textContent,'TOR','ABBR1: Blue Jays use TOR broadcast abbreviation');
  eq(sb.scoreTeamAbbr({name:'Astros',poolMeta:{mlbId:117}},'AWY'),'HOU','ABBR1: Astros use HOU');
  eq(sb.scoreTeamAbbr({name:'Cubs'},'AWY'),'CHC','ABBR1: manual Cubs name falls back to CHC');
  eq(sb.scoreTeamAbbr({name:'Queens'},'AWY'),'QUEE','ABBR1: non-MLB team keeps existing short-name fallback');

  /* ===== shared game date / historical roster date ===== */
  newGame();
  ok(/^\d{4}-\d{2}-\d{2}$/.test(sb.S.gameDate),
    'DATE1: a new game starts with one shared Game date');
  sb.S.gameDate='2018-04-19';
  el('#awayMLB').value='117';
  el('#homeMLB').value='136';
  const awayRQ=sb.rosterQuery('away'),homeRQ=sb.rosterQuery('home');
  eq(awayRQ.date,'2018-04-19','DATE1: away roster query uses the Game date');
  eq(homeRQ.date,'2018-04-19','DATE1: home roster query uses the same Game date');
  eq(awayRQ.season,2018,'DATE1: historical Game date supplies the roster season');
  ok(awayRQ.url.indexOf('date=2018-04-19')>=0 && homeRQ.url.indexOf('date=2018-04-19')>=0,
    'DATE1: both MLB roster URLs are date-scoped to the game');
  sb.renderSetup();
  eq(el('#gameDate').value,'2018-04-19','DATE1: setup displays the saved Game date');
  ok(html.indexOf('id="gameDate"')>=0 &&
     html.indexOf('id="awayDate"')<0 &&
     html.indexOf('id="homeDate"')<0,
    'DATE1: separate team roster-date fields are replaced by one Game date');

  const txURL=sb.transactionQuery('away');
  ok(txURL.indexOf('teamId=117')>=0 && txURL.indexOf('date=2018-04-19')>=0,
    'DATE2: same-day transaction query is scoped to selected team + Game date');
  const txPool=sb.transactionPlayersToPool([
    {person:{id:1001,fullName:'Outgoing Player'},fromTeam:{id:117},toTeam:{id:999}},
    {person:{id:1002,fullName:'Incoming Player'},fromTeam:{id:999},toTeam:{id:117}},
    {person:{id:1003,fullName:'Other Team Player'},fromTeam:{id:136},toTeam:{id:999}}
  ],117);
  eq(txPool.map(p=>p.name).sort().join('|'),'Incoming Player|Outgoing Player',
    'DATE2: both outgoing and incoming same-day transaction players are collected');
  const mergedDay=sb.mergeRosterPool(
    [{mlbId:2000,name:'Snapshot Player',num:'10',pos:'6'}],
    txPool
  );
  ok(mergedDay.some(p=>p.name==='Snapshot Player') &&
     mergedDay.some(p=>p.name==='Outgoing Player') &&
     mergedDay.some(p=>p.name==='Incoming Player'),
    'DATE2: roster snapshot is unioned with both sides of same-day roster moves');
  const dedupeDay=sb.mergeRosterPool(
    [{mlbId:1002,name:'Incoming Player',num:'22',pos:'8'}],
    [{mlbId:1002,name:'Incoming Player',num:'',pos:'',transactionDay:true}]
  );
  eq(dedupeDay.length,1,'DATE2: player already present in snapshot is not duplicated');
  eq(dedupeDay[0].num,'22','DATE2: roster snapshot metadata wins when transaction copy is sparse');
  ok(dedupeDay[0].transactionDay===true,
    'DATE2: snapshot player is still marked as involved in a same-day transaction');

  /* ===== quick return-to-roster lineup correction ===== */
  newGame();
  sb.S.started=false;
  sb.S.away.pool=[{name:'Bench Guy',num:'90',pos:'8'}];
  sb.S.away.lineup[2]={name:'Wrong Guy',num:'33',pos:'3'};
  sb.renderSetup();
  ok(el('#awayLU').innerHTML.indexOf('data-return-pool="away"')>=0 &&
     el('#awayLU').innerHTML.indexOf('aria-label="Return Wrong Guy to roster"')>=0,
    'LU1: occupied pregame lineup row shows tiny return-to-roster control');
  sb.clearSlot('away',2);
  eq(sb.S.away.lineup[2].name,'','LU1: return control clears only that lineup slot');
  ok(sb.S.away.pool.some(p=>p.name==='Wrong Guy'),
    'LU1: returned player goes back into the roster pool');

  newGame();
  sb.S.started=true;
  sb.S.away.lineup[2]={name:'Live Guy',num:'44',pos:'3'};
  sb.renderSetup();
  ok(el('#awayLU').innerHTML.indexOf('data-return-pool=')<0,
    'LU1: quick return control disappears once scoring has started');

  newGame();
  sb.S.started=false;sb.S.away.dh=true;sb.ensureShape();
  sb.S.away.lineup[8].pos='9'; // test DH lineup without a second pitcher in the batting order
  sb.S.away.lineup[9]={name:'Wrong Pitcher',num:'55',pos:'1',nb:true};
  sb.syncPitcherFromLineup('away');
  ok(sb.S.away.pitcher.indexOf('Wrong Pitcher')>=0,'LU1: pitcher test starts with active pitcher');
  sb.clearSlot('away',9);
  eq(sb.S.away.pitcher,'','LU1: returning pitcher also clears active pitcher reference');


  /* ===== 2026-10-05 scoring usability batch ===== */
  newGame();
  sb.S.away.lineup[0] = { name:'A', num:'1', pos:'6' };
  sb.S.away.lineup[1] = { name:'B', num:'2', pos:'6' };
  sb.S.away.lineup[2] = { name:'C', num:'3', pos:'4' };
  const dups = sb.duplicatePositions(sb.S.away);
  ok(dups.length===1 && dups[0].pos==='6' && dups[0].idxs.length===2,
    'U1: duplicate defensive positions detected without blocking lineup');
  sb.renderSetup();
  ok(el('#awayPosWarn').hidden===false && el('#awayPosWarn').textContent.indexOf('SS ×2')>=0,
    'U1: duplicate-position warning is shown on lineup');

  newGame();
  sb.S.bases[0]={t:'away',i:0};
  sb.actWPPB();
  el('#wpB').onclick();
  el('#wpDone').onclick();
  ok(sb.S.pa.some(e=>e.t==='r'&&e.text==='Wild pitch'),
    'U2: wild pitch is stored as a runner/game event, not a pitch');

  newGame();
  sb.S.pa=[
    {t:'p',text:'Ball'},
    {t:'r',text:'Wild pitch'},
    {t:'r',text:'Runner advances to 2nd'},
    {t:'p',text:'Called strike'}
  ];
  sb.renderScore();
  const liveEvents=el('#hEvents').innerHTML;
  ok(liveEvents.indexOf('class="pn">1</span><span>Ball</span>')>=0 &&
     liveEvents.indexOf('class="eventnote">WP</span>')>=0 &&
     liveEvents.indexOf('class="pn">2</span><span>Called</span>')>=0,
    'U2: pitch chips number only pitches while WP remains a compact note');

  eq(sb.APP_VERSION,'2026.10.08.2','U3: discreet build version is explicit');
  ok(typeof sb.initPullToRefresh==='function' &&
     html.indexOf("touchstart")>=0 && html.indexOf("location.reload()")>=0,
    'U4: pull-to-refresh gesture is wired to reload the saved app');
  ok(html.indexOf('-webkit-user-select:none')>=0 &&
     html.indexOf('-webkit-touch-callout:none')>=0 &&
     html.indexOf('#pitchHoldMenu span')>=0 &&
     html.indexOf('#buntHoldMenu span')>=0 &&
     html.indexOf('#foulOutHoldMenu span')>=0 &&
     html.indexOf('#doubleHoldMenu span')>=0,
    'U5: slide-over gesture controls suppress iOS text selection and touch callouts');

  /* ===== per-PA pitch audit ===== */
  newGame();
  const auditPa={team:'away',b:0,inning:1,half:0,result:'1B',batter:'Astro1',pitcher:'Rival9 #9',events:[
    {t:'p',text:'Ball',pitcher:'Rival9 #9'},
    {t:'p',text:'Called strike',pitcher:'Rival9 #9'},
    {t:'p',text:'Foul ball',pitcher:'Rival9 #9'},
    {t:'p',text:'Automatic ball — pitch timer violation',pitcher:'Rival9 #9'},
    {t:'o',text:'Singled on a line drive to CF'}
  ]};
  const paAudit=sb.paPitchAudit(auditPa);
  eq(paAudit.stored,4,'AUD1: audit reports stored pitch-event count');
  eq(paAudit.credited,4,'AUD1: three thrown stored pitches plus terminal in-play pitch are credited');
  eq(paAudit.rows.length,5,'AUD1: audit includes automatic call plus terminal pitch from PA result');
  eq(paAudit.rows[0].count,'1-0','AUD1: audit reconstructs count after ball');
  eq(paAudit.rows[1].count,'1-1','AUD1: audit reconstructs count after called strike');
  eq(paAudit.rows[2].count,'1-2','AUD1: audit reconstructs count after foul');
  eq(paAudit.rows[3].count,'2-2','AUD1: automatic ball changes count');
  ok(paAudit.rows[3].physical===false,'AUD1: automatic ball is explicitly marked no pitch thrown');
  ok(paAudit.rows[4].inferred===true&&paAudit.rows[4].text==='Ball put in play',
    'AUD1: terminal in-play pitch is included in the audit');
  eq(sb.contactPitchBonus('DP'),1,'AUD1: in-play double play now credits its terminal pitch');
  eq(sb.contactPitchBonus('TP'),1,'AUD1: in-play triple play credits its terminal pitch');
  eq(sb.contactPitchBonus('GRD'),1,'AUD1: ground-rule double credits its terminal pitch');
  let c=sb.countAfterPitch('Foul bunt',1,2);
  eq(c.s,3,'AUD1: two-strike foul bunt reconstructs strike three');
  c=sb.countAfterPitch('Missed bunt',0,1);
  eq(c.s,2,'AUD1: missed bunt reconstructs as a strike');

  sb.S.pas=[auditPa];
  sb.renderPbp();
  ok(el('#pbp').innerHTML.indexOf('data-audit="0"')>=0 &&
     el('#pbp').innerHTML.indexOf('4 pitches')>=0,
    'AUD1: Book play-by-play exposes pitch audit for every PA');
  sb.pitchAuditModal(0);
  ok(el('#sheet').innerHTML.indexOf('Pitch audit')>=0 &&
     el('#sheet').innerHTML.indexOf('automatic call / no pitch thrown')>=0 &&
     el('#sheet').innerHTML.indexOf('from PA result')>=0 &&
     el('#sheet').innerHTML.indexOf('inferred')<0,
    'AUD1: pitch audit explains stored/no-pitch/result-derived pitches without showing inferred jargon');
  ok(el('#sheet').innerHTML.indexOf('data-audit-delete="0"')>=0 &&
     el('#sheet').innerHTML.indexOf('id="auditEdit"')>=0,
    'AUD1: audit exposes Delete on stored pitches plus Edit PA');
  const auditBeforeDelete=sb.S.pas[0].events.filter(e=>e.t==='p').length;
  ok(sb.deleteStoredPitch(0,0),'AUD1: stored pitch can be deleted directly');
  eq(sb.S.pas[0].events.filter(e=>e.t==='p').length,auditBeforeDelete-1,
    'AUD1: deleting extra pitch removes exactly one stored pitch event');
  sb.pitchAuditModal(0);
  ok(el('#sheet').innerHTML.indexOf('3 stored pitch events')>=0,
    'AUD1: audit redraw reflects deleted pitch count');
  sb.editPA(0);
  ok(el('#sheet').innerHTML.indexOf('Delete extra pitch')>=0,
    'AUD1: Edit PA also exposes Delete extra pitch');

  /* ===== pitcher strip + pitch count + score scale ===== */
  newGame();
  sb.syncPitcherFromLineup('home');
  ok(/Rival9/.test(sb.activePitcherLabel('home')),'PC1: active pitcher comes from the fielding lineup');
  sb.doPitch('ball');sb.doPitch('cstr');sb.doPitch('foul');
  eq(sb.pitcherPitchCount('home'),3,'PC1: thrown pitches accumulate for the active pitcher');
  sb.doPitch('autoball');
  eq(sb.pitcherPitchCount('home'),3,'PC1: automatic ball does not increment physical pitch count');
  sb.renderScore();
  ok(el('#hPitcher').textContent.indexOf('Rival9')>=0 && el('#hPitcher').textContent.indexOf('3 pitches')>=0,
    'PC1: scoring matchup strip shows pitcher and running pitch count as N pitches');
  sb.applySub('home','P',null,null,{name:'Reliever',num:'55'});
  sb.doPitch('ball');
  eq(sb.pitcherPitchCount('home'),1,'PC1: pitching change starts the new pitcher at his own pitch count');
  ok(sb.S.pa.some(e=>e.t==='p'&&e.pitcher&&/Reliever/.test(e.pitcher)),
    'PC1: new pitcher identity is attached to subsequent pitch events');
  eq(sb.contactPitchBonus('1B'),1,'PC1: ball put in play contributes its terminal thrown pitch');
  eq(sb.contactPitchBonus('HBP'),1,'PC1: HBP contributes a thrown pitch');
  eq(sb.contactPitchBonus('IBB'),0,'PC1: intentional walk contributes no pitch');
  ok(html.indexOf('id="scoreScaleStage"')>=0 && html.indexOf('id="scoreScaleCanvas"')>=0 &&
     html.indexOf('score-proportional')>=0 && typeof sb.applyScoreProportionalScale==='function',
    'SCALE1: score view has proportional scale stage with responsive fallback');

  /* ===== score card pitcher / bases / batter reflow ===== */
  const scoreMarkupStart=html.indexOf('<div id="v-score"');
  const scoreMarkupEnd=html.indexOf('<div id="v-book"',scoreMarkupStart);
  const scoreMarkup=html.slice(scoreMarkupStart,scoreMarkupEnd);
  const pitcherPos=scoreMarkup.indexOf('id="hPitcher"');
  const baseRowPos=scoreMarkup.indexOf('class="basebatterrow"');
  const batterPos=scoreMarkup.indexOf('id="hBatter"');
  ok(pitcherPos>=0&&baseRowPos>pitcherPos&&batterPos>baseRowPos,
    'LAY1: pitcher sits below count and above the bases/batter row');
  ok(scoreMarkup.indexOf('class="baseswrap"',baseRowPos)>=0&&
     scoreMarkup.indexOf('id="hBatter"',baseRowPos)>=0,
    'LAY1: bases and batter share the same side-by-side row');
  ok(html.indexOf('.pitcherline{font-size:14px')>=0 &&
     html.indexOf('text-align:right')>=0 &&
     html.indexOf('white-space:nowrap')>=0,
    'LAY1: pitcher and pitch count stay on one right-aligned line under Undo');
  ok(html.indexOf('.basebatterrow{display:grid;grid-template-columns:150px minmax(0,1fr)')>=0,
    'LAY1: score card reserves a compact left column for the bases');

  /* ===== 2026-10-05 compact scoring visual + HR location batch ===== */
  newGame();
  sb.S.pa=[{t:'p',text:'Called strike'}];
  sb.renderScore();
  ok(el('#hEvents').innerHTML.indexOf('id="eventChallenge"')>=0,
    'V1: live challenge action is attached to the challengeable pitch row');
  ok(html.indexOf('id="chalBtn"')<0,
    'V1: challenge control is no longer in the count row');
  ok(el('#hEvents').innerHTML.indexOf('class="pitchrail"')>=0 &&
     el('#hEvents').innerHTML.indexOf('class="pitchchip challengeable"')>=0,
    'V1: live PA renders as a compact horizontal pitch-chip rail');
  newGame();
  sb.renderScore();
  ok(el('#hEvents').innerHTML.indexOf('class="pitchrail"')>=0 &&
     el('#hEvents').innerHTML.indexOf('No pitches yet this PA')>=0,
    'V1: empty PA keeps the same pitch-rail footprint before pitch one');
  ok(html.indexOf('id="hPrevChallenge"')<0 &&
     html.indexOf('Challenge previous call')<0,
    'V1: previous-call challenge control is removed now that terminal calls pause for review');
  ok(html.indexOf('.eventnotes{display:flex;flex-wrap:wrap')>=0,
    'V1: non-pitch PA events use a separate compact notes row');

  sb.outcomeModal();
  const outcomeHTML=el('#sheet').innerHTML;
  ok(outcomeHTML.indexOf('outcomeHead">On base')>=0 &&
     outcomeHTML.indexOf('outcomeHead">Out')>=0 &&
     outcomeHTML.indexOf('data-o="SAC"')>=0,
    'V2: In Play is grouped into On base / Out with Sacrifice separate');
  const outOrder=[
    'data-o="GO">Groundout</button>',
    'data-o="LO">Lineout</button>',
    'data-o="FO">Fly out</button>',
    'data-o="POP">Pop fly</button>',
    'id="buntOutBtn" type="button">Bunt</button>',
    'id="foulOutBtn" type="button">Foul out</button>',
    'data-o="DP">Double Play</button>'
  ].map(x=>outcomeHTML.indexOf(x));
  ok(outOrder.every(x=>x>=0) && outOrder.every((x,i)=>i===0||x>outOrder[i-1]),
    'V2: In Play Out menu orders Groundout / Lineout / Fly out / Pop fly / Bunt / Foul out / Double Play');

  /* ===== generic triple play ===== */
  newGame();
  sb.outcomeModal();
  ok(el('#sheet').innerHTML.indexOf('data-o="TP"')<0,
    'TP1: Triple Play is hidden when there are not enough runners');

  newGame();
  sb.S.bases[0]={t:'away',i:1};
  sb.S.bases[1]={t:'away',i:2};
  sb.S.outs=1;
  sb.outcomeModal();
  ok(!sb.triplePlayEligible() && el('#sheet').innerHTML.indexOf('data-o="TP"')<0,
    'TP1: Triple Play is hidden with one out even when two runners are aboard');

  newGame();
  sb.S.bases[0]={t:'away',i:1};
  sb.S.bases[1]={t:'away',i:2};
  sb.outcomeModal();
  ok(sb.triplePlayEligible() && el('#sheet').innerHTML.indexOf('data-o="TP"')>=0,
    'TP1: 0 outs with two runners shows and enables Triple Play');
  const tpCand=sb.triplePlayCandidates();
  eq(tpCand.length,3,'TP1: two-runner situation offers batter plus both runners');
  const tpOuts=[
    {...tpCand.find(x=>x.key==='R1'),fielders:'5'},
    {...tpCand.find(x=>x.key==='R0'),fielders:'5-4'},
    {...tpCand.find(x=>x.key==='BR'),fielders:'4-3'}
  ];
  ok(sb.commitTriplePlay(tpOuts),'TP1: generic three-out sequence commits');
  const tpPa=sb.S.pas[sb.S.pas.length-1];
  eq(tpPa.result,'TP','TP1: triple play stores TP result');
  eq(tpPa.tpOuts.length,3,'TP1: all three outs are retained structurally');
  eq(tpPa.tpOuts[0].fielders,'5','TP1: first out fielding sequence is preserved');
  eq(tpPa.tpOuts[1].fielders,'5-4','TP1: second out fielding sequence is preserved');
  eq(tpPa.tpOuts[2].fielders,'4-3','TP1: third out fielding sequence is preserved');
  ok(tpPa.tpBatterOut===true,'TP1: standard TP records batter as one of the outs');
  eq(sb.paResultDisplay(tpPa),'TP','TP1: compact scorebook notation is TP');
  eq(sb.paResultDisplay(tpPa,true),'Triple play · 5 / 5-4 / 4-3',
    'TP1: long-form TP display preserves each out sequence');
  eq(sb.S.half,1,'TP1: triple play immediately ends the top half');
  eq(sb.S.outs,0,'TP1: outs reset after triple play ends the half');
  eq(sb.S.order.away,1,'TP1: batter order advances exactly once');

  newGame();
  sb.S.bases[0]={t:'away',i:1};
  sb.S.bases[1]={t:'away',i:2};
  sb.S.bases[2]={t:'away',i:3};
  const tpLoaded=sb.triplePlayCandidates();
  const runnerOnly=tpLoaded.filter(x=>x.who==='R').map((x,i)=>({...x,fielders:['5','5-4','4-3'][i]}));
  ok(sb.commitTriplePlay(runnerOnly),'TP2: bases-loaded triple play may retire three runners and not batter');
  const tpSafe=sb.S.pas[sb.S.pas.length-1];
  ok(tpSafe.tpBatterOut===false&&!!tpSafe.runnerId,
    'TP2: batter-safe triple play records a continuing batter-runner identity');
  eq(sb.paBatterIsOut(tpSafe),false,'TP2: Book does not falsely mark safe batter out');
  const tpJourney=sb.paBookJourney(tpSafe);
  eq(tpJourney.status,'stranded','TP2: safe batter is ended as stranded when third out finishes inning');
  eq(tpJourney.routeTo,1,'TP2: safe batter path reaches first before inning ends');


  /* ===== ground-rule double slide action ===== */
  newGame();
  sb.outcomeModal();
  const grdOutcome=el('#sheet').innerHTML;
  ok(grdOutcome.indexOf('id="doubleBtn"')>=0 &&
     html.indexOf('id="doubleHoldMenu"')>=0 &&
     html.indexOf('↓ Ground-rule Double')>=0,
    'GRD1: Double has a hold-slide-down Ground-rule Double action');
  eq(sb.resultAwardBase('GRD'),2,'GRD1: ground-rule double awards batter two bases');
  eq(sb.clsOf('GRD'),'hit','GRD1: ground-rule double classifies as a hit');
  eq(sb.paKind('GRD'),'GRD','GRD1: edit flow preserves ground-rule-double identity');
  eq(sb.contactPitchBonus('GRD'),1,'GRD1: ground-rule double credits the terminal pitch');
  eq(sb.paResultDisplay({result:'GRD'}),'GRD','GRD1: compact Book notation stays GRD');
  eq(sb.paResultDisplay({result:'GRD'},true),'Ground-rule double',
    'GRD1: long-form display names the ground-rule double');
  const grdMv=sb.hitMovers(2);
  eq(grdMv[0].award,2,'GRD1: batter receives the normal two-base award');
  sb.S.bases[0]={t:'away',i:1};
  sb.S.bases[1]={t:'away',i:2};
  const grdWithRunners=sb.hitMovers(2).filter(m=>m.who==='R');
  ok(grdWithRunners.some(m=>m.from===1&&m.to===3) &&
     grdWithRunners.some(m=>m.from===2&&m.to===4),
    'GRD1: existing runners receive two bases on a ground-rule double');
  sb.S.pas=[{team:'away',result:'GRD'}];
  eq(sb.teamHits('away'),1,'GRD1: ground-rule double counts in team hits');

  eq(sb.homeRunText('LF'),'Home run to left field','V3: HR LF location text');
  eq(sb.homeRunText('LCF'),'Home run to left-center field','V3: HR LCF location text');
  eq(sb.homeRunText('CF'),'Home run to center field','V3: HR CF location text');
  eq(sb.homeRunText('RCF'),'Home run to right-center field','V3: HR RCF location text');
  eq(sb.homeRunText('RF'),'Home run to right field','V3: HR RF location text');

  ok(html.indexOf('.pitchstack{')>=0 &&
     html.indexOf('"inplay inplay inplay inplay inplay inplay"')>=0 &&
     html.indexOf('"called called swing swing foultip foultip"')>=0 &&
     html.indexOf('"ball ball ball foul foul foul"')>=0 &&
     html.indexOf('"ibb ibb ibb hbp hbp hbp"')>=0,
    'V4: pitch controls follow In Play / strike+foul-tip / ball+foul / IBB-HBP rows');
  ok(html.indexOf('.count{font-size:30px; font-weight:800; letter-spacing:2px; flex:0 0 auto; white-space:nowrap;}')>=0,
    'V4: count is protected from squeezing');

  ok(html.indexOf('data-p="cstr" data-hold-wppb="1" aria-label="Called strike"')>=0 &&
     html.indexOf('data-p="sstr" data-hold-wppb="1" data-hold-down="missbunt"')>=0 &&
     html.indexOf('>Called</button>')>=0 && html.indexOf('>Swinging</button>')>=0,
    'V4: compact strike row uses Called and Swinging labels, with Swinging retaining hold support');
  ok(html.indexOf('data-p="hbp">Hit Batter</button>')<0 &&
     html.indexOf('Hit by Pitch</button>')>=0,
    'V4: HBP button uses Hit by Pitch label');
  ok(html.indexOf('#v-score .pitchstack .ps-inplay{font-size:21px;}')>=0,
    'V4: In Play uses the previous large strike-button text size');
  ok(html.indexOf('#v-score .pitchstack .ps-called,')>=0 &&
     html.indexOf('#v-score .pitchstack .ps-foul{font-size:16px;}')>=0,
    'V4: second and third pitch rows share a consistent text size');
  ok(html.indexOf('#v-score .pitchstack .ps-hbp{font-size:14px;}')>=0,
    'V4: fourth pitch row is slightly smaller');

  /* ===== bunt out slide selector ===== */
  newGame();
  sb.outcomeModal();
  const buntOutcomeHTML=el('#sheet').innerHTML;
  ok(buntOutcomeHTML.indexOf('id="buntOutBtn"')>=0 &&
     buntOutcomeHTML.indexOf('>Bunt</button>')>=0,
    'V4b: In Play Out column includes a Bunt slide control');
  ok(html.indexOf('id="buntHoldMenu"')>=0 &&
     html.indexOf('← Ground Out')>=0 &&
     html.indexOf('Pop Out →')>=0,
    'V4b: Bunt slide overlay offers Ground Out and Pop Out');

  const bgo=sb.buntOutNotation('BGO','1-3');
  eq(bgo.code,'BGO1-3','V4b: bunt ground out keeps distinct result code');
  eq(bgo.text,'Bunt ground out 1-3','V4b: bunt ground out keeps distinct play text');
  const bpo=sb.buntOutNotation('BPOP','2');
  eq(bpo.code,'BPO2','V4b: bunt pop out keeps distinct result code');
  eq(bpo.text,'Bunt pop out P2','V4b: bunt pop out keeps distinct play text');
  eq(sb.clsOf('BGO1-3'),'out','V4b: bunt ground out classifies as an out');
  eq(sb.clsOf('BPO2'),'out','V4b: bunt pop out classifies as an out');
  eq(sb.paKind('BGO1-3'),'BGO','V4b: edit flow recognizes bunt ground out');
  eq(sb.paKind('BPO2'),'BPOP','V4b: edit flow recognizes bunt pop out');
  eq(sb.applyNotationFix('BGO',null,'5-3').result,'BGO5-3',
    'V4b: bunt ground-out notation can be repaired later');
  eq(sb.applyNotationFix('BPOP',null,'2').result,'BPO2',
    'V4b: bunt pop-out notation can be repaired later');
  const bfpop=sb.buntOutNotation('BFPOP','2');
  eq(bfpop.code,'BPOF2','V4b: foul bunt pop out keeps a distinct combined result code');
  eq(bfpop.text,'Bunt pop out in foul territory P2','V4b: foul bunt pop out keeps combined play text');
  eq(sb.clsOf('BPOF2'),'out','V4b: foul bunt pop out classifies as an out');
  eq(sb.paKind('BPOF2'),'BFPOP','V4b: edit flow preserves foul bunt pop-out identity');
  eq(sb.applyNotationFix('BFPOP',null,'2').result,'BPOF2',
    'V4b: foul bunt pop-out notation can be repaired without losing foul status');
  ok(sb.advanceReasonChoices('BPOF2').tag,
    'V4b: runners advancing after a caught foul bunt pop can be marked tagged up');
  ok(sb.advanceReasonChoices('BPO2').tag,
    'V4b: runners advancing after a fair bunt pop can be marked tagged up');
  ok(sb.advanceReasonChoices('F8').tag && sb.advanceReasonChoices('L6').tag &&
     sb.advanceReasonChoices('P5').tag && sb.advanceReasonChoices('fP2').tag,
    'V4b: all ordinary caught-ball outs expose Tagged Up with numeric fielder codes');
  newGame();
  sb.scoreBuntOut('BPOP');
  ok(el('#sheet').innerHTML.indexOf('id="bpopFair"')>=0 &&
     el('#sheet').innerHTML.indexOf('id="bpopFoul"')>=0,
    'V4b: bunt pop-out flow asks Fair or Foul before choosing the fielder');

  /* ===== foul-out slide selector ===== */
  newGame();
  sb.outcomeModal();
  const foulOutcomeHTML=el('#sheet').innerHTML;
  ok(foulOutcomeHTML.indexOf('id="foulOutBtn"')>=0 &&
     html.indexOf('id="foulOutHoldMenu"')>=0 &&
     html.indexOf('← Fly')>=0 && html.indexOf('Pop Up →')>=0,
    'V4c: Foul out uses left Fly / right Pop Up slide selector');
  const ffly=sb.foulOutNotation('FFLY','7');
  eq(ffly.code,'f7','V4c: foul fly keeps compatible f7 notation');
  eq(ffly.text,'Foul fly out to 7','V4c: foul fly keeps distinct play text');
  const fpop=sb.foulOutNotation('FPOP','2');
  eq(fpop.code,'fP2','V4c: foul pop-up keeps distinct result code');
  eq(fpop.text,'Foul pop out P2','V4c: foul pop-up keeps distinct play text');
  eq(sb.clsOf('fP2'),'out','V4c: foul pop-up classifies as an out');
  eq(sb.paKind('fP2'),'FPOP','V4c: edit flow recognizes foul pop-up');
  eq(sb.applyNotationFix('FPOP',null,'5').result,'fP5',
    'V4c: foul pop-up notation can be repaired later');
  eq(sb.contactPitchBonus('fP2'),1,'V4c: foul pop-up credits terminal physical pitch');
  /* ===== sacrifice runner defaults ===== */
  newGame();
  sb.S.bases[0]={t:'away',i:4};
  sb.S.bases[2]={t:'away',i:6};
  const sacMv=sb.sacrificeMovers('5-3');
  const sacRunners=sacMv.filter(m=>m.who==='R');
  eq(sacRunners.length,2,'SAC1: sacrifice placement includes existing runners');
  ok(sacRunners.every(m=>m.to===m.from),
    'SAC1: sacrifice runners default to holding their current bases');
  ok(sacMv[0].who==='BR' && sacMv[0].out && sacMv[0].to===0,
    'SAC1: sacrifice batter is still recorded out');
  ok(sacRunners.some(m=>m.from===1&&m.to===1) &&
     sacRunners.some(m=>m.from===3&&m.to===3),
    'SAC1: sacrifice does not assume every runner advances');

  /* ===== intentional walk button ===== */
  ok(html.indexOf('data-p="ibb"')>=0 &&
     html.indexOf('Intentional Walk</button>')>=0 &&
     html.indexOf('data-p="pitchout">Pitchout</button>')<0,
    'V5: Intentional Walk replaces Pitchout in the scoring controls');

  newGame();
  sb.S.bases[0]={t:'away',i:1};
  const beforeIbbPitches=sb.S.pa.filter(e=>e.t==='p').length;
  sb.doPitch('ibb');
  el('#plDone').onclick();
  const ibb=sb.S.pas[sb.S.pas.length-1];
  eq(ibb.result,'IBB','V5: intentional walk records IBB result');
  eq(ibb.events.filter(e=>e.t==='p').length,beforeIbbPitches,
    'V5: intentional walk adds no pitches');
  ok(sb.S.bases[0] && sb.S.bases[1],
    'V5: intentional walk uses normal forced-runner movement');

  newGame();
  sb.doPitch('ball');
  sb.doPitch('ball');
  eq(sb.S.pa.filter(e=>e.t==='p').length,2,
    'V5: two real pitches exist before mid-PA intentional walk');
  sb.doPitch('ibb');
  el('#plDone').onclick();
  const midPaIbb=sb.S.pas[sb.S.pas.length-1];
  eq(midPaIbb.result,'IBB',
    'V5: mid-PA intentional walk still records IBB');
  eq(midPaIbb.events.filter(e=>e.t==='p').length,2,
    'V5: mid-PA intentional walk preserves prior pitches and adds none');
  ok(midPaIbb.events.filter(e=>e.t==='p').every(e=>e.text==='Ball'),
    'V5: preserved pitch events remain the two thrown balls');

  /* ===== held Ball → intentional thrown ball ===== */
  ok(html.includes('data-p="ball" data-hold-wppb="1" data-hold-down="intentball"') &&
     html.includes("downKind==='intentball'?'↓ Intentional Ball'") &&
     html.includes("else if(c==='DOWN')doPitch(downKind)"),
    'IB1: holding Ball and sliding down records the intentional-ball variant');
  ok(html.includes('data-p="ibb">Intentional Walk</button>'),
    'IB1: automatic zero-pitch Intentional Walk stays available separately');

  newGame();
  sb.syncPitcherFromLineup('home');
  sb.doPitch('intentball');
  eq(sb.S.balls,1,'IB2: intentional ball advances the live ball count');
  eq(sb.S.pa.filter(e=>e.t==='p').length,1,
    'IB2: intentional ball records exactly one pitch event');
  eq(sb.S.pa[0].text,'Intentional ball',
    'IB2: intentional ball preserves distinct pitch notation');
  eq(sb.pitcherPitchCount('home'),1,
    'IB2: intentional ball counts toward the pitcher physical pitch total');
  sb.renderScore();
  ok(el('#hEvents').innerHTML.includes('Int. Ball'),
    'IB2: live pitch rail distinguishes intentional balls');
  eq(sb.countAfterPitch('Intentional ball',2,1).b,3,
    'IB2: pitch audit reconstructs an intentional ball as a ball');
  eq(sb.pitchCounts({events:[{t:'p',text:'Ball'},{t:'p',text:'Intentional ball'}]}).b,2,
    'IB2: past-PA pitch recount includes intentional balls');
  sb.S.pa=[{t:'p',text:'Intentional ball'}];sb.S.balls=0;
  sb.recountCount(sb.S.pa);
  eq(sb.S.balls,1,'IB2: restored live count includes intentional ball');

  newGame();
  sb.syncPitcherFromLineup('home');
  sb.doPitch('ball');
  sb.doPitch('intentball');
  sb.doPitch('intentball');
  eq(sb.S.balls,3,'IB3: ordinary and intentional balls share the same count');
  sb.doPitch('intentball');
  ok(el('#sheet').innerHTML.includes('Walk'),
    'IB3: fourth intentional ball goes through ordinary walk placement');
  el('#plDone').onclick();
  const intentionalWalkPitched=sb.S.pas[sb.S.pas.length-1];
  eq(intentionalWalkPitched.result,'BB',
    'IB3: pitched fourth ball remains a BB rather than free no-pitch IBB');
  eq(intentionalWalkPitched.events.filter(e=>e.t==='p').length,4,
    'IB3: all four physical pitches are preserved on the walk');
  eq(intentionalWalkPitched.events.filter(e=>e.t==='p'&&e.text==='Intentional ball').length,3,
    'IB3: final PA retains intentional-ball labels');
  eq(sb.pitcherPitchCount('home'),4,
    'IB3: fourth intentional ball remains charged as one physical pitch');
  const intentionalAudit=sb.paPitchAudit(intentionalWalkPitched);
  eq(intentionalAudit.credited,4,'IB3: pitch audit credits four real pitches on the walk');
  eq(intentionalAudit.final.b,4,'IB3: audit final count reaches ball four');

  newGame();
  const corrected={result:'1B',events:[{t:'p',text:'Ball'},{t:'o',text:'Single'}]};
  eq(sb.tryAddPitch(corrected,'Intentional ball'),'',
    'IB4: missed-pitch editor accepts intentional balls');
  eq(corrected.events[1].text,'Intentional ball',
    'IB4: added intentional ball is inserted before the PA outcome');
  eq(sb.pitchCounts(corrected).b,2,
    'IB4: inserted intentional ball rebuilds the count correctly');
  sb.S.pas=[corrected];
  sb.addPitchPA(0);
  ok(el('#sheet').innerHTML.includes('data-ap="Intentional ball"'),
    'IB4: missed-pitch editor offers Intentional ball as a correction');

  /* ===== foul tip pitch ===== */
  ok(html.indexOf('data-p="foultip"')>=0 && html.indexOf('Foul Tip</button>')>=0,
    'V6: Foul Tip has its own scoring button');

  newGame();
  sb.doPitch('foultip');
  eq(sb.S.strikes,1,'V6: foul tip counts as a strike');
  ok(sb.S.pa.some(e=>e.t==='p'&&e.text==='Foul tip'),
    'V6: foul tip keeps distinct pitch-history text');

  newGame();
  sb.S.strikes=2;
  sb.S.pa=[{t:'p',text:'Called strike'},{t:'p',text:'Foul ball'}];
  sb.doPitch('foultip');
  const ftK=sb.S.pas[sb.S.pas.length-1];
  eq(ftK.result,'K','V6: foul tip on strike three records swinging K');
  ok(ftK.events.some(e=>e.t==='p'&&e.text==='Foul tip'),
    'V6: strike-three foul tip remains labeled in committed PA');

  const ftPa={result:'1B',events:[{t:'p',text:'Foul tip'}]};
  eq(sb.pitchCounts(ftPa).s,1,'V6: edit/recount logic recognizes foul tip as a strike');
  sb.S.pa=[{t:'p',text:'Foul tip'}];sb.S.balls=0;sb.S.strikes=0;sb.recountCount(sb.S.pa);
  eq(sb.S.strikes,1,'V6: live count rebuild recognizes foul tip as a strike');

  /* ===== pitch hold WP/PB + uncaught third strike ===== */
  ok(html.indexOf('data-hold-wppb="1"')>=0 &&
     html.indexOf('id="wppbBtn"')<0 &&
     html.indexOf('id="pitchHoldMenu"')>=0,
    'W1: Ball/Called/Swinging use hold gesture and separate WP/PB button is gone');
  ok(html.indexOf("downKind==='intentball'?'Intentional Ball':'Missed Bunt'")>=0 &&
     html.indexOf('Slide down for Foul Bunt.')>=0,
    'W1: hold gesture exposes horizontal uncaught-pitch choices plus downward bunt choices');

  newGame();
  sb.doPitchWPPB('ball','WP');
  eq(sb.S.balls,1,'W2: held Ball records the ball in the count');
  ok(sb.S.pa.some(e=>e.t==='p'&&e.text==='Ball') &&
     sb.S.pa.some(e=>e.t==='r'&&e.text==='Wild pitch'),
    'W2: held Ball records one pitch plus Wild pitch');

  newGame();
  sb.S.strikes=1;
  sb.doPitchWPPB('cstr','PB');
  eq(sb.S.strikes,2,'W2: held Called strike increments strike count');
  ok(sb.S.pa.some(e=>e.t==='p'&&e.text==='Called strike') &&
     sb.S.pa.some(e=>e.t==='r'&&e.text==='Passed ball'),
    'W2: held Called strike records pitch plus Passed ball');

  newGame();
  sb.S.outs=2;sb.S.strikes=2;
  sb.doPitchWPPB('sstr','PB');
  ok(el('#sheet').innerHTML.indexOf('Swinging strike three — Passed ball')>=0,
    'W3: held strike three enters uncaught-third-strike placement flow');
  el('#plDone').onclick();
  const uk=sb.S.pas[sb.S.pas.length-1];
  eq(uk.result,'K-PB','W3: uncaught swinging third strike records K-PB');
  eq(sb.S.outs,2,'W3: batter reaching on uncaught third strike does not add an out');
  ok(uk.events.some(e=>e.t==='p'&&e.text==='Swinging strike') &&
     uk.events.some(e=>e.t==='r'&&/Passed ball/.test(e.text)),
    'W3: uncaught third strike keeps both pitch and passed-ball events');
  ok(sb.S.bases[0]&&sb.S.bases[0].i===0,
    'W3: with two outs the batter can reach first on uncaught third strike');

  newGame();
  sb.S.outs=1;sb.S.strikes=2;sb.S.bases[0]={t:'away',i:4};
  sb.doPitchWPPB('sstr','WP');
  el('#plDone').onclick();
  const ukBlocked=sb.S.pas[sb.S.pas.length-1];
  eq(ukBlocked.result,'K-WP','W4: occupied-first uncaught third strike keeps K-WP notation');
  eq(sb.S.outs,2,'W4: with fewer than two outs and first occupied, batter is out');

  newGame();
  sb.S.balls=3;
  sb.doPitchWPPB('ball','PB');
  el('#plDone').onclick();
  const bbpb=sb.S.pas[sb.S.pas.length-1];
  eq(bbpb.result,'BB','W5: held ball four remains a walk result');
  eq(bbpb.events.filter(e=>e.t==='p').length,1,
    'W5: held ball four counts exactly one thrown pitch');
  ok(bbpb.events.some(e=>e.t==='r'&&e.text==='Passed ball'),
    'W5: held ball four also records the Passed ball');

  /* ===== catcher's interference ===== */
  newGame();
  sb.S.bases[0]={t:'away',i:4};
  sb.handleOutcome('CI');
  ok(el('#sheet').innerHTML.indexOf("Catcher's interference · E2")>=0,
    'C1: catcher interference opens placement review with automatic E2');
  el('#plDone').onclick();
  const ci=sb.S.pas[sb.S.pas.length-1];
  eq(ci.result,'CI','C1: catcher interference records distinct CI result');
  eq(ci.err,'E2','C1: catcher interference charges E2 to the catcher');
  eq(ci.errBy&&ci.errBy[0],'Rival8','C1: E2 is attributed to the point-in-time catcher');
  ok(sb.S.bases[0]&&sb.S.bases[0].i===0,
    'C1: batter is awarded first on catcher interference');
  ok(sb.S.bases[1]&&sb.S.bases[1].i===4,
    'C1: runner on first is forced to second');
  eq(sb.S.outs,0,'C1: catcher interference does not record an out');
  eq(sb.teamHits('away'),0,'C1: catcher interference does not count as a hit');
  eq(sb.teamErrs('home'),1,'C1: catcher interference counts as a fielding error');

  /* ===== hit-type menu ordering ===== */
  newGame();
  sb.hitPicker('Single',()=>{});
  const hitMenu=el('#sheet').innerHTML;
  const hitOrder=['data-ht="ground ball"','data-ht="line drive"','data-ht="fly ball"','data-ht="pop up"','data-ht="bunt"']
    .map(x=>hitMenu.indexOf(x));
  ok(hitOrder.every(x=>x>=0) && hitOrder.every((x,i)=>i===0||x>hitOrder[i-1]),
    'H1: hit type menus order Ground / Line / Fly / Pop Up / Bunt');
  ok(hitMenu.indexOf('>Ground</button>')>=0 &&
     hitMenu.indexOf('>Line</button>')>=0 &&
     hitMenu.indexOf('>Fly</button>')>=0 &&
     hitMenu.indexOf('>Pop Up</button>')>=0 &&
     hitMenu.indexOf('>Bunt</button>')>=0,
    'H1: hit type labels use the requested compact wording');
  ok(hitMenu.indexOf('class="sheetActions"')>=0 &&
     hitMenu.indexOf('id="hitDone"')>=0 &&
     hitMenu.indexOf('id="hitCancel"')>=0,
    'H1: hit-detail picker keeps Done and Cancel together in a sticky action footer');
  ok(html.indexOf('.sheetActions{position:sticky;bottom:0')>=0,
    'H1: hit-detail action footer stays visible while the sheet scrolls');

  /* ===== bunt pitch slide gestures ===== */
  ok(html.indexOf('data-p="bunt"')<0 && html.indexOf('ps-buntpitch')<0,
    'BUNT1: no standalone Bunt pitch button remains on the main pad');
  ok(html.indexOf('data-p="sstr" data-hold-wppb="1" data-hold-down="missbunt"')>=0 &&
     html.indexOf('data-p="foul" data-hold-down="foulbunt"')>=0,
    'BUNT1: Swinging and Foul expose downward bunt gestures');
  ok(html.indexOf('data-gesture="WP"')>=0 && html.indexOf('data-gesture="PB"')>=0 &&
     html.indexOf('data-gesture="DOWN"')>=0,
    'BUNT1: pitch gesture overlay supports left / right / down targets');
  ok(html.indexOf("dy>12&&dy>Math.abs(dx)")>=0 &&
     html.indexOf("choice='DOWN'")>=0,
    'BUNT1: downward movement wins when the gesture is primarily vertical');
  ok(html.indexOf("downKind==='missbunt'?'↓ Missed Bunt'")>=0 &&
     html.indexOf("downKind==='foulbunt'?'↓ Foul Bunt'")>=0,
    'BUNT1: gesture overlay labels the correct bunt variant');
  ok(html.indexOf("if(c==='WP'||c==='PB')doPitchWPPB(btn.dataset.p,c)")>=0 &&
     html.indexOf("else if(c==='DOWN')doPitch(downKind)")>=0,
    'BUNT1: Swinging retains left/right uncaught-pitch actions while down records bunt');

  newGame();
  sb.doPitch('missbunt');
  eq(sb.S.strikes,1,'BUNT1: missed bunt adds a strike');
  ok(sb.S.pa.some(e=>e.t==='p'&&e.text==='Missed bunt'),
    'BUNT1: missed bunt is stored distinctly');

  newGame();
  sb.doPitch('foulbunt');
  eq(sb.S.strikes,1,'BUNT1: foul bunt before two strikes adds a strike');
  sb.doPitch('cstr');
  sb.doPitch('foulbunt');
  eq(sb.S.pas.length,1,'BUNT1: foul bunt with two strikes ends the PA');
  eq(sb.S.pas[0].result,'K','BUNT1: two-strike foul bunt records a strikeout');
  ok(sb.S.pas[0].events.some(e=>e.t==='p'&&e.text==='Foul bunt'),
    'BUNT1: strikeout PA preserves foul-bunt pitch event');
  /* ===== terminal ABS: ball four challenged to strike three ===== */
  newGame();
  sb.S.chal={away:2,home:2};
  sb.doPitch('ball');sb.doPitch('ball');sb.doPitch('ball');
  sb.doPitch('cstr');sb.doPitch('cstr');
  sb.doPitch('ball');
  ok(el('#sheet').innerHTML.indexOf('id="plChallenge"')>=0,
    'ABS1: ball-four placement exposes Challenge last pitch');
  el('#plChallenge').onclick();
  ok(el('#sheet').innerHTML.indexOf('Challenge the call')>=0,
    'ABS1: terminal ball-four challenge opens directly from placement');
  el('#chOv').onclick();
  const absK=sb.S.pas[sb.S.pas.length-1];
  eq(absK.result,'ꓘ','ABS1: overturned ball four on 3-2 becomes called strikeout');
  eq(sb.S.order.away,1,'ABS1: overturned terminal pitch advances batting order once');
  eq(sb.S.balls,0,'ABS1: strikeout resets balls');
  eq(sb.S.strikes,0,'ABS1: strikeout resets strikes');

  newGame();
  sb.S.chal={away:2,home:2};
  sb.doPitch('ball');sb.doPitch('ball');sb.doPitch('ball');sb.doPitch('cstr');
  sb.doPitch('ball');
  el('#plChallenge').onclick();
  el('#chUp').onclick();
  ok(el('#sheet').innerHTML.indexOf('id="plDone"')>=0 &&
     el('#sheet').innerHTML.indexOf('Confirm where everyone ends up')>=0,
    'ABS1: upheld ball-four challenge returns to same placement sheet');
  eq(sb.S.chal.home,1,'ABS1: upheld ball challenge costs fielding team one challenge');

  /* ===== terminal ABS: called strike three ===== */
  newGame();
  sb.S.outs=2;sb.S.chal={away:2,home:2};
  sb.doPitch('cstr');sb.doPitch('cstr');sb.doPitch('cstr');
  ok(el('#sheet').innerHTML.indexOf('Called strike three')>=0 &&
     el('#sheet').innerHTML.indexOf('id="kChallenge"')>=0,
    'ABS2: called strike three pauses on a review sheet with Challenge last pitch');
  eq(sb.S.outs,3,'ABS2: third-out called strike is held before half-inning transition');
  eq(sb.S.half,0,'ABS2: half-inning does not flip before strike-three review is resolved');
  el('#kChallenge').onclick();
  el('#chOv').onclick();
  eq(sb.S.pas.length,0,'ABS2: overturned called strike three restores the live PA');
  eq(sb.S.outs,2,'ABS2: overturned third strike restores the prior out count');
  eq(sb.S.order.away,0,'ABS2: overturned third strike restores the batter in the order');
  eq(sb.S.balls,1,'ABS2: overturned called strike becomes a ball');
  eq(sb.S.strikes,2,'ABS2: overturned called strike restores a two-strike count');
  eq(sb.S.half,0,'ABS2: overturned third-out strike keeps the same half-inning alive');

  newGame();
  sb.S.outs=2;sb.S.chal={away:2,home:2};
  sb.doPitch('cstr');sb.doPitch('cstr');sb.doPitch('cstr');
  el('#kChallenge').onclick();
  el('#chUp').onclick();
  ok(el('#sheet').innerHTML.indexOf('Called strike three')>=0 &&
     el('#sheet').innerHTML.indexOf('id="kChallenge"')<0 &&
     el('#sheet').innerHTML.indexOf('Challenge resolved.')>=0,
    'ABS2: upheld strike-three challenge returns to review with challenge resolved');
  el('#kDone').onclick();
  eq(sb.S.half,1,'ABS2: Done after upheld third-out strike advances to next half-inning');
  eq(sb.S.outs,0,'ABS2: half-inning transition resets outs after strikeout is finalized');

  /* ===== terminal swinging strike three confirmation ===== */
  newGame();
  sb.S.outs=2;
  sb.doPitch('sstr');sb.doPitch('sstr');sb.doPitch('sstr');
  ok(el('#sheet').innerHTML.indexOf('Swinging strike three')>=0 &&
     el('#sheet').innerHTML.indexOf('id="kDone"')>=0,
    'KCONF1: swinging strike three pauses on a confirmation sheet');
  ok(el('#sheet').innerHTML.indexOf('id="kChallenge"')<0,
    'KCONF1: swinging strike confirmation does not offer ABS challenge');
  eq(sb.S.outs,3,'KCONF1: third-out swinging strike is recorded before confirmation');
  eq(sb.S.half,0,'KCONF1: third-out swinging strike does not flip the half before Done');
  el('#kDone').onclick();
  eq(sb.S.half,1,'KCONF1: Done finalizes a third-out swinging strike');
  eq(sb.S.outs,0,'KCONF1: half-inning resets after swinging strikeout confirmation');

  newGame();
  sb.doPitch('sstr');sb.doPitch('sstr');sb.doPitch('foultip');
  ok(el('#sheet').innerHTML.indexOf('Swinging strike three')<0,
    'KCONF1: foul-tip strikeout keeps its existing immediate behavior');

  /* ===== completed game decisions + past-game official scoring ===== */
  newGame();
  eq(sb.S.decisions,null,'G1: new game starts without pitching decisions');
  eq(sb.S.completed,false,'G1: new game is not completed');
  sb.S.runs.away=[9];sb.S.runs.home=[8];
  sb.S.away.pitcher='Carl Edwards Jr. #6';
  sb.S.home.pitcher='Max Scherzer #31';
  sb.S.subLog=[
    {team:'away',type:'P',old:'Kyle Hendricks',new:'José Quintana'},
    {team:'away',type:'P',old:'José Quintana',new:'Carl Edwards Jr.'},
    {team:'home',type:'P',old:'Gio Gonzalez',new:'Max Scherzer'}
  ];
  const awayPitchers=sb.pitcherCandidates('away');
  ok(awayPitchers.includes('Kyle Hendricks')&&awayPitchers.includes('José Quintana')&&awayPitchers.includes('Carl Edwards Jr.'),
    'G1: completion picker reconstructs pitchers from current pitcher and pitching changes');
  sb.S.pas=[
    {team:'away',b:0,inning:1,half:0,result:'F7',batter:'Cub1',
      events:[{t:'p',text:'Ball'},{t:'p',text:'Called strike'},{t:'o',text:'Flied out to 7'}]},
    {team:'away',b:1,inning:2,half:0,result:'K',batter:'Cub2',pitcher:'Max Scherzer #31',
      events:[{t:'p',text:'Automatic ball — pitch timer violation',pitcher:'Max Scherzer #31'},
              {t:'p',text:'Called strike',pitcher:'Max Scherzer #31'},
              {t:'p',text:'Foul ball',pitcher:'Max Scherzer #31'},
              {t:'p',text:'Swinging strike',pitcher:'Max Scherzer #31'},
              {t:'o',text:'Struck out swinging'}]}
  ];
  const homeSummary=sb.pitcherPitchSummary('home');
  const gio=homeSummary.find(x=>x.name==='Gio Gonzalez');
  const max=homeSummary.find(x=>x.name==='Max Scherzer');
  ok(gio&&gio.pitches===3,'G1: legacy untagged starter PA is credited to starting pitcher');
  ok(max&&max.pitches===3,'G1: automatic ball does not inflate reliever physical pitch count');
  const pitchCheck=sb.gamePitchingCheckHTML();
  ok(pitchCheck.indexOf('Pitch check')>=0 &&
     pitchCheck.indexOf('Gio Gonzalez')>=0 &&
     pitchCheck.indexOf('Max Scherzer')>=0,
    'G1: Game Complete pitch check lists pitchers and pitches thrown');
  sb.gameDecisionSheet(true);
  ok(el('#sheet').innerHTML.indexOf('Pitch check')>=0 &&
     el('#sheet').innerHTML.indexOf('Winning pitcher')>=0 &&
     el('#sheet').innerHTML.indexOf('Losing pitcher')>=0 &&
     el('#sheet').innerHTML.indexOf('Save')>=0,
    'G1: Game Complete sheet shows pitch check plus W, L and optional save');
  ok((el('#sheet').innerHTML.match(/data-decision-pick=/g)||[]).length===3 &&
     el('#sheet').innerHTML.indexOf('data-decision-pick="gcWP"')>=0 &&
     el('#sheet').innerHTML.indexOf('data-decision-pick="gcLP"')>=0 &&
     el('#sheet').innerHTML.indexOf('data-decision-pick="gcSV"')>=0,
    'G1: Game Complete exposes explicit Pick buttons for win, loss, and save');
  const winRow=sb.decisionInputRow('gcWP','Winning pitcher',['Brian Duensing','Carl Edwards Jr.'],'Carl Edwards Jr.',false);
  ok(winRow.indexOf('>Pick</button>')>=0 &&
     winRow.indexOf('Brian Duensing')>=0 &&
     winRow.indexOf('Carl Edwards Jr.')>=0,
    'G1: decision picker row retains game-pitcher suggestions and manual input');
  sb.decisionPitcherPicker('Save pitcher',['Wade Davis'],'Wade Davis',()=>{},()=>{},true);
  ok(el('#sheet').innerHTML.indexOf('No save')>=0 &&
     el('#sheet').innerHTML.indexOf('Wade Davis')>=0,
    'G1: save picker includes explicit No save plus winning-team pitchers');
  sb.gameDecisionSheet(true);
  el('#gcWP').value='Brian Duensing';el('#gcLP').value='Max Scherzer';el('#gcSV').value='Wade Davis';
  await el('#gcDone').onclick();
  const completedArchive=sb.getArchive();
  ok(completedArchive.length===1&&completedArchive[0].state.completed===true,
    'G1: completing game archives a completed state');
  eq(completedArchive[0].state.decisions.wp,'Brian Duensing','G1: winning pitcher is archived');
  eq(completedArchive[0].state.decisions.lp,'Max Scherzer','G1: losing pitcher is archived');
  eq(completedArchive[0].state.decisions.sv,'Wade Davis','G1: save pitcher is archived');

  newGame();
  sb.S.runs.away=[1];sb.S.runs.home=[0];
  sb.S.pas=[{team:'away',b:0,inning:1,half:0,result:'E5',batter:'Astro1',events:[{t:'o',text:'Reached on error E5'}],errBy:['Rival5']}];
  const pastGid=sb.S.gid;
  sb.viewing={gid:pastGid,name:'Astros @ Rivals',score:'1-0',date:12345,editing:true,local:true};
  eq(sb.clsOf('E5'),'','G2: reached-on-error is not classified as an out');
  sb.editPA(0);
  ok(el('#sheet').innerHTML.indexOf('Official scoring change')>=0,
    'G2: archived error play offers official scoring change');
  sb.applyFixNotation(sb.S.pas[0],'1B','Singled on a ground ball to 3B');
  eq(sb.S.pas[0].result,'1B','G2: finished-game ruling can change error to hit');
  eq(sb.teamHits('away'),1,'G2: official ruling change recalculates team hits');
  eq(sb.teamErrs('home'),0,'G2: official ruling change removes the fielding error');
  const corrected=sb.getArchive().find(x=>x.gid===pastGid);
  ok(corrected&&corrected.state.pas[0].result==='1B',
    'G2: finished-game scoring change persists to Past games');
  sb.editPA(0);
  ok(el('#sheet').innerHTML.indexOf('Official scoring change')>=0 &&
     el('#sheet').innerHTML.indexOf('Re-score play')<0,
    'G2: archived edit mode offers official ruling changes without destructive rewind');
  sb.viewing=null;

  /* ===== full-lineup substitution mode ===== */
  newGame();
  sb.syncPitcherFromLineup('home');
  ok(sb.S.home.pitcher.indexOf('Rival9')>=0,
    'S1: current pitcher is derived from the lineup position marked P');
  sb.S.home.pool=[{name:'New Arm',num:'55',pos:'1'}];
  sb.openSubstitutionLineup();
  sb.beginLineupSub('home',8);
  ok(sb.pendingSub && sb.pendingSub.team==='home' && sb.pendingSub.slot===8 &&
     sb.S.home.lineup[8].name==='',
    'S1: tapping outgoing lineup player opens that exact batting slot');
  sb.completeLineupSub('home',8,{name:'New Arm',num:'55',pos:'1'});
  eq(sb.S.home.lineup[8].name,'New Arm',
    'S1: replacement inherits the outgoing pitcher batting slot');
  eq(sb.S.home.lineup[8].pos,'1',
    'S1: replacement pitcher is marked P');
  ok(sb.S.home.pitcher.indexOf('New Arm')>=0,
    'S1: current pitcher syncs to the replacement');
  sb.S.bat='home';sb.S.order.home=8;
  eq(sb.curBatter().name,'New Arm',
    'S1: old pitcher cannot return when that batting slot comes up again');
  ok(sb.S.subLog.some(x=>x.type==='P'&&x.old==='Rival9'&&x.new==='New Arm'),
    'S1: pitching substitution is logged');
  ok(sb.S.home.lineup[8].hist && sb.S.home.lineup[8].hist.length===2,
    'S1: batting-slot substitution history is retained');

  newGame();
  sb.S.home.dh=true;
  sb.S.home.lineup.push({name:'Old DH Pitcher',num:'60',pos:'1',nb:true});
  sb.ensureShape();sb.syncPitcherFromLineup('home');
  sb.S.home.pool=[{name:'DH New Arm',num:'61',pos:'1'}];
  sb.beginLineupSub('home',9);
  sb.completeLineupSub('home',9,{name:'DH New Arm',num:'61',pos:'1'});
  eq(sb.S.home.lineup[9].name,'DH New Arm',
    'S2: DH pitcher replacement stays in the non-batting pitcher slot');
  eq(sb.S.home.lineup.slice(0,9).filter(x=>x.name==='DH New Arm').length,0,
    'S2: DH pitcher is not inserted into the batting order');
  ok(sb.S.home.pitcher.indexOf('DH New Arm')>=0,
    'S2: current pitcher syncs from dedicated DH pitcher slot');

  newGame();
  sb.S.home.lineup[8].pos='9';
  sb.S.home.lineup[0].pos='1';
  sb.syncPitcherFromLineup('home');
  ok(sb.S.home.pitcher.indexOf('Rival1')>=0 &&
     sb.fielderName('home','1')==='Rival1',
    'S3: changing defensive position to P updates current pitcher and fielding lookup');

  newGame();
  sb.openSubstitutionLineup();
  ok(sb.substitutionMode===true,
    'S3: Subs opens full lineup substitution mode');
  ok(el('#homeLU').innerHTML.indexOf('data-f="pos"')>=0,
    'S3: defensive positions remain dropdowns in substitution mode');
  ok(el('#subModeBanner').hidden===false,
    'S3: substitution instructions are visible on the lineup screen');
  ok(html.indexOf("$('#subBtn').onclick=openSubstitutionLineup")>=0,
    'S3: Score Subs button routes to full lineup instead of the old modal');

  newGame();
  sb.S.home.pool=[{name:'Player First Arm',num:'77',pos:'1'}];
  sb.openSubstitutionLineup();
  sb.selectIncomingSub('home',sb.S.home.pool[0]);
  ok(sb.subIncoming&&sb.subIncoming.player.name==='Player First Arm',
    'S3a: live substitution selects the incoming roster player first');
  eq(sb.S.home.lineup[8].name,'Rival9',
    'S3a: selecting incoming player does not remove the outgoing lineup player yet');
  sb.applyIncomingLineupSub('home',8);
  eq(sb.S.home.lineup[8].name,'Player First Arm',
    'S3a: tapping the lineup spot second completes the defensive substitution');
  ok(sb.S.subLog.some(x=>x.old==='Rival9'&&x.new==='Player First Arm'),
    'S3a: player-first defensive substitution is logged incoming-for-outgoing');

  newGame();
  sb.S.bat='away';sb.S.order.away=2;sb.S.balls=2;sb.S.strikes=1;
  sb.S.away.pool=[{name:'Player First PH',num:'92',pos:'7'}];
  sb.openSubstitutionLineup();sb.showSetupTeam('away','roster');
  sb.selectIncomingSub('away',sb.S.away.pool[0]);
  eq(sb.S.away.lineup[2].name,'Astro3',
    'S3b: selecting a pinch hitter first leaves the current batter untouched until target tap');
  sb.applyIncomingOffensiveSub('away','PH',2,null);
  eq(sb.S.away.lineup[2].name,'Player First PH',
    'S3b: tapping Batter second completes player-first pinch-hit substitution');
  eq(sb.S.balls,2,'S3b: player-first pinch hitter inherits ball count');
  eq(sb.S.strikes,1,'S3b: player-first pinch hitter inherits strike count');

  newGame();
  sb.S.bat='away';sb.S.bases[1]={t:'away',i:4};
  sb.S.away.pool=[{name:'Player First PR',num:'93',pos:'8'}];
  sb.openSubstitutionLineup();sb.showSetupTeam('away','roster');
  sb.selectIncomingSub('away',sb.S.away.pool[0]);
  ok(sb.S.bases[1]&&sb.S.away.lineup[4].name==='Astro5',
    'S3c: selecting a pinch runner first leaves runner and batting slot intact until target tap');
  sb.ensureRunnerIdentity(sb.S.bases[1]);
  const prePrRid=sb.S.bases[1].rid;
  sb.applyIncomingOffensiveSub('away','PR',4,1);
  eq(sb.S.away.lineup[4].name,'Player First PR',
    'S3c: tapping runner second completes player-first pinch-runner substitution');
  ok(sb.S.bases[1]&&sb.pname(sb.S.bases[1]).indexOf('Player First PR')>=0,
    'S3c: player-first pinch runner occupies the selected base');
  eq(sb.S.bases[1].rid,prePrRid,
    'S3c: player-first pinch runner preserves the original runner path identity');

  /* ===== batting-team offensive substitution filter ===== */
  newGame();
  sb.S.bat='away';
  sb.S.order.away=0;
  sb.S.bases[0]={t:'away',i:3};
  sb.S.bases[2]={t:'away',i:5};
  sb.openSubstitutionLineup();
  ok(el('#homePanel').hidden===false && el('#awayPanel').hidden===true,
    'S4: Subs automatically opens on the fielding team');
  sb.showSetupTeam('away','lineup');
  const offHTML=el('#awayLU').innerHTML;
  ok(offHTML.indexOf('data-offsub="PH"')>=0 &&
     (offHTML.match(/data-offsub="PR"/g)||[]).length===2,
    'S4: batting team shows current batter plus only occupied-base runners');
  ok(offHTML.indexOf('Astro1')>=0 && offHTML.indexOf('Astro4')>=0 && offHTML.indexOf('Astro6')>=0 &&
     offHTML.indexOf('Astro2')<0 && offHTML.indexOf('Astro3')<0,
    'S4: batting-team substitution view hides unrelated lineup players');
  ok(el('#awayPosWarn').hidden===true,
    'S4: defensive-position warnings are hidden in offensive-sub view');

  newGame();
  sb.S.bat='away';sb.S.order.away=2;sb.S.balls=2;sb.S.strikes=1;
  sb.S.away.pool=[{name:'Pinch Bat',num:'90',pos:'7'}];
  sb.openSubstitutionLineup();sb.showSetupTeam('away','lineup');
  sb.beginOffensiveSub('away','PH',2,null);
  sb.completeOffensiveSub('away',{name:'Pinch Bat',num:'90',pos:'7'});
  eq(sb.S.away.lineup[2].name,'Pinch Bat',
    'S5: pinch hitter replaces the current batter in the same batting slot');
  eq(sb.S.balls,2,'S5: pinch hitter inherits the existing ball count');
  eq(sb.S.strikes,1,'S5: pinch hitter inherits the existing strike count');
  eq(sb.curBatter().name,'Pinch Bat',
    'S5: current batter immediately becomes the pinch hitter');
  ok(sb.S.subLog.some(x=>x.type==='PH'&&x.old==='Astro3'&&x.new==='Pinch Bat'),
    'S5: pinch-hit substitution is logged');

  newGame();
  sb.S.bat='away';sb.S.bases[1]={t:'away',i:4};
  sb.S.away.pool=[{name:'Fast Runner',num:'91',pos:'8'}];
  sb.openSubstitutionLineup();sb.showSetupTeam('away','lineup');
  sb.beginOffensiveSub('away','PR',4,1);
  ok(sb.S.bases[1]===null && sb.S.away.lineup[4].name==='',
    'S6: choosing a baserunner opens both the base and that batting slot');
  sb.completeOffensiveSub('away',{name:'Fast Runner',num:'91',pos:'8'});
  eq(sb.S.away.lineup[4].name,'Fast Runner',
    'S6: pinch runner replaces the original player in the batting order');
  ok(sb.S.bases[1] && sb.S.bases[1].i===4 && sb.pname(sb.S.bases[1]).indexOf('Fast Runner')>=0,
    'S6: pinch runner occupies the same base with the replacement identity');
  sb.S.order.away=4;
  eq(sb.curBatter().name,'Fast Runner',
    'S6: removed baserunner cannot return when that batting slot comes up');
  ok(sb.S.subLog.some(x=>x.type==='PR'&&x.old==='Astro5'&&x.new==='Fast Runner'&&x.base===2),
    'S6: pinch-runner substitution is logged with the base');

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
