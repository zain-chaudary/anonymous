/* ============================================================
   WORLD LEADER 2026 — SIMULATION ENGINE
   Monthly tick: economy, stability, military, intel, diplomacy,
   world AI, events, wars. Hardcore realism mode.
   ============================================================ */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let state = null;
let selectedISO = null;
let pendingEvents = [];   // modal event queue

/* ---------- helpers ---------- */
const rnd = (a,b) => a + Math.random()*(b-a);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const chance = p => Math.random() < p;
const fmtB = v => v >= 1000 ? '$'+(v/1000).toFixed(2)+'T' : '$'+(v>=10?v.toFixed(0):v.toFixed(1))+'B';
const fmtPop = v => v >= 1000 ? (v/1000).toFixed(2)+'B' : v.toFixed(1)+'M';
const dateStr = s => MONTHS[s.date.m-1] + ' ' + s.date.y;

function news(s, text, tone='info'){
  s.news.unshift({d:dateStr(s), t:text, tone});
  if (s.news.length > 300) s.news.pop();
}

/* combat power score: blends men, armor, air, sea, tech, nukes */
function combatPower(c){
  if (!c) return 0;
  const air = (c.aircraft||0) * 3.5, armor = (c.tanks||0) * 0.4,
        sea = (c.ships||0) * 1.5, men = (c.troops||0) * 0.15;
  const nukeDeterrent = (c.nu||0) > 0 ? 60 : 0; // deters total defeat, doesn't win conventional war
  return air + armor + sea + men + nukeDeterrent;
}

/* world power ranking score (economy + military + nukes) */
function powerScore(c){
  if (!c) return 0;
  return c.gdp*0.6 + (c.defense||0)*6 + (c.troops||0)*0.08 +
         (c.aircraft||0)*0.5 + (c.tanks||0)*0.06 + (c.ships||0)*0.4 + (c.nu||0)*4;
}
const relLabel = r => r>=80?'Ally':r>=60?'Close partner':r>=40?'Friendly':r>=20?'Cordial':r>=0?'Neutral':r>=-30?'Unfriendly':'Hostile';
const stabLabel = v => v>=70?'Stable':v>=55?'Mostly stable':v>=40?'Tense':v>=25?'Serious unrest':'Near collapse';

/* monthly budget math */
function monthlyRevenue(s){ const P=s.countries.PAK; return P.gdp*(P.taxGdp/100)/12*(0.8+s.econ.compliance*0.35); }
function monthlyDebtService(s){ return s.countries.PAK.extDebt*0.055/12; }
function monthlySpend(s){ const B=s.budget; return B.defense+B.dev+B.health+B.edu+B.interior+B.subsidy+B.admin+monthlyDebtService(s)+(s.war?1.5:0)+(s.militPosture-2)*0.12; }

const INITIAL_INNER_RELATIONS = {
  army:63, air:58, navy:55, bank:52,
  punjab:55, sindh:49, kp:43, balochistan:38, gb:54, ajk:51
};
function normalizeState(s){
  if (!s.innerInfluence || typeof s.innerInfluence !== 'object') s.innerInfluence = {relationships:{}};
  if (!s.innerInfluence.relationships || typeof s.innerInfluence.relationships !== 'object') s.innerInfluence.relationships = {};
  for (const [key,value] of Object.entries(INITIAL_INNER_RELATIONS)){
    if (!Number.isFinite(Number(s.innerInfluence.relationships[key]))) s.innerInfluence.relationships[key] = value;
  }
  if (!Array.isArray(s.projects)) s.projects = [];
  if (!Array.isArray(s.ops)) s.ops = [];
  return s;
}

/* ---------- new game ---------- */
function newGame(){
  const countries = JSON.parse(JSON.stringify(COUNTRIES));
  const s = {
    version: 1,
    date: {y:2026, m:11},
    player: 'PAK',
    pc: 55,              // political capital
    approval: 48,
    stability: 55,
    militPosture: 2,     // 1-5 border readiness vs India
    readiness: 0.65,
    econ: { compliance: 0.55, energy: 55, food: 60 },
    /* monthly ministry budgets in $B — player controls via sliders */
    budget: { defense:0.72, dev:0.50, health:0.15, edu:0.18, interior:0.22, subsidy:0.50, admin:0.70 },
    intel: {
      budget: 0.35,
      networks: { IND:{lvl:3,heat:1}, AFG:{lvl:4,heat:1}, USA:{lvl:2,heat:0}, IRN:{lvl:2,heat:0}, SAU:{lvl:2,heat:0}, GBR:{lvl:1,heat:0} }
    },
    innerInfluence: {relationships:{...INITIAL_INNER_RELATIONS}},
    projects: [],
    ops: [],
    war: null,
    flags: {},
    cooldowns: {},
    news: [], log: [],
    gameOver: null,
    worldTension: 32,   // 0-100 global flashpoint index
    oil: 82,            // $/bbl Brent
    countries
  };
  news(s,'November 2026. You assume supreme authority over the Islamic Republic of Pakistan — 241 million people, a $415B economy, 170 nuclear warheads, and more problems than solutions.','big');
  news(s,'IMF EFF review passed in October. Reserves $15.5B. Rupee 281/USD. Ceasefire with India holding since May 2025 — barely.','info');
  news(s,'Game scenario note: relations with military institutions are modeled and will shift with policy choices; this is not a statement from any real officeholder.','warn');
  // US midterm moment (real: Nov 3 2026)
  news(s,'US midterms: Trump\'s Republicans lose the House narrowly; Senate holds 52-48. Foreign policy hardens into pure transactional mode.','info');
  state = s;                    // assign the live game state (UI reads this)
  return s;
}

/* ---------- save / load ---------- */
function saveGame(){ localStorage.setItem('wl2026', JSON.stringify(state)); toast('Game saved'); }
function loadGame(){
  const raw = localStorage.getItem('wl2026');
  if (!raw) return false;
  try { state = normalizeState(JSON.parse(raw)); return true; } catch(e){ return false; }
}

/* ============================================================
   ECONOMY TICK (monthly, Pakistan)
   ============================================================ */
function econTick(s){
  const P = s.countries.PAK;

  // GDP growth: base 3 + investment programs - energy/food stress - war - high rates
  const B = s.budget;
  let g = 3.0;
  g += (B.dev - 0.5)*0.8 + (B.edu - 0.18)*0.5 + (B.health - 0.15)*0.4;
  g += (s.econ.energy - 50) * 0.02;            // energy availability
  g += (s.econ.food - 50) * 0.015;
  if (s.oil > 100) g -= 0.6;
  if (s.war && s.war.enemy === 'IND') g -= 2.2;
  if (s.war) g -= 1.0;
  if (s.stability < 30) g -= 1.0;
  P.growth = P.growth*0.8 + g*0.2;
  P.gdp *= 1 + P.growth/1200;

  // inflation: money printing, subsidies, oil, reserves stress
  let it = 6;
  it += (0.5 - B.subsidy)*3;                   // cutting subsidies hurts short-term
  if (s.flags.printMonths > 0){
    it += 9; s.flags.printMonths--;
    if (s.flags.printMonths === 0){ s.flags.moneyPrinting = false; news(s,'Direct deficit financing ends as the SBP "exhausts its statutory room". Inflation scarring remains.','warn'); }
  }
  if (s.econ.subsidyCut) it += 2.5;
  it += Math.max(0, (s.oil - 85)) * 0.08;
  if (P.reserves < 6) it += 4;
  if (s.war) it += 5;
  P.infl = P.infl*0.7 + it*0.3;

  // external accounts: monthly flows in $B
  const inflow = P.remit/12 + P.exports/12;
  const outflow = P.imports/12 * (s.oil/82) * 0.6 + P.imports/12 * 0.4; // oil ~35% of import bill
  const debtService = P.extDebt * 0.055 / 12;   // ~5.5% avg rate
  P.reserves += inflow - outflow - debtService;

  // FDI flavor: China/GB investments when relations high
  if ((s.countries.CHN.rel.PAK||0) > 70 && chance(0.25)) { P.reserves += rnd(0.2,0.8); }
  if ((s.countries.SAU.rel.PAK||0) > 70 && chance(0.12)) { P.reserves += rnd(0.3,0.7); }

  // budget: revenue vs ministry spending → reserves/debt
  const revenue = monthlyRevenue(s);
  const spend = monthlySpend(s);
  const bal = revenue - spend;
  P.reserves += bal;
  if (P.reserves < 0){ P.extDebt += (-P.reserves)*1.1; P.reserves = 0; if (chance(0.4)) news(s,'Treasury overdraft — government borrowing to pay salaries. Debt climbs.','warn'); }
  else P.extDebt = Math.max(0, P.extDebt - bal*0.15);
  P.deficit = -bal*12/P.gdp*100;
  P.defense = B.defense*12;                    // annualized for power calcs
  P.debtGdp += (P.deficit - P.growth)*0.05;
  P.debtGdp = clamp(P.debtGdp, 45, 145);

  const importCover = P.reserves / (P.imports/12);
  const fxPressure = (P.infl - 3)/12/100 + (importCover < 2 ? 0.006 : importCover > 4 ? -0.002 : 0);
  P.fx *= 1 + fxPressure;

  // CRISIS: reserves
  if (P.reserves < 5 && !s.flags.reserveCrisis) {
    s.flags.reserveCrisis = true;
    queueEvent(s, 'reserveCrisis');
  }
  if (P.reserves > 9) s.flags.reserveCrisis = false;
  if (P.reserves < 1.5) endGame(s, 'default','The State Bank is empty. Pakistan defaults. The rupee is confetti, imports stop, and the mobs outside the gates decide the rest. GAME OVER — economic collapse.');

  // oil drift
  s.oil = clamp(s.oil + rnd(-3,3), 45, 160);
}

/* ============================================================
   STABILITY TICK (approval, factions, provinces, coup risk)
   ============================================================ */
function stabTick(s){
  const P = s.countries.PAK;
  // approval target
  const B = s.budget;
  let t = 50 + (P.growth - 3)*2.2 + (6 - Math.min(P.infl,30))*1.6;
  t += (B.health-0.15)*10 + (B.edu-0.18)*6 + (B.subsidy-0.5)*8;
  t -= Math.max(0, s.countries.PAK.factions.TTP.power - 25)*0.3;
  t -= Math.max(0, s.countries.PAK.factions.BLA.power - 20)*0.25;
  if (s.flags.ptiDialogue) t += 3;
  if (s.flags.khanReleased) t += 5;
  if (s.flags.mediaCrackdown) t -= 2;
  if (s.war) t += s.war.patriotism; // rally-round-flag
  s.approval = clamp(s.approval*0.75 + t*0.25, 0, 100);

  const F = P.factions;
  const intGap = (s.budget.interior - 0.22);
  F.TTP.power  = clamp(F.TTP.power + rnd(-1.5, 1.2) + (s.flags.ttpOps? -2.2:0) + ((s.countries.AFG.rel.PAK||0)<20?0.8:0) - intGap*1.5, 5, 95);
  F.BLA.power  = clamp(F.BLA.power + rnd(-1.2, 1.0) + (s.flags.blaOps? -1.8:0) + (s.flags.blaDev? -1.4:0) + (s.flags.blaTalks? -1.0:0) - intGap*1.2, 5, 95);
  F.PTI.power  = clamp(F.PTI.power + rnd(-1.5, 1.3) + (s.flags.ptiDialogue? -2.0:0) + (s.flags.ptiCrackdown? -3.0:0) + (s.approval<40?1.2:0), 5, 95);
  F.SECT.power = clamp(F.SECT.power + rnd(-1.2, 1.0) + (s.flags.sectJirga? -1.5:0), 5, 95);

  // provinces mood follows national mood
  for (const pr of P.provinces) {
    pr.mood = clamp(pr.mood + (s.approval - pr.mood)*0.1 + rnd(-1,1), 5, 95);
  }
  P.provinces.find(p=>p.id==='kp').mood      = clamp(P.provinces.find(p=>p.id==='kp').mood - F.TTP.power*0.05, 5, 95);
  P.provinces.find(p=>p.id==='balochistan').mood = clamp(P.provinces.find(p=>p.id==='balochistan').mood - F.BLA.power*0.08, 5, 95);

  // stability composite
  s.stability = clamp(0.5*s.approval + 0.3*(100 - (F.TTP.power+F.BLA.power)/2) + 0.2*(100-F.PTI.power*0.6) , 0, 100);

  // political capital regen
  s.pc = clamp(s.pc + 4 + (s.approval>55?2:0), 0, 100);

  // COUP RISK (hardcore)
  if (s.approval < 22 || s.stability < 26) {
    if (chance(0.18)) {
      if (!s.flags.coupWarning) { s.flags.coupWarning = true; queueEvent(s,'coupWarning'); }
      else endGame(s,'coup','At 3 a.m., tanks surround the Prime Minister\'s House. The ISPR statement is four sentences long and does not include your name. GAME OVER — removed by the establishment.');
    } else if (s.approval < 12 && chance(0.15)) {
      endGame(s,'revolution','A million people do not leave the Mall Road. Institutions fold one by one, and your helicopter does not reach the airport. GAME OVER — swept from power by the street.');
    }
  } else { s.flags.coupWarning = false; }

  // faction terror attacks flavor
  if (chance(F.TTP.power/400)) { news(s,'TTP suicide bombing in ' + (chance(0.5)?'Peshawar':'Bannu') + ' — ' + Math.floor(rnd(3,18)) + ' killed. KP on high alert.','bad'); s.approval -= 1; }
  if (chance(F.BLA.power/450)) { news(s, chance(0.5)?'BLA IED kills soldiers on Quetta highway':'BLA attack on gas pipeline in Dera Bugti; supply disrupted','bad'); }
}

/* ============================================================
   MILITARY / READINESS TICK
   ============================================================ */
function milTick(s){
  const P = s.countries.PAK;
  let target = 0.35 + (s.budget.defense*12/P.gdp)*2.2;  // defense spending share drives readiness
  if (s.militPosture >= 4) target += 0.08;
  if (s.war) target = Math.min(0.95, target + 0.15);
  s.readiness = clamp(s.readiness + (target - s.readiness)*0.25, 0.2, 0.98);
}

/* ============================================================
   INTELLIGENCE TICK — your networks & foreign ops against you
   ============================================================ */
function intelTick(s){
  const P = s.countries.PAK;
  for (const k in s.intel.networks){
    const n = s.intel.networks[k];
    n.heat = clamp(n.heat - 0.5, 0, 10);            // heat cools slowly
    if (n.heat > 7 && chance(0.3)) {                // burned networks get rolled up
      n.lvl = Math.max(0, n.lvl-1); n.heat = 2;
      const cname = s.countries[k] ? s.countries[k].name : k;
      news(s,'Counter-intelligence: ' + cname + ' rolled up a Pakistani network — assets arrested. Analysts blame exposure from recent operations.','bad');
      if (s.countries[k]) s.countries[k].rel.PAK = clamp((s.countries[k].rel.PAK||0) - 6, -100, 100);
    }
  }
  // RAW activity vs you
  if (chance(0.10)) {
    news(s,'CTD busts RAW-financed cell in Balochistan — Indian handlers were paying through hawala to target CPEC sites.','bad');
    P.factions.BLA.power += 1;
  }
  // CIA transactional pressure
  if (chance(0.06)) news(s,'CIA station chief requests meeting: Washington wants "clarity" on Afghan policy and your China ties.','warn');
}

/* ============================================================
   WORLD AI — reactions, bloc logic, flavor
   ============================================================ */
function aiTick(s){
  const c = s.countries;
  // India mirrors your posture
  const IND = c.IND;
  if (s.militPosture >= 4 && chance(0.5)) news(s,'India matches your mobilization — additional divisions observed moving toward the LoC.','warn');
  if ((s.flags.nukeTest) && chance(0.4)) { news(s,'India conducts Agni-V MIRV test in response to your missile test.','warn'); }

  // relations decay toward baseline each month (small)
  for (const iso in c){
    const co = c[iso]; if (iso==='PAK' || !co.rel) continue;
    const base = COUNTRIES[iso].rel.PAK ?? 50;
    co.rel.PAK += (base - co.rel.PAK)*0.03;
  }

  // US conditional reaction
  if ((c.USA.rel.PAK||0) > 55 && chance(0.15)) news(s,'Washington signals new counter-terror funding line for Pakistan.','good');
  if ((c.CHN.rel.PAK||0) > 85 && (c.USA.rel.PAK||0) < 35 && chance(0.1)) news(s,'US State Department questions Pakistan\'s "strategic drift" toward Beijing.','warn');

  // world events flavor pool
  const flavor = [
    () => news(s,`Brent crude at $${s.oil.toFixed(0)}/bbl — ${s.oil>90?'import bill pressure on SBP':''}`,'info'),
    () => news(s,'Russia-Ukraine front: attrition continues; Moscow flattens another Ukrainian grid sector overnight.','info'),
    () => news(s,'China announces new round of PLA exercises around Taiwan; Taipei scrambles jets.','warn'),
    () => news(s,'Gaza ceasefire monitoring meets in Cairo; reconstruction pledges still unmet.','info'),
    () => news(s,'OIC contact group drafts resolution on Kashmir; New Delhi dismisses it as "interference".','info'),
    () => news(s,'Afghan Taliban renew Durand Line objections in message marking colonial-era treaties.','warn'),
    () => news(s,'SIPRI yearbook: global warhead modernization accelerating; South Asia arsenals grow.','info'),
    () => news(s,'GCC leaders meet in Riyadh; Saudi Vision 2030 spending lifts regional demand for Pakistani labor.','good'),
  ];
  if (chance(0.7)) flavor[Math.floor(Math.random()*flavor.length)]();

  // scheduled: IMF reviews Mar & Sep
  if ((s.date.m===3||s.date.m===9) && s.flags.imfActive && !s.flags['imf_'+s.date.y+'_'+s.date.m]){
    s.flags['imf_'+s.date.y+'_'+s.date.m] = true;
    queueEvent(s,'imfReview');
  }
  // scheduled: French presidential Apr-May 2027
  if (s.date.y===2027 && s.date.m===4 && !s.flags.fr2027){ s.flags.fr2027=true; news(s,'France: Macron is a lame duck; Le Pen\'s RN leads every poll for the April-May 2027 presidential. Brussels braces.','info'); }
  if (s.date.y===2027 && s.date.m===5 && !s.flags.fr2027b){ s.flags.fr2027b=true; news(s,'France elects ' + (chance(0.55)?'a RN president — NATO cohesion shaken':'a center-left president — relief in Brussels'),'info'); }
  // scheduled: US presidential Nov 2028
  if (s.date.y===2028 && s.date.m===11 && !s.flags.us2028){ s.flags.us2028=true; queueEvent(s,'us2028'); }
  // scheduled: India general elections Apr-May 2029
  if (s.date.y===2029 && s.date.m===4 && !s.flags.ind2029){ s.flags.ind2029=true; news(s,'India enters general elections. BJP campaigns on "New India" strength; opposition INDIA bloc attacks unemployment.','info'); }
  if (s.date.y===2029 && s.date.m===6 && !s.flags.ind2029b){ s.flags.ind2029b=true; news(s,'India: ' + (chance(0.6)?'BJP returns to power — Modi 4.0. Continuity on Pakistan policy: no talks, terror-only lens.':'Opposition coalition squeaks in — New Delhi\'s Pakistan policy softens at the margins.'),'info'); }
}

/* ============================================================
   WAR SYSTEM (India-focused, generalizable)
   ============================================================ */
function startWar(s, enemy, cause){
  s.war = {
    enemy, months:0, cause,
    intlPressure: 20, patriotism: 12,
    fronts: {
      kashmir: {you: 58, them: 66, ctl: 0.5, name:'Kashmir / LoC'},
      punjab:  {you: 62, them: 70, ctl: 0.5, name:'Punjab plains'},
      sindh:   {you: 48, them: 60, ctl: 0.5, name:'Sindh / Rajasthan'},
      air:     {you: 80, them: 76, ctl: 0.5, name:'Air war'},
      sea:     {you: 40, them: 62, ctl: 0.5, name:'Arabian Sea'}
    },
    lossesYou: 0, lossesThem: 0, nukeUsed:false
  };
  news(s,'⚔ WAR: Pakistan and ' + s.countries[enemy].name + ' are at war — ' + cause,'war');
  s.countries[enemy].rel.PAK = -90;
  // world reaction
  s.countries.USA.rel.PAK -= 15; s.countries.GBR.rel.PAK -= 12;
  s.countries.CHN.rel.PAK -= 5;  s.countries.SAU.rel.PAK -= 8;
  news(s,'UN Security Council emergency session called. UAE and Qatar begin evacuating their nationals from both countries.','warn');
}

function warTick(s){
  const w = s.war; if (!w) return;
  const P = s.countries.PAK, E = s.countries[w.enemy];
  w.months++;
  w.patriotism = Math.max(0, w.patriotism - 3);

  // resolve fronts
  for (const k in w.fronts){
    const f = w.fronts[k];
    let py = f.you * s.readiness, pe = f.them * 0.75;
    if (k==='air') py = f.you * s.readiness; // PAF quality edge
    const roll = rnd(0.75, 1.25);
    const delta = (py - pe) * 0.06 * roll;
    f.ctl = clamp(f.ctl + delta, 0.08, 0.92);
    // attrition
    const casY = Math.floor(rnd(80,320) * (f.ctl<0.35?1.4:1));
    const casE = Math.floor(rnd(90,340) * (f.ctl>0.65?1.4:1));
    w.lossesYou += casY; w.lossesThem += casE;
    f.you = clamp(f.you - rnd(0.5,2.2), 15, 100);
    f.them = clamp(f.them - rnd(0.5,2.2), 15, 100);
  }
  // news from fronts
  const air = w.fronts.air, kash = w.fronts.kashmir;
  if (air.ctl > 0.6 && chance(0.6)) news(s,'PAF dominates the skies — ' + (chance(0.5)?'Swat Valley-style deep strikes hit Indian airbases':'combat air patrols claim another Indian fighter'),'war');
  if (kash.ctl < 0.4 && chance(0.5)) news(s,'Indian forces press in Kashmir; ' + 'villages near the LoC evacuated under artillery fire','war');

  // economy damage
  P.gdp *= 0.988; P.reserves -= 0.8; P.infl += 1.5;

  // international pressure mounts (nuclear-armed neighbors!)
  w.intlPressure = clamp(w.intlPressure + 9 + (w.months>2? 4:0), 0, 100);
  if (w.intlPressure > 60 && chance(0.5)) news(s,'Emergency UNSC session: US, China, Russia jointly demand immediate Pakistan-India ceasefire.','warn');
  if (w.intlPressure > 55 && chance(0.3)) news(s,'Saudi Arabia and UAE suspend new loans until "stability returns". IMF program in jeopardy.','bad');

  // ceasefire logic (realistic: world forces peace before it goes nuclear)
  const losing = Object.values(w.fronts).filter(f=>f.ctl<0.35).length;
  if (w.intlPressure >= 85 || (losing>=2 && w.intlPressure>60)) {
    if (!s.flags.cfQ){ s.flags.cfQ = true; queueEvent(s, 'ceasefireOffer'); }
  }
  // existential check
  if (losing>=3 && w.months>=4 && w.fronts.punjab.ctl < 0.25) {
    if (!s.flags.nukeQ){ s.flags.nukeQ = true; queueEvent(s, 'nuclearDecision'); }
  }
}

function endWar(s, result){
  const w = s.war; s.war = null;
  s.flags.cfQ = false; s.flags.nukeQ = false;
  const E = s.countries[w.enemy];
  E.rel.PAK = clamp(E.rel.PAK + 25, -60, 20);
  s.countries.USA.rel.PAK += 10; s.countries.CHN.rel.PAK += 5;
  s.approval += result==='statusquo'? 4 : result==='advantage'? 10 : -12;
  if (result==='advantage') news(s,'Ceasefire signed in ' + (chance(0.5)?'Muscat':'Beijing') + ' with Pakistan holding better positions. ISPR calls it a "decisive response". Independence Day vibes in the streets.','good');
  else if (result==='statusquo') news(s,'Ceasefire signed — return to pre-war positions. Both capitals claim victory; the dead claim nothing.','info');
  else news(s,'Humiliating ceasefire dictated under international pressure. The word "surrender" is not used. It is understood.','bad');
}

/* ============================================================
   END GAME
   ============================================================ */
function endGame(s, type, text){
  s.gameOver = {type, text, date: dateStr(s)};
  render();
  const modal = document.getElementById('modal');
  modal.innerHTML = `<div class="modal-box gameover"><h1>☠ ${type.toUpperCase()}</h1><p>${text}</p>
    <p class="muted">Survived until: ${dateStr(s)}</p>
    <button class="btn danger" onclick="restartAll()">Start New Game</button></div>`;
  modal.style.display = 'flex';
  localStorage.removeItem('wl2026');
}
function restartAll(){ location.reload(); }

/* ============================================================
   EVENTS (modal decisions + world happenings)
   ============================================================ */
const EVENTS = {
  imfReview: {
    title:'IMF Quarterly Review — ' + 'Mission in Islamabad',
    text:()=>`The IMF team has landed with their spreadsheets. Program compliance: taxes up, subsidies down. Approving the review releases a $1.1B tranche. The team flags your ${state.countries.PAK.infl.toFixed(1)}% inflation and ${state.countries.PAK.reserves.toFixed(1)}B reserves.`,
    choices:[
      {label:'Comply fully — take the tranche', fx:s=>{ s.countries.PAK.reserves += 1.1; s.approval -= 2; s.pc -= 5; news(s,'IMF review passed. $1.1B tranche received; SBP reserves rise.','good'); }},
      {label:'Push back on conditions', fx:s=>{ if(chance(0.4)){s.countries.PAK.reserves += 0.6; news(s,'You negotiate softer conditions — smaller tranche secured.','info');} else {news(s,'IMF walks back to Washington empty-handed. Program suspended; rupee under pressure.','bad'); s.flags.imfActive=false; s.countries.PAK.fx *= 1.02; s.approval += 2;} }},
      {label:'Reject the program entirely', fx:s=>{ s.flags.imfActive=false; news(s,'You tear up the IMF program. Sovereignty: maximum. Reserves: countdown.','warn'); s.approval += 6; s.pc -= 10; }}
    ]
  },
  reserveCrisis: {
    title:'RESERVES CRISIS — Import Cover Below 1 Month',
    text:s=>`SBP Governor Jameel Ahmad arrives at midnight: usable reserves are down to $${state.countries.PAK.reserves.toFixed(1)}B. LCs for fuel and medicine imports are failing. You have days, not months.`,
    choices:[
      {label:'Emergency IMF drawing ($1.5B, humiliation)', fx:s=>{ s.countries.PAK.reserves += 1.5; s.ext = 1; news(s,'IMF emergency purchase approved. The rupee stabilizes; your pride does not.','info'); }},
      {label:'Beg Riyadh and Beijing (needs high relations)', fx:s=>{ const okS=(s.countries.SAU.rel.PAK||0)>60, okC=(s.countries.CHN.rel.PAK||0)>70; let g=0; if(okS){g+=2; news(s,'Riyadh places $2B deposit with SBP.','good');} if(okC){g+=2; news(s,'PBoC activates $2B of the swap line.','good');} if(!g) {news(s,'Nobody picks up the phone. The silence is the answer.','bad'); s.countries.PAK.fx*=1.05; s.approval-=3;} s.countries.PAK.reserves += g; }},
      {label:'Print money and default quietly', fx:s=>{ s.flags.moneyPrinting = true; news(s,'SBP fires up the printing presses. Inflation is now a matter of time.','bad'); }}
    ]
  },
  coupWarning: {
    title:'THE GENERALS ARE UPSET',
    text:s=>`Field Marshal Munir requests an "off-agenda" one-on-one. He does not look like a man delivering a compliment. Approval is ${state.approval.toFixed(0)}% and the establishment is questioning your handling of everything. This is the visit before the visit.`,
    choices:[
      {label:'Defer to the Army publicly', fx:s=>{ s.approval -= 8; s.pc += 10; s.flags.armyPleased = true; news(s,'You publicly credit the Army for everything. The Field Marshal smiles. The street jeers.','warn'); }},
      {label:'Assert civilian control firmly', fx:s=>{ if(chance(0.45)){s.pc+=15; s.approval+=4; news(s,'The bluff holds — for now. Rawalpindi recalibrates.','warn');} else {endGame(s,'coup','The meeting ends early. The tanks do not wait for morning. GAME OVER.');} }},
      {label:'Offer the COAS a bigger budget & free hand in KP', fx:s=>{ s.countries.PAK.defense += 0.8; s.pc += 6; s.flags.armyPleased = true; news(s,'Defense budget up. The Army gets its free hand. Ledger closed — this time.','warn'); }}
    ]
  },
  kashmirAttack: {
    title:'MAJOR ATTACK IN INDIAN-ADMINISTERED KASHMIR',
    text:s=>`Militants kill ${Math.floor(rnd(15,35))} Indian security personnel near Srinagar. The Resistance Front (TRF) claims it. Indian TV is live with incandescent fury; Modi convenes the CCS. New Delhi blames "Pakistani-sponsored terror" within hours. Your denials are ready — they were ready last time too.`,
    choices:[
      {label:'Full denial + offer joint investigation', fx:s=>{ if(chance(0.5)){news(s,'Backchannel cools the crisis. UNSC statement urges restraint on both sides.','good');} else {news(s,'India rejects joint probe, expels Pakistani diplomat, suspends Indus Waters Treaty meetings.','bad'); s.countries.IND.rel.PAK-=15; s.militPosture=Math.max(2,s.militPosture); queueEvent(s,'indiaCrisis');} }},
      {label:'Silence + raise forces to high alert', fx:s=>{ s.militPosture = 4; news(s,'Pakistan Army moves to war footing silently. In New Delhi, hawks take the floor.','warn'); s.countries.IND.rel.PAK -= 8; if (chance(0.55)) queueEvent(s,'indiaCrisis'); }},
      {label:'Preemptive strikes on alleged camps', fx:s=>{ news(s,'PAF/Artillery strike camps across the LoC. The escalation ladder just got a new rung.','war'); s.countries.IND.rel.PAK -= 30; queueEvent(s,'indiaCrisisHard'); }}
    ]
  },
  indiaCrisis: {
    title:'INDIA ISSUES ULTIMATUM',
    text:s=>`New Delhi demands: hand over "terror masters", allow Indian-led verification, end "cross-border infiltration" — or face "measures". Two carrier groups head for the North Arabian Sea. Your NSA puts a map on the table.`,
    choices:[
      {label:'Back down, quietly act against groups', fx:s=>{ news(s,'You swallow the ultimatum with diplomatic sugar. Hawks at home call it surrender; the war does not happen.','warn'); s.countries.IND.rel.PAK += 10; s.approval -= 6; }},
      {label:'Defy — mobilize and dare them', fx:s=>{ s.militPosture = 5; news(s,'Full mobilization ordered. Nuclear command authority reviews its checklist. The world holds its breath.','war'); if(chance(0.45)) startWar(s,'IND','India struck after the Kashmir ultimatum'); else news(s,'India blinks first — both sides stand down after US-China mediation.','info'); }},
      {label:'Backchannel: offer crackdown + talks', fx:s=>{ if(chance(0.6)){news(s,'DG ISI flies to a Gulf capital. India stands down in exchange for visible action.','good'); s.countries.IND.rel.PAK += 8; s.countries.PAK.factions.TTP.power -= 3;} else {news(s,'The backchannel fails — New Delhi leaks it to embarrass you.','bad'); s.countries.IND.rel.PAK -= 10; if(chance(0.4)) startWar(s,'IND','Diplomacy collapsed into war');} }}
    ]
  },
  indiaCrisisHard: {
    title:'INDIA RETALIATES FOR YOUR STRIKES',
    text:s=>`Indian missiles and aircraft hit targets in Pakistani Kashmir and Punjab overnight. Civilians are dead. The doctrine says a conventional answer must come — the strategists say the escalation ladder has no bottom rung you can see from here.`,
    choices:[
      {label:'Respond conventionally — symmetric strikes', fx:s=>{ startWar(s,'IND','Tit-for-tat strikes spiraled into open war'); }},
      {label:'Respond and activate nuclear signaling', fx:s=>{ startWar(s,'IND','War with nuclear signaling'); s.war.patriotism += 8; news(s,'Strategic Forces Command visible readiness raised. Global markets in freefall.','war'); }},
      {label:'Absorb it, go to UNSC', fx:s=>{ news(s,'You absorb the strike and take the file to New York. Airstrikes stop; humiliation doesn\'t.','warn'); s.approval -= 10; s.countries.IND.rel.PAK -= 5; }}
    ]
  },
  ceasefireOffer: {
    title:'CEASEFIRE ON THE TABLE',
    text:s=>`After ${state.war.months} month(s) of war — ${state.war.lossesYou.toLocaleString()} of your soldiers dead, ${state.war.lossesThem.toLocaleString()} of theirs — the US, China and Gulf mediators have a text ready: immediate ceasefire, return to positions, backchannel on Kashmir resumes. The front is ${state.war.intlPressure>85?'collapsing and the world is terrified':'exhausted'}; your call, ruler.`,
    choices:[
      {label:'Sign the ceasefire', fx:s=>{ endWar(s, 'statusquo'); }},
      {label:'Hold out for better terms (gamble)', fx:s=>{ if(!state.war) return; if(chance(0.35) && state.war.intlPressure<95){ state.war.intlPressure -= 20; news(s,'Mediators return with marginally better text. You gained a paragraph; soldiers are still dying.','warn'); } else { news(s,'The gamble fails — India intensifies bombardment of Karachi port and Srinagar front.','war'); state.war.intlPressure = 100; state.war.patriotism -= 10; if (Object.values(state.war.fronts).filter(f=>f.ctl<0.35).length>=3 && !s.flags.nukeQ){ s.flags.nukeQ=true; queueEvent(s,'nuclearDecision'); } } }},
      {label:'Escalate — total war before the world forces peace', fx:s=>{ if(!state.war) return; state.war.intlPressure = 100; state.war.patriotism += 5; news(s,'All-out offensives ordered on every front. History will record this month in red.','war'); if (Object.values(state.war.fronts).filter(f=>f.ctl<0.35).length>=3 || chance(0.5) && !s.flags.nukeQ){ s.flags.nukeQ=true; queueEvent(s,'nuclearDecision'); } }}
    ]
  },
  nuclearDecision: {
    title:'THE NUCLEAR BRIEF',
    text:s=>`The fronts are collapsing. Indian armored columns are through toward major cities; the Strategic Plans Division chief stands silent with the football. Credible minimum deterrence says: use tactical weapons on invading columns before conventional defeat. Everyone in this room understands what comes after.`,
    choices:[
      {label:'DO NOT USE — negotiate capitulation terms', fx:s=>{ endGame(s,'occupation','The ceasefire terms read like a dictated surrender: demilitarization, international administration of your arsenal, tribunals. The flag still flies — thinner. GAME OVER — strategic defeat.'); }},
      {label:'Use tactical nuclear weapons on invasion columns', fx:s=>{ endGame(s,'nuclearwar','You used them. They answered. By the third exchange the subcontinent\'s cities were burning and the radiation drifted east with the monsoon. There is no Pakistan to rule anymore; there is barely an India. ~150 million people are gone in a week. GAME OVER — nuclear war. There was no version of this where you won.'); }}
    ]
  },
  us2028: {
    title:'US PRESIDENTIAL ELECTION 2028',
    text:s=>`America votes. The Republican nominee runs on "America First forever"; the Democrat on "restoring alliances". Either way, Pakistan is a transaction, not a relationship — the question is only the currency: drones or tariffs.`,
    choices:[
      {label:'(Observe — world reacts automatically)', fx:s=>{ const r = chance(0.5); news(s, r? 'Republicans hold the White House — tariffs on friends and foes alike continue.' : 'Democrats take the White House — alliance rhetoric returns, with lectures attached.', 'info'); s.countries.USA.rel.PAK += r? 2 : 6; }}
    ]
  },
  saudRequest: {
    title:'RIYADH REQUESTS — Strategic Defense Pact Activation',
    text:s=>`The Saudi Defense Minister arrives with a request: joint air exercises, expanded Pakistani training mission, and a quiet question about the nuclear umbrella clause of the September 2025 pact. Washington is listening very carefully.`,
    choices:[
      {label:'Deepen the pact (money + bases, US upset)', fx:s=>{ s.countries.SAU.rel.PAK = clamp((s.countries.SAU.rel.PAK||0)+12,0,100); s.countries.PAK.reserves += 3; s.countries.USA.rel.PAK -= 8; news(s,'Riyadh deposits $3B and gets a deeper Pakistani military footprint. Washington notices everything.','warn'); }},
      {label:'Exercises yes, umbrella questions deferred', fx:s=>{ s.countries.SAU.rel.PAK = clamp((s.countries.SAU.rel.PAK||0)+4,0,100); news(s,'Joint exercise "Al-Sakoor" announced; the nuclear question is parked.','info'); }},
      {label:'Decline politely', fx:s=>{ s.countries.SAU.rel.PAK -= 10; news(s,'Riyadh receives your regrets coolly. The next loan call may be colder.','warn'); }}
    ]
  },
  monsoon: {
    title:'MONSOON CATASTROPHE',
    text:s=>`Cloudbursts drown ${['Punjab','Sindh','KP'][Math.floor(rnd(0,3))]} — early estimates: ${Math.floor(rnd(200,900))} dead, ${Math.floor(rnd(2,9))}M affected, standing crops destroyed. The Finance Ministry quietly recalculates growth.`,
    choices:[
      {label:'Massive relief operation ($1.2B)', fx:s=>{ s.countries.PAK.reserves -= 1.2; s.approval += 5; s.econ.food -= 8; news(s,'Army deployed for flood relief; your handling wins praise even from critics.','good'); }},
      {label:'Minimal relief, international appeal', fx:s=>{ s.countries.PAK.reserves += rnd(0.3,0.9); s.approval -= 4; s.econ.food -= 12; news(s,'UN appeal launched. Aid trickles; anger at home flows like the flood itself.','bad'); }},
      {label:'Emergency tax on the rich for relief fund', fx:s=>{ s.pc -= 8; s.approval += 2; s.countries.PAK.reserves += 0.5; news(s,'Flood levy on high earners passes. Elite groaning; treasury slightly less empty.','info'); }}
    ]
  },
  talibanClash: {
    title:'AFGHAN BORDER ERUPTION',
    text:s=>`Taliban border forces open fire on Pakistani posts constructing counter-TTP fencing. ${Math.floor(rnd(4,18))} soldiers dead on both sides. Kabul blames "Durand Line provocations"; the TTP celebrates publicly.`,
    choices:[
      {label:'Overwhelming retaliation vs Afghan posts', fx:s=>{ news(s,'Pakistani jets and artillery strike Afghan border posts. The Emirate howls; the TTP is quieter this month.','war'); s.countries.AFG.rel.PAK -= 20; s.countries.PAK.factions.TTP.power -= 4; if(chance(0.3)) news(s,'Afghanistan mobilizes tribal lashkars to the line.','warn'); }},
      {label:'Targeted strikes on TTP inside Afghanistan', fx:s=>{ if(chance(0.55)){news(s,'Precision strikes kill TTP commanders in Khost. Kabul protests the "violation" — loudly, and does little.','good'); s.countries.PAK.factions.TTP.power -= 6; s.countries.AFG.rel.PAK -= 8;} else {news(s,'Strike goes wrong — civilian madrassa hit, footage everywhere. Regional fury, TTP propaganda windfall.','bad'); s.countries.PAK.factions.TTP.power += 4; s.approval -= 4; s.countries.AFG.rel.PAK -= 12; s.countries.USA.rel.PAK -= 3;} }},
      {label:'De-escalate, pressure Kabul via trade cutoff', fx:s=>{ s.countries.AFG.rel.PAK -= 5; s.countries.PAK.factions.TTP.power += 1; news(s,'Torkham and Chaman closed "for maintenance". Kabul feels the squeeze; truckers feel it too.','info'); }}
    ]
  },
  iranStrike: {
    title:'ISRAEL/US STRIKES ON IRAN AGAIN',
    text:s=>`Overnight, strikes hit Iranian missile and nuclear sites. Tehran vows "unimaginable response"; Hormuz insurance rates spike. Your Shia-major areas brace for sectarian spillover; the US wants "deconfliction" at your borders.`,
    choices:[
      {label:'Strict neutrality + seal the border', fx:s=>{ news(s,'Frontier Corps seals the Iran border. Tehran notes your "responsible silence".','info'); s.econ.sectarianGuard = true; s.countries.IRN.rel.PAK -= 3; }},
      {label:'Condemn the strikes publicly', fx:s=>{ s.countries.IRN.rel.PAK += 8; s.countries.USA.rel.PAK -= 5; s.countries.SAU.rel.PAK -= 4; news(s,'Foreign Office statement denounces "aggression". Washington sends a note; Riyadh a colder one.','warn'); s.pc -= 3; }},
      {label:'Offer mediation (OIC initiative)', fx:s=>{ if(chance(0.4)){ news(s,'Your mediation bid earns headlines across the Muslim world — and a grudging US acknowledgment.','good'); s.pc += 8; s.countries.SAU.rel.PAK += 5; s.approval += 4;} else { news(s,'Both sides ignore your initiative. It becomes a footnote.','info'); s.pc -= 2; } }}
    ]
  },
  khanHealth: {
    title:'IMRAN KHAN — HEALTH CRISIS IN JAIL',
    text:s=>`Reports: the PTI founder\'s health is failing in Adiala jail — party claims poisoning, government says cardiac. Streets are tense. PTI announces countrywide protests if anything happens to him.`,
    choices:[
      {label:'Shift him to a top hospital (controlled)', fx:s=>{ s.countries.PAK.factions.PTI.power -= 5; news(s,'Khan moved to PIMS under heavy guard. The conspiracy machine quiets, partly.','info'); }},
      {label:'House arrest at Banigala', fx:s=>{ s.countries.PAK.factions.PTI.power -= 12; s.flags.khanSemiFree = true; s.pc -= 5; news(s,'Khan released to house arrest. Celebrations in the streets; hawks furious at "weakness".','warn'); }},
      {label:'Nothing changes', fx:s=>{ s.countries.PAK.factions.PTI.power += 8; news(s,'Official silence. PTI announces "civil disobedience" — remittances politics begins.','bad'); if(chance(0.25)) { s.approval -= 5; news(s,'Protests turn violent in Peshawar and Lahore; several dead.','bad'); } }}
    ]
  }
};

/* random pool (auto, no modal): picked monthly */
const RANDOM_EVENTS = [
  {w:3, run:s=>{ news(s,'BLA ambush in Panjgur — Frontier Corps convoy hit.','bad'); }},
  {w:3, run:s=>{ news(s,'Karachi stock exchange hits record as IT sector booms.','good'); }},
  {w:2, run:s=>{ const up = chance(0.6); s.oil += up? 4:-4; news(s,'Crude spikes to $'+s.oil.toFixed(0)+' after Red Sea tanker attack.','up'); }},
  {w:2, run:s=>{ news(s,'Encounter in Turbat: 5 "fitna al-khawarij" terrorists killed, ISPR claims.','info'); }},
  {w:2, run:s=>{ news(s,'UNDP: Pakistan\'s human development index stagnates — "a warning, not a destiny".','info'); }},
  {w:2, run:s=>{ news(s,'PTI holds rally in Swabi despite Section 144; crowds large, violence contained.','warn'); }},
  {w:1, run:s=>{ if((s.countries.SAU.rel.PAK||0)>65) { s.countries.PAK.reserves += 0.4; news(s,'New Saudi labor export agreement: 200,000 Pakistani workers to be deployed.','good'); } }},
  {w:2, run:s=>{ news(s,'Hafiz Saeed-linked group resurfaces in news; FATF grey list warnings circulate in Washington.','warn'); }},
  {w:2, run:s=>{ news(s,'CPEC: ML-1 railway financing finalized with Beijing — $6.7B over 8 years.','good'); }},
  {w:1, run:s=>{ news(s,'CIA drone base question returns: US asks for "logistics access" for its Afghan policy.','warn'); }},
  {w:2, run:s=>{ news(s,'Rupee '+(s.countries.PAK.reserves>12?'stabilizes':'slides')+' at '+s.countries.PAK.fx.toFixed(0)+'/USD as SBP adjusts.','info'); }},
  {w:2, run:s=>{ news(s,'Electricity tariff surge protest; K-Electric crisis in Karachi.','bad'); }},
  {w:1, run:s=>{ news(s,'Air India and PAF jets in near-miss over Sir Creek; both militaries trade blame.','warn'); }},
  {w:1, run:s=>{ news(s,'Pakistan\'s JF-17 block-III order book grows — Azerbaijan signs for 16 jets.','good'); }},
  {w:1, run:s=>{ news(s,'Imran Khan\'s new letter from jail leaks: "Talk to me or talk to the street."','warn'); }},
];

function queueEvent(s, id){ pendingEvents.push(id); }

function pickRandomEvents(s){
  if (pendingEvents.length > 0) return;
  const roll = Math.random();
  // Kashmir attack: ~7%/month baseline, more when tension high
  const kashP = 0.05 + Math.max(0,(s.militPosture-2))*0.03 + (s.countries.IND.rel.PAK<15?0.02:0);
  if (roll < kashP) { queueEvent(s,'kashmirAttack'); return; }
  if (roll < kashP + 0.04 && (s.countries.AFG.rel.PAK < 20)) { queueEvent(s,'talibanClash'); return; }
  if (roll < kashP + 0.07 && s.date.m >= 6 && s.date.m <= 9 && chance(0.5)) { queueEvent(s,'monsoon'); return; }
  if (roll < kashP + 0.09 && chance(0.3)) { queueEvent(s,'khanHealth'); return; }
  if (roll < kashP + 0.10 && chance(0.25)) { queueEvent(s,'saudRequest'); return; }
  if (roll < kashP + 0.11 && chance(0.15)) { queueEvent(s,'iranStrike'); return; }
  // weighted random flavor
  if (chance(0.65)) {
    const tot = RANDOM_EVENTS.reduce((a,e)=>a+e.w,0);
    let r = Math.random()*tot;
    for (const e of RANDOM_EVENTS){ r -= e.w; if (r<=0){ e.run(s); break; } }
  }
}

/* ============================================================
   ACTIONS — reusable game-scenario mechanics
   Legacy pc/cd fields remain in data for old saves but do not cap actions.
   Treasury outlays are scenario consequences, not availability checks.
   ============================================================ */
const ACTIONS = [
/* ---------------- ECONOMY ---------------- */
{id:'tax_up', cat:'Economy', name:'Raise Taxes / GST', cost:{pc:8},
 desc:'Broaden the GST base, tax retailers & real estate. Revenue up, growth and street mood down.',
 cd:4, fx:s=>{ s.countries.PAK.taxGdp += 0.8; s.econ.compliance += 0.01; s.approval -= 4; s.countries.PAK.growth -= 0.2; news(s,'New taxation measures pass: retail, real estate, digital economy brought into the net.','info'); }},
{id:'tax_cut', cat:'Economy', name:'Cut Taxes (populist)', cost:{pc:4},
 desc:'Relief for the salaried class. Approval up, deficit up, IMF frowns.',
 cd:4, fx:s=>{ s.countries.PAK.taxGdp -= 0.6; s.approval += 5; news(s,'Income tax relief announced for salaried class — cheers in offices, groans in the Finance Ministry.','info'); }},
{id:'subsidy_cut', cat:'Economy', name:'Cut Power & Fuel Subsidies', cost:{pc:10},
 desc:'IMF demand. Saves ~$1.5B/yr; inflation +2-3pts; streets heat up. (Lowers the Subsidy slider sharply.)',
 cd:6, fx:s=>{ s.budget.subsidy = Math.max(0.05, s.budget.subsidy-0.3); s.econ.subsidyCut = true; s.approval -= 7; s.countries.PAK.factions.PTI.power += 3; news(s,'Electricity and petrol prices jump as subsidies are slashed. "Inflation-mare" trends on every platform.','bad'); }},
{id:'imf_tranche', cat:'Economy', name:'Request IMF Tranche', cost:{pc:3},
 desc:'$1.1B if the program is active and reviews are passing.',
 cd:6, avail:s=>s.flags.imfActive, fx:s=>{ s.countries.PAK.reserves += 1.1; news(s,'$1.1B IMF tranche received after staff-level agreement.','good'); }},
{id:'china_swap', cat:'Economy', name:'Expand China Swap Line', cost:{pc:2},
 desc:'+$3B from PBoC. Lifeline — but deepens the Beijing embrace. US notices.',
 cd:6, avail:s=>(s.countries.CHN.rel.PAK||0)>=65, fx:s=>{ s.countries.PAK.reserves += 3; s.countries.CHN.rel.PAK = clamp(s.countries.CHN.rel.PAK+3,0,100); s.countries.USA.rel.PAK -= 3; news(s,'PBoC expands currency swap by $3B — reserves shored up, Washington taking notes.','warn'); }},
{id:'saudi_deposit', cat:'Economy', name:'Request Saudi Deposit', cost:{pc:3},
 desc:'+$2.5B time deposit from Riyadh if relations ≥65.',
 cd:8, avail:s=>(s.countries.SAU.rel.PAK||0)>=65, fx:s=>{ s.countries.PAK.reserves += 2.5; news(s,'Saudi Arabia places $2.5B with the State Bank — the old lifeline holds.','good'); }},
{id:'uae_deposit', cat:'Economy', name:'Request UAE Deposit', cost:{pc:3},
 desc:'+$2B from Abu Dhabi if relations ≥65.',
 cd:8, avail:s=>(s.countries.ARE.rel.PAK||0)>=65, fx:s=>{ s.countries.PAK.reserves += 2; news(s,'UAE rolls over and extends $2B deposit facilities.','good'); }},
{id:'export_push', cat:'Economy', name:'National Export Push (IT + Textiles)', cost:{money:1.0, pc:4},
 desc:'Subsidized credit, expo zones, IT parks. Growth +0.3pts over time, exports +$3B/yr.',
 cd:6, fx:s=>{ s.countries.PAK.growth += 0.3; s.countries.PAK.exports += 3; news(s,'Export push launched: IT export targets raised; special economic zones notified.','good'); }},
{id:'agri_emergency', cat:'Economy', name:'Agriculture Emergency', cost:{money:0.8, pc:3},
 desc:'Fertilizer support, canal lining, wheat procurement reform. Food inflation down.',
 cd:6, fx:s=>{ s.econ.food = clamp(s.econ.food+12,0,100); s.approval += 3; news(s,'Agriculture emergency: support prices and input subsidies announced.','good'); }},
{id:'energy_invest', cat:'Economy', name:'Energy Security Program (Solar + Thar Coal + Dams)', cost:{money:2.0, pc:5},
 desc:'Long-term: import bill down, growth up, energy availability up.',
 cd:10, fx:s=>{ s.econ.energy = clamp(s.econ.energy+15,0,100); s.countries.PAK.imports -= 1.5; s.countries.PAK.growth += 0.2; news(s,'Energy program: 4GW solar tender + Thar expansion + Dasht dam groundbreaking.','good'); }},
{id:'privatize', cat:'Economy', name:'Privatize Loss-Making SOEs (PIA, DISCOs)', cost:{pc:9},
 desc:'Sell the bleeding state enterprises. One-time revenue, unions riot, IMF happy.',
 cd:8, fx:s=>{ if(chance(0.6)){ s.countries.PAK.reserves += 1.0; s.countries.PAK.growth += 0.1; news(s,'PIA and two DISCOs sold to consortiums — $1B in, unions on the streets.','warn'); } else { s.approval -= 4; news(s,'Privatization stalls in Senate and courts after union strikes.','bad'); } }},
{id:'money_print', cat:'Economy', name:'⚠ PRINT MONEY (Emergency)', cost:{pc:2},
 desc:'Monetize the deficit. +$2B now. Inflation +9pts for months. This is how countries die slowly.',
 cd:12, fx:s=>{ s.flags.moneyPrinting = true; s.flags.printMonths = 8; s.countries.PAK.reserves += 2; s.approval -= 3; news(s,'SBP "temporarily" finances the deficit directly — 8 months of printing ahead. Economists issue funerals for the rupee in advance.','bad'); }},
{id:'stop_print', cat:'Economy', name:'End Money Printing (Stabilization)', cost:{pc:8},
 desc:'Shut the printing presses now. Inflation normalizes over months; approval suffers.',
 cd:6, avail:s=>!!s.flags.moneyPrinting, fx:s=>{ s.flags.moneyPrinting = false; s.flags.printMonths = 0; s.approval -= 4; s.countries.PAK.factions.PTI.power += 2; news(s,'Stabilization: SBP halts direct deficit financing. Inflation fight begins; subsidies gone, pain real.','warn'); }},
{id:'austerity', cat:'Economy', name:'Austerity Package', cost:{pc:12},
 desc:'Slash dev, health, education budgets hard. Deficit down, approval down, growth down.',
 cd:10, fx:s=>{ s.budget.dev = Math.max(0.1, s.budget.dev-0.2); s.budget.health = Math.max(0.05, s.budget.health-0.08); s.budget.edu = Math.max(0.05, s.budget.edu-0.08); s.approval -= 6; s.countries.PAK.growth -= 0.3; s.countries.PAK.reserves += 0.3; news(s,'Austerity: development and social budgets slashed. "The state spends less so it can live."','warn'); }},

/* ---------------- DOMESTIC ---------------- */
{id:'pti_talks', cat:'Domestic', name:'Dialogue with PTI / Opposition', cost:{pc:10},
 desc:'Offer a real charter of economy + electoral reform. PTI street power cools; your own base grumbles.',
 cd:6, fx:s=>{ s.flags.ptiDialogue = true; s.countries.PAK.factions.PTI.power -= 8; s.approval += 3; news(s,'Government-PTI talks begin in Parliament House — first time in years. Cautious hope, cynical shrugs.','info'); }},
{id:'pti_crackdown', cat:'Domestic', name:'Crack Down on PTI Protests', cost:{pc:6},
 desc:'Mass arrests, internet shutdowns, Section 144 everywhere. Street power down now;rage stored for later. Western relations hit.',
 cd:4, fx:s=>{ s.flags.ptiCrackdown = true; s.countries.PAK.factions.PTI.power -= 10; s.countries.USA.rel.PAK -= 3; s.countries.GBR.rel.PAK -= 4; s.approval -= 2; news(s,'Mass arrests overnight; internet throttled nationwide. Human Rights Watch statement within the hour.','bad'); }},
{id:'khan_release', cat:'Domestic', name:'Release Imran Khan (bail deal)', cost:{pc:15},
 desc:'The single most popular move available — and a red line for parts of the establishment. approval +8, PTI cools. Coup risk while Munir displeased.',
 cd:99, avail:s=>!s.flags.khanReleased && s.flags.armyPleased, fx:s=>{ s.flags.khanReleased = true; s.countries.PAK.factions.PTI.power -= 15; s.approval += 8; news(s,'Imran Khan walks out of Adiala a free man after a negotiated bail. The country exhales — or holds its breath.','big'); }},
{id:'bla_ops', cat:'Domestic', name:'Intensify Operations vs BLA', cost:{money:0.4, pc:5},
 desc:'Sweep operations in Balochistan. BLA power down; collateral risk; grievances deepen.',
 cd:4, fx:s=>{ s.flags.blaOps = true; if(chance(0.65)){ s.countries.PAK.factions.BLA.power -= 7; news(s,'ISPR: 40+ terrorists killed in Balochistan sweep operations.','info'); } else { s.countries.PAK.factions.BLA.power -= 3; s.approval -= 2; s.countries.USA.rel.PAK -= 1; news(s,'Operations kill civilians in a Zhob raid — footage goes viral, anger compounds.','bad'); } }},
{id:'bla_dev', cat:'Domestic', name:'Balochistan Development Package', cost:{money:1.5, pc:6},
 desc:'Schools, water, jobs, share in Reko Diq revenues. Slow poison for the insurgency — the right kind.',
 cd:10, fx:s=>{ s.flags.blaDev = true; s.countries.PAK.factions.BLA.power -= 5; s.approval += 2; news(s,'Balochistan package: 100 dams, 500 schools, 20% Reko Diq royalty share announced.','good'); }},
{id:'bla_talks', cat:'Domestic', name:'Backchannel with Baloch Moderates', cost:{pc:8},
 desc:'Talks with non-BLA nationalist leadership. Chance of real traction; hawks call it weakness.',
 cd:8, fx:s=>{ if(chance(0.6)){ s.flags.blaTalks = true; s.countries.PAK.factions.BLA.power -= 6; news(s,'Exiled Baloch leaders enter talks through Oman backchannel — first breakthrough in a decade.','good'); } else { news(s,'Moderates demand prisoner release upfront; talks collapse, leaked to BBC Urdu.','warn'); } }},
{id:'ttp_ops', cat:'Domestic', name:'Full-Spectrum Operations vs TTP (KP)', cost:{money:0.6, pc:4},
 desc:'Radd-ul-Fasaad-style clearing operations. TTP down; refugee displacement; KP politics tense.',
 cd:5, fx:s=>{ s.flags.ttpOps = true; s.countries.PAK.factions.TTP.power -= 8; const kp = s.countries.PAK.provinces.find(p=>p.id==='kp'); kp.mood -= 3; news(s,'Operation launched across KP districts: jets, SSG, drones. Displacement camps prepare.','warn'); }},
{id:'sect_jirga', cat:'Domestic', name:'Kurram Peace Jirga & Sectarian De-escalation', cost:{money:0.2, pc:5},
 desc:'Grand jirga, compensation, disarmament of sectarian militias.',
 cd:6, fx:s=>{ s.flags.sectJirga = true; s.countries.PAK.factions.SECT.power -= 7; news(s,'Grand jirga signs Kurram peace accord; highways reopen after months.','good'); }},
{id:'unity_campaign', cat:'Domestic', name:'National Unity Campaign', cost:{money:0.3, pc:8},
 desc:'Flag, schools, cricket, anthem — build Pakistani identity above party and sect. Slow, real.',
 cd:8, fx:s=>{ s.approval += 4; s.countries.PAK.factions.SECT.power -= 2; s.stability += 2; news(s,'"One Nation" campaign launches: curriculum reform, national service pilot, cricket diplomacy.','good'); }},
{id:'police_reform', cat:'Domestic', name:'Police & Judiciary Reform', cost:{money:0.6, pc:10},
 desc:'Depoliticize police, digitize courts. Slow stability gains that compound.',
 cd:10, fx:s=>{ s.stability += 4; s.econ.compliance += 0.02; news(s,'Police reform ordinance + e-courts rollout — the boring reforms that fix countries.','good'); }},
{id:'media_tighten', cat:'Domestic', name:'Tighten Media Regulation', cost:{pc:6},
 desc:'PECA enforcement, channel mergers. Stability up, press freedom down, West grumbles.',
 cd:6, fx:s=>{ s.flags.mediaCrackdown = true; s.approval -= 2; s.countries.USA.rel.PAK -= 2; s.countries.GBR.rel.PAK -= 2; news(s,'PECA amendments empower FIA over "fake news" — journalists call it the gagging law.','warn'); }},

/* ---------------- MILITARY ---------------- */
{id:'jf17', cat:'Military', name:'Order JF-17 Block III Squadron (16 jets)', cost:{money:0.9, pc:2},
 desc:'$56M/jet with AESA, PL-15E, helmet sight. Also exports — joint production with Chengdu.',
 cd:8, fx:s=>{ s.countries.PAK.aircraft += 16; s.countries.PAK.air += 0; s.countries.CHN.rel.PAK = clamp(s.countries.CHN.rel.PAK+2,0,100); news(s,'16 JF-17 Block III join PAF; PAC Kamra delivery line hums.','good'); }},
{id:'airdef', cat:'Military', name:'Acquire HQ-19 / Medium Air Defense', cost:{money:1.2, pc:2},
 desc:'Chinese SAM umbrella for cities & strategic assets. Indian deep-strike plans degrade.',
 cd:8, fx:s=>{ s.milAirDef = (s.milAirDef||0)+1; news(s,'HQ-19 batteries operationalized around Islamabad, Sargodha, Karachi.','good'); }},
{id:'hangor', cat:'Military', name:'Hangor-Class Submarine Installment', cost:{money:0.7, pc:2},
 desc:'8 subs on order from China; first deliveries ~2028. Sea denial vs Indian Navy.',
 cd:6, fx:s=>{ news(s,'Hangor program installment paid; keel-laying at Karachi Shipyards accelerates.','good'); }},
{id:'drones', cat:'Military', name:'Buy Turkish UCAVs (Bayraktar/Anka-3)', cost:{money:0.4, pc:2},
 desc:'Loitering munitions + strike drones. Turkey relationship deepens.',
 cd:6, fx:s=>{ s.countries.PAK.aircraft += 4; s.countries.TUR.rel.PAK = clamp(s.countries.TUR.rel.PAK+5,0,100); news(s,'Bayraktar TB2s + Akinci delivered; joint production facility for Pakistan announced.','good'); }},
{id:'f16_up', cat:'Military', name:'F-16 Sustainment & Upgrade (US)', cost:{money:0.5, pc:2},
 desc:'Keep the Vipers deadly. Requires US relations ≥ 45.',
 cd:8, avail:s=>(s.countries.USA.rel.PAK||0)>=45, fx:s=>{ news(s,'US approves F-16 sustainment package — missiles, radars, spares flow again.','good'); }},
{id:'tank_batch', cat:'Military', name:'Al-Khalid II Tank Batch', cost:{money:0.5, pc:1},
 desc:'Indigenous MBT production at Taxila. Armor modernization continues.',
 cd:6, fx:s=>{ s.countries.PAK.tanks += 50; news(s,'50 Al-Khalid II MBTs roll out of Heavy Industries Taxila.','good'); }},
{id:'missile_test', cat:'Military', name:'Test Strategic Missile (Ababeel/Shaheen-III)', cost:{money:0.1, pc:3},
 desc:'MIRV test. Deterrence message to New Delhi. India reacts; US "concerned".',
 cd:6, fx:s=>{ s.flags.nukeTest = true; s.countries.IND.rel.PAK -= 6; s.countries.USA.rel.PAK -= 3; news(s,'STRATCOM test-fires Ababeel MIRV missile — full trajectory success, ISPR video released.','warn'); }},
{id:'def_budget_up', cat:'Military', name:'Raise Defense Budget +20%', cost:{pc:8},
 desc:'Readiness and procurement climb; deficit climbs too. Army pleased. (Raises the Defense slider.)',
 cd:12, fx:s=>{ s.budget.defense += 0.15; s.countries.PAK.defense = s.budget.defense*12; s.readiness = clamp(s.readiness+0.05,0,0.98); news(s,'Defense allocation up — new money for the Rocket Force Command and PAF munitions stockpile.','warn'); }},
{id:'exercises', cat:'Military', name:'Joint Exercises (choose partner)', cost:{money:0.1, pc:3},
 desc:'Drills with China, Saudi Arabia or Türkiye. Relations up, interoperability up.',
 cd:5, target:'exercisePartner', fx:s=>{ const p = s._exTarget || 'CHN'; s.countries[p].rel.PAK = clamp(s.countries[p].rel.PAK+5,0,100); news(s,'Exercise "Indus '+p+'" concludes — air, land and naval components rehearse together.','info'); }},
{id:'posture_up', cat:'Military', name:'Raise Border Posture vs India', cost:{money:0.3, pc:4},
 desc:'Deployments forward, alert level up. India mirrors. Crisis risk rises.',
 cd:4, avail:s=>s.militPosture<5, fx:s=>{ s.militPosture = Math.min(5, s.militPosture+1); s.countries.IND.rel.PAK -= 4; news(s,'Forward posture ordered along the LoC and Working Boundary — leaves cancelled, reserves alerted.','warn'); }},
{id:'posture_down', cat:'Military', name:'De-escalate Border Posture', cost:{pc:2},
 desc:'Stand down, save money, lower crisis temperature.',
 cd:4, avail:s=>s.militPosture>1, fx:s=>{ s.militPosture = Math.max(1, s.militPosture-1); s.countries.IND.rel.PAK += 3; news(s,'Troops return to peacetime stations; confidence-building hotline reactivated.','info'); }},
{id:'mobilize', cat:'Military', name:'Partial Mobilization of Reserves', cost:{money:0.8, pc:5},
 desc:'Call up ~100k reservists. Readiness surges; economy bleeds; families anxious.',
 cd:6, fx:s=>{ s.readiness = clamp(s.readiness+0.12,0,0.98); s.countries.PAK.growth -= 0.2; s.countries.IND.rel.PAK -= 6; news(s,'100,000 reservists called up; cantonments fill; trains move armor at night.','war'); }},

/* ---------------- INTELLIGENCE (ISI) ---------------- */
{id:'net_expand_ind', cat:'Intel', name:'Expand Network: India', cost:{money:0.3, pc:4},
 desc:'RAW penetrations, Kashmir contacts, New Delhi assets. Heat rises.',
 cd:4, fx:s=>{ const n=s.intel.networks.IND; n.lvl=Math.min(8,n.lvl+1); n.heat+=1.5; news(s,'ISI India desk expands: new assets in place. Every level is a story someone may someday tell.','warn'); }},
{id:'net_expand_afg', cat:'Intel', name:'Expand Network: Afghanistan', cost:{money:0.2, pc:3},
 desc:'Tribal assets, Emirate insiders, TTP-tracking. Your best network already.',
 cd:4, fx:s=>{ const n=s.intel.networks.AFG; n.lvl=Math.min(8,n.lvl+1); n.heat+=1; news(s,'Afghan network reinforced — tribal assets and Emirate insiders activated.','warn'); }},
{id:'net_expand_usa', cat:'Intel', name:'Expand Network: USA (High Risk)', cost:{money:0.4, pc:6},
 desc:'Washington policy circles, diaspora, contractors. If burned, relations crater.',
 cd:6, fx:s=>{ const n=s.intel.networks.USA; n.lvl=Math.min(8,n.lvl+1); n.heat+=2.5; news(s,'US network grows. Note from experience: the last time this burned, a prime minister fell.','warn'); }},
{id:'covert_sabotage', cat:'Intel', name:'Covert Op: Sabotage (choose target)', cost:{money:0.25, pc:6},
 desc:'Infrastructure/supply sabotage in a rival\'s restive region. Blowback if exposed.',
 cd:5, target:'covertTarget', fx:s=>{ const t=s._opTarget; const n=s.intel.networks[t]; const lvl=n?n.lvl:1; const ok = chance(0.35+lvl*0.08); const T=s.countries[t]; if(ok){ news(s,'Covert sabotage succeeds in '+(T?T.name:t)+' — "mysterious" explosion, no claim, no trail.','warn'); if(T) T.rel.PAK = clamp(T.rel.PAK-5,-100,100); if(t==='IND') s.countries.PAK.factions.BLA.power -= 1; } else { n && (n.heat+=3); if(T) T.rel.PAK = clamp(T.rel.PAK-10,-100,100); news(s,'Operation compromised — assets arrested in '+(T?T.name:t)+'. Their media names the "Pakistani hand".','bad'); } }},
{id:'covert_disinfo', cat:'Intel', name:'Covert Op: Influence Campaign', cost:{money:0.15, pc:4},
 desc:'Narrative ops abroad — think tanks, influencers, diaspora media.',
 cd:4, target:'covertTarget', fx:s=>{ const t=s._opTarget; const T=s.countries[t]; const n=s.intel.networks[t]; const ok=chance(0.5+(n?n.lvl:1)*0.06); if(ok && T){ T.rel.PAK = clamp(T.rel.PAK+5,-100,100); news(s,'Influence operation shifts elite opinion in '+(T?T.name:t)+' — editorials soften toward Islamabad.','good'); } else { news(s,'Influence campaign is exposed by an investigative outlet — "foreign influence network" headlines.','bad'); if(T) T.rel.PAK = clamp(T.rel.PAK-4,-100,100); } }},
{id:'covert_cyber', cat:'Intel', name:'Covert Op: Cyber Strike', cost:{money:0.2, pc:5},
 desc:'Grid/financial/government network intrusion. Attribution risk; escalation risk.',
 cd:5, target:'covertTarget', fx:s=>{ const t=s._opTarget; const T=s.countries[t]; const ok=chance(0.45); if(ok){ news(s,'Cyber intrusion succeeds against '+(T?T.name:t)+' systems — data exfiltrated quietly.','warn'); if(t==='IND') s.countries.PAK.factions.BLA.power -= 2; } else { if(T) T.rel.PAK = clamp(T.rel.PAK-8,-100,100); news(s,'Cyber op attributed in days — '+(T?T.name:t)+' protests formally, threatens retaliation in kind.','bad'); } }},
{id:'counterintel', cat:'Intel', name:'Counter-Espionage Sweep at Home', cost:{money:0.15, pc:3},
 desc:'Hunt foreign assets (RAW/CIA/Mossad) inside Pakistan. Keeps your secrets yours.',
 cd:5, fx:s=>{ news(s,'Counter-intel sweep nets '+(chance(0.5)?'a RAW-supported network in Sindh':'a CIA-contacted bureaucrat')+' — quietly charged, quietly jailed.','info'); }},
{id:'liaison_usa', cat:'Intel', name:'ISI-CIA Liaison Deepening', cost:{pc:4},
 desc:'Intelligence sharing on Afghan/Khorasan threat. Warms Washington; irritates Beijing slightly.',
 cd:8, fx:s=>{ s.countries.USA.rel.PAK = clamp(s.countries.USA.rel.PAK+5,0,100); s.countries.CHN.rel.PAK = clamp(s.countries.CHN.rel.PAK-2,0,100); news(s,'ISI-CIA director-level meeting in a Gulf capital — Afghan files on the table.','info'); }},
{id:'liaison_chn', cat:'Intel', name:'ISI-MSS Liaison Deepening', cost:{pc:4},
 desc:'Security of CPEC, shared concerns. Warms Beijing; alarms Washington.',
 cd:8, fx:s=>{ s.countries.CHN.rel.PAK = clamp(s.countries.CHN.rel.PAK+5,0,100); s.countries.USA.rel.PAK = clamp(s.countries.USA.rel.PAK-2,0,100); news(s,'ISI-MSS protocol signed: CPEC asset protection and "shared threat" exchange.','info'); }},

/* ---------------- FOREIGN POLICY ---------------- */
{id:'visit', cat:'Foreign', name:'State Visit & Charm Offensive (choose country)', cost:{money:0.05, pc:4},
 desc:'Presidential-level visit. Relations +6-10 depending on chemistry.',
 cd:3, target:'diploTarget', fx:s=>{ const t=s._dipTarget; const T=s.countries[t]; if(T){ const d=Math.floor(rnd(6,11)); T.rel.PAK=clamp((T.rel.PAK||0)+d,-100,100); news(s,'State visit to '+(T?T.name:t)+' — guard of honor, MoUs signed, '+(T?T.flag:'')+' relationship warmed by +'+d+'.','good'); } }},
{id:'trade_deal', cat:'Foreign', name:'Negotiate Trade Agreement (choose country)', cost:{money:0.1, pc:6},
 desc:'Tariff cuts + market access. Exports up; partner relations up.',
 cd:6, target:'diploTarget', fx:s=>{ const t=s._dipTarget; const T=s.countries[t]; if(T){ T.rel.PAK=clamp((T.rel.PAK||0)+6,-100,100); s.countries.PAK.exports += 1.5; news(s,'Preferential trade agreement with '+(T?T.name:t)+' — exports get new market access.','good'); } }},
{id:'kashmir_un', cat:'Foreign', name:'Raise Kashmir at UN/OIC', cost:{pc:5},
 desc:'Resolutions, special envoys. Domestic approval up; India furious; West wary.',
 cd:6, fx:s=>{ s.countries.IND.rel.PAK -= 6; s.approval += 3; news(s,'OIC-IPHRC resolution on Kashmir passes; India calls it "hostile propaganda". Domestic front applauds.','info'); }},
{id:'india_backchannel', cat:'Foreign', name:'India Backchannel: Trade & LoC Truce', cost:{pc:8},
 desc:'Quiet channel via Dubai. Trade normalization, ceasefire reinforcement. Hawks in both capitals seethe.',
 cd:8, fx:s=>{ if(chance(0.55)){ s.countries.IND.rel.PAK = clamp(s.countries.IND.rel.PAK+12,-100,100); s.militPosture = Math.max(1,s.militPosture-1); news(s,'Backchannel succeeds: LoC truce reaffirmed, indirect trade via Dubai resumes.','good'); } else { news(s,'Backchannel leaks — opposition screams "sellout", India denies everything.','warn'); s.pc -= 3; } }},
{id:'afg_pressure', cat:'Foreign', name:'Pressure Kabul on TTP Sanctuaries', cost:{pc:5},
 desc:'Diplomatic + economic squeeze on the Emirate to act against TTP.',
 cd:6, fx:s=>{ s.countries.AFG.rel.PAK -= 8; if(chance(0.5)){ s.countries.PAK.factions.TTP.power -= 5; news(s,'Kabul quietly relocates several TTP leaders after your demarche — pressure works, for now.','good'); } else { news(s,'Kabul denies everything, calls TTP an "internal Pakistani matter".','bad'); } }},
{id:'afg_trade', cat:'Foreign', name:'Expand Afghanistan Trade & Transit', cost:{money:0.1, pc:3},
 desc:'Transit trade, rail feasibility, banking channels. Softens the Emirate; feeds Karzai-era commerce.',
 cd:6, fx:s=>{ s.countries.AFG.rel.PAK = clamp(s.countries.AFG.rel.PAK+10,-100,100); s.countries.PAK.exports += 0.5; news(s,'Transit trade agreement expanded; Torkham 24/7 operations announced.','info'); }},
{id:'iran_pipe', cat:'Foreign', name:'Iran Gas Pipeline / Border Trade Revival', cost:{pc:7},
 desc:'Activate the long-dead peace pipeline talk + Gabd-Reemdar. Tehran delighted; US sanctions warnings.',
 cd:10, fx:s=>{ s.countries.IRN.rel.PAK = clamp(s.countries.IRN.rel.PAK+12,-100,100); s.countries.USA.rel.PAK -= 6; news(s,'Iran pipeline talks resume; Washington threatens CAATSA warnings within a week.','warn'); }},
{id:'us_coop', cat:'Foreign', name:'Offer US: Minerals + Afghan Cooperation', cost:{pc:5},
 desc:'Rare earths deal + counter-terror help. Washington pays in goodwill & market access.',
 cd:8, avail:s=>(s.countries.USA.rel.PAK||0)>=30, fx:s=>{ s.countries.USA.rel.PAK = clamp(s.countries.USA.rel.PAK+10,0,100); s.countries.PAK.reserves += 0.5; news(s,'US-Pakistan minerals MoU signed — critical reserves for investment; Balochistan stakeholders watching.','good'); }},
{id:'brics_track', cat:'Foreign', name:'Pursue BRICS Membership Track', cost:{pc:8},
 desc:'Apply via China/Russia sponsorship. De-dollarization vibes; Washington and New Delhi both react.',
 cd:12, fx:s=>{ s.countries.RUS.rel.PAK = clamp(s.countries.RUS.rel.PAK+6,0,100); s.countries.CHN.rel.PAK = clamp(s.countries.CHN.rel.PAK+4,0,100); s.countries.USA.rel.PAK -= 6; s.countries.IND.rel.PAK -= 4; news(s,'BRICS membership application lodged through Beijing and Moscow. Treasury studies non-dollar settlement pilots.','warn'); }},
{id:'palestine_stance', cat:'Foreign', name:'Lead OIC Stance on Palestine', cost:{pc:5},
 desc:'Recognition, reconstruction fund, aid corridor. Muslim world applauds; US/Israel relations chill.',
 cd:8, fx:s=>{ s.approval += 4; s.countries.PSE.rel.PAK = 95; s.countries.JOR.rel.PAK = clamp(s.countries.JOR.rel.PAK+5,-100,100); s.countries.EGY.rel.PAK = clamp(s.countries.EGY.rel.PAK+5,-100,100); s.countries.USA.rel.PAK -= 4; news(s,'You announce a $500M Gaza reconstruction fund and demand recognition votes — OIC leadership is yours for the moment.','good'); }},

/* ---------------- NUCLEAR ---------------- */
{id:'nuke_expand', cat:'Nuclear', name:'Expand Warhead Program (Covert)', cost:{money:0.6, pc:8},
 desc:'+ warheads/pits, new fissile runs. Detection risk: US intel may leak — sanctions risk.',
 cd:10, fx:s=>{ s.countries.PAK.nu += 6; if(chance(0.35)){ s.countries.USA.rel.PAK -= 6; news(s,'US intel community assesses Pakistan expanded fissile production — a leaked report makes waves.','warn'); } else news(s,'Strategic Plans Division quietly expands the arsenal. Only a few hundred people know.','warn'); }},
{id:'nuke_doctrine', cat:'Nuclear', name:'Shift to Full-Spectrum Deterrence', cost:{pc:10},
 desc:'Formalize battlefield-nuclear options vs Indian conventional invasion. Delhi cries escalation; your deterrence hardens.',
 cd:99, fx:s=>{ s.flags.fullSpectrum = true; s.countries.IND.rel.PAK -= 8; s.countries.USA.rel.PAK -= 4; news(s,'Doctrine formally shifts to full-spectrum deterrence. Arms-control circles warn of "stability-instability paradox" deepening.','warn'); }},
{id:'nca_audit', cat:'Nuclear', name:'NCA Command & Control Audit', cost:{money:0.05, pc:3},
 desc:'Permissive Action Links, personnel reliability, succession drills. Nothing to see here — good.',
 cd:12, fx:s=>{ news(s,'NCA audit complete: PAL systems, PDR drills and succession protocols refreshed. SPD reassures everyone by saying nothing.','info'); }}
];

const FIXED_ACTION_TARGETS = {
  net_expand_ind:'IND', net_expand_afg:'AFG', net_expand_usa:'USA',
  liaison_usa:'USA', liaison_chn:'CHN', counterintel:'PAK',
  india_backchannel:'IND', afg_pressure:'AFG', afg_trade:'AFG',
  iran_pipe:'IRN', us_coop:'USA', palestine_stance:'PSE'
};
function actionTargetCountry(s,a){
  if (a.target==='covertTarget') return s._opTarget || 'IND';
  if (a.target==='diploTarget') return s._dipTarget || 'CHN';
  if (a.target==='exercisePartner') return s._exTarget || 'CHN';
  return FIXED_ACTION_TARGETS[a.id] || null;
}
function bumpInnerRelation(s,key,delta){
  const relations = s.innerInfluence && s.innerInfluence.relationships;
  if (!relations || !Number.isFinite(Number(relations[key]))) return;
  relations[key] = clamp(Number(relations[key]) + delta, 0, 100);
}
function updateInnerInfluenceFromAction(s,a){
  const blueprint = PAK_PROJECT_BLUEPRINTS[a.id];
  if (blueprint && blueprint.regionId) bumpInnerRelation(s, blueprint.regionId, Math.max(1, blueprint.supportLift/2));
  if (a.id==='energy_invest' || a.id==='unity_campaign' || a.id==='police_reform'){
    for (const region of PAK_INFLUENCE.regions) bumpInnerRelation(s, region.id, a.id==='energy_invest'?0.5:0.75);
  }
  if (a.cat==='Military'){
    const boost = a.id==='def_budget_up' ? 4 : 1.5;
    bumpInnerRelation(s,'army',boost);
    if (['jf17','airdef','drones','f16_up'].includes(a.id)) bumpInnerRelation(s,'air',3);
    else if (a.id==='hangor') bumpInnerRelation(s,'navy',4);
    else { bumpInnerRelation(s,'air',0.5); bumpInnerRelation(s,'navy',0.5); }
    if (a.cost.money) bumpInnerRelation(s,'bank',-0.5);
  }
  if (['tax_up','austerity','imf_tranche','stop_print','privatize'].includes(a.id)) bumpInnerRelation(s,'bank',2.5);
  if (['tax_cut','money_print','subsidy_cut'].includes(a.id)) bumpInnerRelation(s,'bank',-2);
  if (a.id==='agri_emergency'){
    bumpInnerRelation(s,'punjab',2);
    bumpInnerRelation(s,'sindh',1);
  }
  if (a.id==='pti_talks') for (const region of PAK_INFLUENCE.regions) bumpInnerRelation(s,region.id,0.75);
  if (a.id==='ttp_ops') bumpInnerRelation(s,'kp',-1);
  if (a.id==='bla_ops') bumpInnerRelation(s,'balochistan',-1);
}
function innerInfluenceTick(s){
  if (!s.innerInfluence || !s.innerInfluence.relationships) return;
  const r = s.innerInfluence.relationships, P = s.countries.PAK;
  const defenseDrift = clamp((s.budget.defense-0.72)*0.7,-0.5,0.5);
  const stabilityDrift = clamp((s.stability-50)*0.012,-0.5,0.5);
  bumpInnerRelation(s,'army',defenseDrift+stabilityDrift);
  bumpInnerRelation(s,'air',defenseDrift+(s.readiness-0.65)*0.6);
  bumpInnerRelation(s,'navy',defenseDrift*0.8);
  bumpInnerRelation(s,'bank',clamp((P.reserves-15.5)*0.015-Math.max(0,P.infl-7)*0.025,-0.6,0.6));
  for (const leader of PAK_INFLUENCE.regions){
    const province = P.provinces.find(p=>p.id===leader.provinceId);
    if (province) bumpInnerRelation(s,leader.id,clamp((province.mood-50)*0.012,-0.6,0.6));
  }
}
function recordActionArtifacts(s,a,outcome){
  const targetIso = actionTargetCountry(s,a);
  if (a.cat==='Intel'){
    s.ops.unshift({id:`${a.id}-${s.date.y}-${s.date.m}-${s.log.length+1}`, date:dateStr(s), actionId:a.id,
      name:a.name, countryIso:targetIso || 'PAK', outcome, simulationOnly:true});
    if (s.ops.length>100) s.ops.pop();
  }
  const blueprint = PAK_PROJECT_BLUEPRINTS[a.id];
  if (blueprint){
    s.projects.unshift({id:`${a.id}-${s.date.y}-${s.date.m}-${s.log.length+1}`, date:dateStr(s), actionId:a.id,
      name:blueprint.title, sector:blueprint.sector, type:'scheme', countryIso:'PAK', regionId:blueprint.regionId,
      approvalAtLaunch:clamp(s.approval,0,100), supportLift:blueprint.supportLift, horizon:blueprint.horizon, outcome});
  } else if ((a.cat==='Foreign' || a.id==='exercises') && targetIso && targetIso!=='PAK'){
    s.projects.unshift({id:`${a.id}-${s.date.y}-${s.date.m}-${s.log.length+1}`, date:dateStr(s), actionId:a.id,
      name:a.name, sector:a.cat==='Foreign'?'Diplomatic initiative':'Joint exercise', type:'initiative',
      countryIso:targetIso, regionId:null, approvalAtLaunch:clamp(s.approval,0,100), supportLift:0, horizon:0, outcome});
  }
  if (s.projects.length>100) s.projects.pop();
}

/* Scenario preconditions; no political-capital, cash-balance or cooldown cap. */
function actionAvailable(s, a){
  if (s.gameOver) return false;
  return !a.avail || !!a.avail(s);
}
function doAction(s, a){
  // Legacy political-capital and cooldown fields are ignored; spending affects the scenario only.
  s.countries.PAK.reserves -= a.cost.money || 0;
  const newsCount = s.news.length;
  a.fx(s);
  const outcome = s.news.length>newsCount && s.news[0] ? s.news[0].t : a.desc;
  updateInnerInfluenceFromAction(s,a);
  recordActionArtifacts(s,a,outcome);
  s.log.unshift({d:dateStr(s), t:'Issued: ' + a.name});
}

/* ============================================================
   MONTHLY TURN RESOLUTION
   ============================================================ */
function endMonth(s){
  // apply pending actions were already applied on click; now simulate
  s.date.m++;
  if (s.date.m > 12){ s.date.m = 1; s.date.y++; }

  econTick(s);
  stabTick(s);
  innerInfluenceTick(s);
  milTick(s);
  intelTick(s);
  aiTick(s);
  warTick(s);
  if (!s.gameOver) pickRandomEvents(s);

  // monthly summary
  const P = s.countries.PAK;
  news(s, `📈 ${dateStr(s)} close — GDP ${fmtB(P.gdp)}, growth ${P.growth.toFixed(1)}%, inflation ${P.infl.toFixed(1)}%, reserves ${fmtB(P.reserves)}, rupee ${P.fx.toFixed(0)}, debt/GDP ${P.debtGdp.toFixed(0)}%`, 'stats');

  saveGame();
  render();
}

/* expose for UI */
window.G = { newGame, saveGame, loadGame, endMonth, doAction, actionAvailable,
  getState:()=>state, setSelected:v=>selectedISO=v, ACTIONS, EVENTS, news, combatPower, powerScore,
  monthlyRevenue, monthlySpend, monthlyDebtService, relLabel, stabLabel,
  getPending:()=>pendingEvents, shiftPending:()=>pendingEvents.shift() };
