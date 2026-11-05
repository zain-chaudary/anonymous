/* ============================================================
   WORLD LEADER 2026 — UI v2
   Government dashboard + world map + power rankings
   ============================================================ */

const CATS = ['Economy','Domestic','Military','Intel','Foreign','Nuclear'];
const BUDGET_META = [
  {key:'defense',  label:'🪖 Defense',           min:0.2, max:2.0, note:'Army, PAF, Navy, missiles. Drives readiness & power.'},
  {key:'dev',      label:'🏗 Development',        min:0.0, max:1.5, note:'Infrastructure, CPEC projects, energy. Drives growth.'},
  {key:'health',   label:'🏥 Health',             min:0.0, max:0.8, note:'Hospitals, polio drive. Drives approval.'},
  {key:'edu',      label:'🎓 Education',          min:0.0, max:0.8, note:'Schools, universities. Drives long-term growth & approval.'},
  {key:'interior', label:'🚔 Interior & Police',  min:0.05,max:0.8, note:'Police, CTD, Rangers. Squeezes TTP & BLA.'},
  {key:'subsidy',  label:'⚡ Subsidies',          min:0.0, max:1.5, note:'Power & fuel relief. Popular — and expensive. Cutting raises inflation.'},
  {key:'admin',    label:'🏛 Government & Admin', min:0.2, max:1.2, note:'Salaries, courts, ministries. Cutting too far breeds corruption.'}
];

function esc(x){ return String(x).replace(/</g,'&lt;'); }
/* clean number style: 1455k troops → "1.46M" */
const fmtMen = k => k>=1000 ? (k/1000).toFixed(2)+'M' : k+'k';
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1800);
}
const flag = iso => (G.getState().countries[iso] && G.getState().countries[iso].flag) || '🏳';

/* ============ HOME: TOP CHIPS ============ */
function renderChips(s){
  const P = s.countries.PAK;
  document.getElementById('date').textContent = '📅 ' + dateStr(s);
  const chip = (k,v,cls='') => `<span class="chip ${cls}">${k} <b>${v}</b></span>`;
  document.getElementById('topchips').innerHTML =
    chip('❤️ Approval', s.approval.toFixed(0)+'%', s.approval<35?'bad':s.approval>55?'good':'') +
    chip('🏦 Reserves', fmtB(P.reserves), P.reserves<6?'bad':'good') +
    chip('💰 GDP', fmtB(P.gdp)) +
    chip('📈 Inflation', P.infl.toFixed(1)+'%', P.infl>10?'bad':'') +
    chip('☢', P.nu, 'nuke') +
    (s.war ? chip('⚔ WAR', s.countries[s.war.enemy].flag, 'bad') : '');
}

/* ============ TAB: MY GOVERNMENT ============ */
function tabGov(s){
  const P = s.countries.PAK;
  const publicMil = MIL_2026.PAK;
  const supPct = clamp(s.approval, 0, 100);
  const supM = (supPct/100*P.pop).toFixed(0);
  const agM = ((100-supPct)/100*P.pop).toFixed(0);
  const rev = G.monthlyRevenue(s), spend = G.monthlySpend(s), bal = rev - spend;
  const ds = G.monthlyDebtService(s);

  let warcard = '';
  if (s.war){
    const w = s.war;
    warcard = `<div class="card warcard"><h3>⚔ WAR vs ${s.countries[w.enemy].flag} ${s.countries[w.enemy].name} — month ${w.months}</h3>
      <div class="ministat">
        <div>Your losses <b>${w.lossesYou.toLocaleString()}</b></div>
        <div>Their losses <b>${w.lossesThem.toLocaleString()}</b></div>
        <div>World pressure <b class="${w.intlPressure>70?'bad':''}">${w.intlPressure.toFixed(0)}/100</b></div>
      </div>
      ${Object.values(w.fronts).map(f=>`
        <div class="faction"><div class="frow"><b>${f.name}</b><span class="${f.ctl<0.4?'bad':f.ctl>0.6?'good':''}">${(f.ctl*100).toFixed(0)}% yours</span></div>
        <div class="bar"><i class="${f.ctl<0.4?'red':f.ctl>0.6?'green':'orange'}" style="width:${f.ctl*100}%"></i></div></div>`).join('')}
      <div class="note">☠ If 3+ fronts collapse, the nuclear brief lands on your desk.</div></div>`;
  }

  return `
  <div class="card prescard">
    <div class="presrow">
      <div class="presflag">🇵🇰</div>
      <div class="presid">
        <div class="presname">President <span>Zain Chaudary</span></div>
        <div class="muted small">Islamic Republic of Pakistan · 241.5M people · Commander-in-Chief</div>
      </div>
      <div class="presdate">${dateStr(s)}</div>
    </div>
    <div class="support">
      <div class="frow"><b>✅ Supporting you</b><span>~${supM}M people (${supPct.toFixed(0)}%)</span></div>
      <div class="bar bigbar"><i class="green" style="width:${supPct}%"></i></div>
      <div class="frow"><b>❌ Against you</b><span>~${agM}M people (${(100-supPct).toFixed(0)}%)</span></div>
      <div class="bar bigbar"><i class="red" style="width:${100-supPct}%"></i></div>
    </div>
  </div>

  <div class="grid2">
    <div class="card">
      <h3>🏦 Treasury</h3>
      <div class="bigstat"><span>Government bank — money you can use</span><b class="${P.reserves<6?'bad':'good'}">${fmtB(P.reserves)}</b></div>
      <div class="bigstat"><span>Total loans to pay back</span><b class="warn">${fmtB(P.extDebt)}</b></div>
      <div class="ministat">
        <div>Debt/GDP <b>${P.debtGdp.toFixed(0)}%</b></div>
        <div>Reserve cover <b class="${P.reserves/(P.imports/12)<2?'bad':'good'}">${(P.reserves/(P.imports/12)).toFixed(1)} months</b></div>
        <div>IMF <b>${s.flags.imfActive?'Active':'None'}</b></div>
      </div>
    </div>
    <div class="card">
      <h3>📅 This Month's Money</h3>
      <div class="bigstat"><span>Monthly revenue (taxes etc.)</span><b class="good">+${fmtB(rev)}</b></div>
      <div class="bigstat"><span>Monthly spending (budgets below)</span><b class="warn">−${fmtB(spend)}</b></div>
      <div class="bigstat"><span>Balance this month</span><b class="${bal>=0?'good':'bad'}">${bal>=0?'+':''}${fmtB(bal)}</b></div>
      <div class="muted small">incl. debt interest ${fmtB(ds)}${s.war?' + war costs':''}. Surplus pays debt & fills the bank; overdraft = new loans.</div>
    </div>
  </div>

  <div class="card">
    <h3>🎖 Pakistan military — public-source reference</h3>
    <div class="ministat personnel public-reference">
      <div>👥 Active force · GFP 2026 <b>${publicPeople(publicMil.active)}</b></div>
      <div>🎖 Reserve estimate · GFP 2026 <b>${publicPeople(publicMil.reserve)}</b></div>
      <div>🧑 Annual age cohort · GFP 2026 <b>${publicCount(publicMil.age)}</b></div>
      <div>🛡 Tanks · GFP 2026 <b>${publicCount(publicMil.land.tanks[0])}</b></div>
      <div>✈ Aircraft · GFP 2026 <b>${publicCount(publicMil.air.total[0])}</b></div>
      <div>⚓ Fleet assets · GFP 2026 <b>${publicCount(publicMil.navy.total)}</b></div>
      <div>☢ Warheads · SIPRI Jan 2026 <b>${publicCount(SIPRI_NUCLEAR_2026.PAK)}</b></div>
    </div>
    <div class="note tiny">Reference estimates are separate from the simulation. The annual age cohort is not the number fit or eligible to enlist; GFP reserve totals exclude paramilitary forces. Open Military for definitions, equipment categories and source links.</div>
    <h4 class="popsub">🎮 Game scenario baseline (simulation only)</h4>
    <div class="ministat army">
      <div>👥 Troops <b>${P.troops.toLocaleString()}k</b></div>
      <div>🛡 Tanks <b>${P.tanks.toLocaleString()}</b></div>
      <div>✈ Aircraft <b>${P.aircraft}</b></div>
      <div>🚢 Ships <b>${P.ships}</b></div>
      <div>☢ Scenario variable <b>${P.nu}</b></div>
      <div>💵 Defense budget/yr <b>$${P.defense.toFixed(1)}B</b></div>
    </div>
    <div class="frow small"><b>Game readiness</b><span>${(s.readiness*100).toFixed(0)}%</span></div>
    <div class="bar"><i class="${s.readiness>0.6?'green':'orange'}" style="width:${s.readiness*100}%"></i></div>
    <div class="frow small"><b>Border posture vs India</b><span>${'▮'.repeat(s.militPosture)}${'▯'.repeat(5-s.militPosture)}</span></div>
    <div class="muted tiny">These lower-row counts and bars are game mechanics, not current national inventory or readiness.</div>
  </div>

  ${warcard}

  <div class="card">
    <h3>🎚 Ministry Budgets — monthly ($B) <span class="muted small">drag to change · affects everything</span></h3>
    <div class="budgets">
      ${BUDGET_META.map(m=>`
        <div class="brow">
          <div class="blabel"><b>${m.label}</b><div class="muted tiny">${m.note}</div></div>
          <div class="bctl">
            <button class="btn mini" onclick="bump('${m.key}',-0.05)">−</button>
            <input type="range" min="${m.min}" max="${m.max}" step="0.01" value="${s.budget[m.key]}"
                   oninput="setBudget('${m.key}', this.value)">
            <button class="btn mini" onclick="bump('${m.key}',0.05)">+</button>
            <b class="bval" id="bv_${m.key}">$${s.budget[m.key].toFixed(2)}B</b>
          </div>
        </div>`).join('')}
      <div class="brow fixed">
        <div class="blabel"><b>💳 Debt interest (auto)</b><div class="muted tiny">5.5% avg on ${fmtB(P.extDebt)} external debt</div></div>
        <b class="bval">$${ds.toFixed(2)}B</b>
      </div>
    </div>
    <div class="balanceline" id="balanceline">${balanceLine(s)}</div>
  </div>

  <div class="grid2">
    <div class="card">
      <h3>🔥 Internal Threats</h3>
      ${['TTP','BLA','PTI','SECT'].map(k=>{ const f=P.factions[k]; return `
        <div class="faction">
          <div class="frow"><b>${esc(f.name)}</b><span class="${f.power>50?'bad':f.power>35?'warn':'good'}">${f.power.toFixed(0)}/100</span></div>
          <div class="bar"><i class="${f.power>50?'red':f.power>35?'orange':'green'}" style="width:${f.power}%"></i></div>
        </div>`;}).join('')}
    </div>
    <div class="card">
      <h3>🤝 Inner Condition of Provinces</h3>
      ${P.provinces.map(p=>`
        <div class="faction">
          <div class="frow"><b>${p.name}</b><span class="${p.mood<40?'bad':p.mood>60?'good':'warn'}">${p.mood<40?'Angry':p.mood>60?'Calm':'Uneasy'} ${p.mood.toFixed(0)}</span></div>
          <div class="bar"><i class="${p.mood<40?'red':p.mood>60?'green':'orange'}" style="width:${p.mood}%"></i></div>
        </div>`).join('')}
    </div>
  </div>`;
}
function balanceLine(s){
  const bal = G.monthlyRevenue(s) - G.monthlySpend(s);
  return bal >= 0
    ? `✅ Projected monthly balance: <b class="good">+${fmtB(bal)}</b> — surplus builds reserves & pays debt`
    : `⚠ Projected monthly balance: <b class="bad">${fmtB(bal)}</b> — overdraft becomes new loans`;
}
function setBudget(k, v){
  const s = G.getState();
  s.budget[k] = clamp(parseFloat(v)||0, 0, 3);
  const el = document.getElementById('bv_'+k);
  if (el) el.textContent = '$'+s.budget[k].toFixed(2)+'B';
  const bl = document.getElementById('balanceline');
  if (bl) bl.innerHTML = balanceLine(s);
}
function bump(k, d){
  const s = G.getState();
  const m = BUDGET_META.find(x=>x.key===k);
  s.budget[k] = clamp(s.budget[k]+d, m.min, m.max);
  setBudget(k, s.budget[k]);
}

/* ============ MAP VIEW: RANKED LIST + COUNTRY CARD + POPUPS ============ */
function renderRankList(s){
  const mode = window._rankmode || 'countries';
  const q = (window._rankq || '').toLowerCase();
  const box = document.getElementById('ranklist');
  if (mode === 'alliances'){
    const list = Object.entries(ALLIANCES).filter(([k,a])=>!q || a.name.toLowerCase().includes(q));
    box.innerHTML = list.map(([k,a])=>{
      const mem = a.members.filter(x=>s.countries[x]);
      const youIn = a.members.includes('PAK');
      const strip = mem.slice(0,6).map(x=>s.countries[x].flag||'🏳').join('');
      return `<div class="rankitem" onclick="openPopup('${k}','alliance')">
        <div class="rflag">${a.icon}</div>
        <div class="rmain">
          <div class="rname">${esc(a.name)} ${youIn?'<span class="youbadge">MEMBER</span>':''}</div>
          <div class="rmeta tiny">${mem.length} members · ${esc(a.type)}</div>
          <div class="flagstrip small">${strip}${mem.length>6?` +${mem.length-6}`:''}</div>
        </div>
        <div class="rdot" style="background:#f0b429"></div>
      </div>`;}).join('') || '<div class="muted small" style="padding:10px">No alliance found.</div>';
    return;
  }
  if (mode === 'companies'){
    const list = Object.entries(COMPANIES).filter(([k,c])=>!q || c.name.toLowerCase().includes(q))
      .sort((a,b)=>b[1].worth-a[1].worth);
    box.innerHTML = list.map(([k,c])=>`
      <div class="rankitem" onclick="openPopup('${k}','company')">
        <div class="rflag">${c.flag}</div>
        <div class="rmain">
          <div class="rname">${esc(c.name)}</div>
          <div class="rmeta tiny">${esc(c.sector)} · $${c.worth.toLocaleString()}B</div>
        </div>
        <div class="rdot" style="background:${relColor(c.rel)}" title="relationship ${c.rel}"></div>
      </div>`).join('') || '<div class="muted small" style="padding:10px">No company found.</div>';
    return;
  }
  const ranked = Object.entries(s.countries)
    .map(([iso,c])=>({iso, c, score: G.powerScore(c)}))
    .sort((a,b)=>b.score-a.score);
  const top = ranked[0].score || 1;
  const list = ranked.filter(r=>!q || r.c.name.toLowerCase().includes(q));
  box.innerHTML = list.map((r,i)=>`
    <div class="rankitem ${window._sel===r.iso?'sel':''}" onclick="pickCountry('${r.iso}')">
      <div class="rrank">#${i+1}</div>
      <div class="rflag">${r.c.flag||'🏳'}</div>
      <div class="rmain">
        <div class="rname">${esc(r.c.name)} ${r.iso==='PAK'?'<span class="youbadge">YOU</span>':''} ${r.c.nu?`<span class="tiny nuke">☢${r.c.nu}</span>`:''}</div>
        <div class="rmeta tiny">${fmtB(r.c.gdp)} · ${(r.c.pop>=1000?(r.c.pop/1000).toFixed(2)+'B':r.c.pop.toFixed(0)+'M')}</div>
        <div class="bar thin"><i style="width:${Math.max(2,r.score/top*100)}%;background:${relColor(r.c.rel&&r.c.rel.PAK!==undefined?r.c.rel.PAK:50)}"></i></div>
      </div>
      <div class="rdot" style="background:${relColor(r.c.rel&&r.c.rel.PAK!==undefined?r.c.rel.PAK:50)}" title="relations"></div>
    </div>`).join('');
}
function setRankMode(m){ window._rankmode = m; renderRankList(G.getState()); }
function pickCountry(iso){
  window._sel = iso;
  renderRankList(G.getState());
  drawMap();
  showCountryCard(iso);
}
function worldRank(s, c){ return Object.values(s.countries).filter(x=>x!==c && G.powerScore(x)>G.powerScore(c)).length + 1; }

function showCountryCard(iso){
  const s = G.getState();
  const c = s.countries[iso];
  if (!c) return;
  window._sel = iso;
  drawMap();
  const card = document.getElementById('countrycard');
  card.classList.remove('hidden');
  const isPAK = iso==='PAK';
  const rel = c.rel && c.rel.PAK !== undefined ? c.rel.PAK : 50;
  const rank = worldRank(s, c);
  const goldVal = (c.gold||0) * 0.128; // $B @ ~$4,000/oz
  card.innerHTML = `
    <button class="btn mini close" onclick="hideCard()">✕</button>
    <div class="ccrow">
      <div class="ccflag">${c.flag||'🏳'}</div>
      <div>
        <h2>${esc(c.name)} ${isPAK?'<span class="youbadge big">YOU</span>':''}</h2>
        <div class="muted small">World power rank <b>#${rank}</b> of ${Object.keys(s.countries).length}</div>
      </div>
    </div>
    ${isPAK ? `
      <div class="frow small"><b>Your approval</b><span class="${s.approval<35?'bad':s.approval>55?'good':'warn'}"><b>${s.approval.toFixed(0)}% support</b></span></div>
      <div class="bar"><i class="${s.approval<35?'red':s.approval>55?'green':'orange'}" style="width:${s.approval}%"></i></div>
    ` : `
      <div class="frow small"><b>Relationship with you</b><span style="color:${relColor(rel)}"><b>${rel.toFixed(0)} — ${G.relLabel(rel)}</b></span></div>
      <div class="bar"><i style="width:${(rel+100)/2}%;background:${relColor(rel)}"></i></div>
    `}
    <div class="ministat">
      <div>👑 Leader <b class="small">${esc(c.leader||'—')}</b></div>
      <div>👥 People <b>${c.pop>=1000?(c.pop/1000).toFixed(2)+'B':c.pop.toFixed(1)+'M'}</b></div>
      <div>💰 Economy <b>${fmtB(c.gdp)}</b></div>
      <div>🪙 Gold <b>${(c.gold||0).toLocaleString()}t ~$${goldVal.toFixed(1)}B</b></div>
    </div>
    <div class="actions two">
      <button class="act ops" onclick="openPopup('${iso}','ops')">🕵 Our Operations</button>
      <button class="act alli" onclick="openPopup('${iso}','alli')">🤝 Alliances</button>
    </div>
    <div class="actions">
      <button class="act mil" onclick="openPopup('${iso}','mil')">🎖 Military</button>
      <button class="act econ" onclick="openPopup('${iso}','econ')">💰 Economy</button>
      <button class="act trade" onclick="openPopup('${iso}','trade')">📦 Trade</button>
      <button class="act rule" onclick="openPopup('${iso}','rule')">👑 Ruling</button>
    </div>
    <div class="actions one">
      <button class="act res" onclick="openPopup('${iso}','res')">⛏ Resources — Minerals, Oil, Uranium</button>
    </div>
    <div class="frow small" style="margin-top:10px"><b>Inner condition</b><span class="${(c.st||55)<40?'bad':(c.st||55)>=70?'good':'warn'}"><b>${G.stabLabel(c.st||55)} (${(c.st||55)}/100)</b></span></div>
    <div class="bar"><i class="${(c.st||55)<40?'red':(c.st||55)>=70?'green':'orange'}" style="width:${c.st||55}%"></i></div>
    ${isPAK?'<button class="btn primary" style="width:100%;margin-top:12px" onclick="goHome()">🎖 Open My Government →</button>':''}`;
}
function chipsSimple(str){
  return `<div class="chiprow">${String(str||'—').split(',').map(g=>`<span class="chipbtn">${esc(g.trim())}</span>`).join('')}</div>`;
}
function hideCard(){ document.getElementById('countrycard').classList.add('hidden'); }
function goHome(){ hideCard(); openHome(); switchTab('gov'); }

/* ---------- detail popups ---------- */
function vsRow(label, you, them, fmt){
  const f = fmt || (v=>v.toLocaleString());
  const mx = Math.max(you, them, 1);
  const myPct = clamp(you/mx*100, 2, 100), thPct = clamp(them/mx*100, 2, 100);
  const ratio = you>0 ? (them/you) : 99;
  let verdict = ratio>1.5 ? `<span class="bad">⚠ ${ratio.toFixed(1)}× bigger than yours</span>`
    : ratio>0.8 ? `<span class="warn">≈ equal to yours</span>`
    : `<span class="good">✔ ${(you/them).toFixed(1)}× yours — you lead</span>`;
  return `
    <div class="vsrow">
      <div class="vslabel">${label}</div>
      <div class="vsbars">
        <div class="vsbar you"><i style="width:${myPct}%"></i><b>${f(you)}</b><span>YOU (PAK)</span></div>
        <div class="vsbar them"><i style="width:${thPct}%"></i><b>${f(them)}</b><span>THEM</span></div>
      </div>
      <div class="vsverdict tiny">${verdict}</div>
    </div>`;
}
function milCompare(s, iso){
  const you = MIL_2026.PAK, themIso = iso==='PAK' ? 'IND' : iso, them = MIL_2026[themIso];
  if (!you || !them) return '';
  const themCountry = s.countries[themIso];
  const rows = [
    vsRow('👥 Active personnel', you.active, them.active, v=>Number(v).toLocaleString('en-US')),
    vsRow('🛡 Tank inventory', you.land.tanks[0], them.land.tanks[0]),
    vsRow('✈ All aircraft types', you.air.total[0], them.air.total[0]),
    vsRow('⚓ Naval assets', you.navy.total, them.navy.total)
  ];
  const pakNukes = SIPRI_NUCLEAR_2026.PAK, theirNukes = SIPRI_NUCLEAR_2026[themIso];
  if (pakNukes && theirNukes) rows.push(vsRow('☢ Warhead estimates', pakNukes, theirNukes));
  return `<details class="mil-compare"><summary>⚔ Compare Pakistan with ${esc(themCountry ? themCountry.name : themIso)}</summary>
    ${rows.join('')}<div class="muted tiny">GFP 2026 inventory definitions; gold bar = Pakistan. This is not a combat-readiness comparison.</div>
  </details>`;
}
function publicCount(n){
  return n===null || n===undefined ? 'Not reliably itemized' : Number(n).toLocaleString('en-US');
}
function publicPeople(n){
  if (n===null || n===undefined) return 'Not reliably reported';
  return n>=1000000 ? (n/1000000).toFixed(n>=10000000?1:2)+'M' : Number(n).toLocaleString('en-US');
}
function milValueRow(label, value, note=''){
  const v = value===null || value===undefined || value==='' ? 'Not reliably itemized' : String(value);
  return `<div class="mil-row"><span>${esc(label)}</span><b>${esc(v)}</b>${note?`<small>${esc(note)}</small>`:''}</div>`;
}
function milPairRow(label, pair, note=''){
  if (!pair) return milValueRow(label, null, note);
  const stock = publicCount(pair[0]);
  const readiness = pair[1]===null || pair[1]===undefined ? '' : `<small>GFP modelled available: ${publicCount(pair[1])} — not a measured serviceability count</small>`;
  return `<div class="mil-row"><span>${esc(label)}</span><b>${stock}</b>${readiness}${note?`<small>${esc(note)}</small>`:''}</div>`;
}
function milSection(icon, title, content, cls=''){
  return `<section class="mil-section ${cls}"><h4>${icon} ${esc(title)}</h4>${content}</section>`;
}
function countryPills(s, list){
  return (list||[]).filter(k=>s.countries[k]).map(k=>`<span class="mil-country">${s.countries[k].flag||'🏳'} ${esc(s.countries[k].name)}</span>`).join('') || '<span class="muted tiny">None documented in this source set.</span>';
}
function militaryPopupHtml(s, iso, c, rank){
  const p = MIL_2026[iso];
  if (!p){
    return `<div class="note">No comparable 2026 public inventory profile is included for ${esc(c.name)}. Unknown figures are not shown as zero; the legacy game baseline is not presented as a real-world estimate.</div>
      <div class="muted tiny mil-sources">Reference sources: <a href="${MIL_2026_SOURCE.aircraftUrl}" target="_blank" rel="noopener">GFP aircraft totals</a> · <a href="${MIL_2026_SOURCE.tanksUrl}" target="_blank" rel="noopener">GFP tank totals</a> · <a href="${MIL_2026_SOURCE.navyUrl}" target="_blank" rel="noopener">GFP fleet totals</a>.</div>`;
  }
  const nuclear = SIPRI_NUCLEAR_2026[iso];
  const kpis = [
    ['Active force', publicPeople(p.active)],
    ['Reserve estimate', publicPeople(p.reserve)],
    ['Tanks (stock)', publicCount(p.land && p.land.tanks && p.land.tanks[0])],
    ['Aircraft (all types)', publicCount(p.air && p.air.total && p.air.total[0])],
    ['Naval assets', publicCount(p.navy && p.navy.total)],
    ['Warhead estimate', nuclear ? publicCount(nuclear) : 'Not in SIPRI table']
  ];
  const cohort = milValueRow('Annual population reaching military age (GFP 2026)', publicCount(p.age),
    'The page does not specify an age band; this is not the number fit, eligible or willing to enlist.');
  const people = milSection('👥','Personnel',
    milValueRow('Active military manpower (GFP 2026)', publicPeople(p.active))+
    milValueRow('Reserve manpower (GFP 2026)', publicPeople(p.reserve), 'Reserve definitions and availability vary by country.')+
    cohort+
    milValueRow('Paramilitary / internal security totals','Not combined here','GFP reserve totals exclude paramilitary forces; separate national definitions are inconsistent.'));

  const tiers = p.armorTiers ? `<div class="mil-tier-wrap">
    ${[['Higher-end systems',p.armorTiers.high],['Main / middle fleet',p.armorTiers.middle],['Older / legacy systems',p.armorTiers.legacy]].map(([label,value])=>
      `<div class="mil-tier"><span>${esc(label)}</span><b>${esc(value||'Not separately identified')}</b><small>No reliable public count by quality tier; model names are examples, not a readiness assessment.</small></div>`).join('')}
  </div>` : '';
  const land = milSection('🛡','Tanks, armored vehicles & artillery',
    milPairRow('Combat tanks (GFP 2026 stock)',p.land && p.land.tanks)+
    milPairRow('Armored / support vehicles (GFP category)',p.land && p.land.vehicles,'GFP definition includes APCs, IFVs, MRAPs, cars and support/logistics/engineering vehicles.')+
    milPairRow('Self-propelled artillery',p.land && p.land.sp)+
    milPairRow('Towed artillery',p.land && p.land.towed)+
    milPairRow('Rocket artillery / MLRS',p.land && p.land.mlrs)+tiers+
    `<div class="mil-note">GFP stock and its standardized availability model are estimates. They do not confirm equipment condition, combat readiness or exact active/storage status.</div>`);

  const a = p.air || {};
  const aircraft = milSection('✈','Aircraft by role',
    milPairRow('Aircraft, all types (GFP 2026)',a.total)+
    milPairRow('Fighters',a.fighters)+
    milPairRow('Attack aircraft',a.attack)+
    milValueRow('Dedicated bomber sub-count','Not consistently itemized by GFP 2026; no count inferred','The total-aircraft figure follows GFP’s own category scope.')+
    milPairRow('Transport aircraft',a.transport)+
    milPairRow('Trainers',a.trainers)+
    milPairRow('Special-mission aircraft',a.special,'Includes categories such as airborne early warning, electronic warfare and reconnaissance; radar-only counts are not separated.')+
    milPairRow('Aerial tankers',a.tankers)+
    milPairRow('Helicopters',a.helicopters)+
    milPairRow('Attack helicopters',a.attackHelis)+
    (p.airTiers?`<div class="mil-tier-wrap">${[['Higher-end examples',p.airTiers.high],['Main fleet examples',p.airTiers.middle],['Older / legacy examples',p.airTiers.legacy]].map(([label,value])=>`<div class="mil-tier"><span>${esc(label)}</span><b>${esc(value||'Not separately identified')}</b><small>No public high/mid/legacy aircraft count by quality tier.</small></div>`).join('')}</div>`:'')+
    `<div class="mil-note">GFP aircraft total includes fixed-wing and rotary-wing types across services. Uncrewed aircraft are not consistently counted in the same inventory.</div>`);

  const n = p.navy || {};
  const navyTypes = [
    ['Traditional aircraft carriers',n.carriers],['Helicopter carriers',n.heloCarriers],
    ['Destroyers',n.destroyers],['Frigates',n.frigates],['Corvettes',n.corvettes],
    ['Submarines (all types)',n.submarines],['Patrol vessels',n.patrol],['Mine-warfare vessels',n.mine]
  ].filter(([,value])=>value!==null && value!==undefined)
    .map(([label,value])=>milValueRow(label,publicCount(value))).join('');
  const navy = milSection('⚓','Navy',
    milValueRow('Total fleet assets (GFP 2026)',publicCount(n.total), 'Includes multiple vessel classes and auxiliaries; fleet size is not a measure of firepower.')+
    (navyTypes || milValueRow('Class breakdown',null)));

  const strategic = milSection('☢','Strategic weapons',
    milValueRow('Estimated nuclear inventory (SIPRI, Jan 2026)',nuclear?publicCount(nuclear):'No inventory estimate in SIPRI’s 2026 nine-state table',
      nuclear?'Total inventory estimate; deployed, stored and retired subtotals are distinct.':'Absence from that table is not a detailed weapon-system inventory.')+
    milValueRow('Publicly reported systems',p.special||'No verified country-specific summary in this profile.')+
    `<div class="mil-note">SIPRI figures are independent estimates, not official disclosures; they do not show warhead assignment, serviceability or launch readiness.</div>`);

  const agencies = (p.intel||[]).join('; ');
  const disclosure = INTEL_DISCLOSURE[iso] || INTEL_DISCLOSURE.DEFAULT;
  const unknown = Object.keys(s.countries).filter(k=>k!==iso);
  const intel = milSection('🕵','Special forces & intelligence',
    milValueRow('Publicly named intelligence agencies',agencies||'No reliable profile list available')+
    milValueRow('Special operations units',p.elite||'Not reliably itemized')+
    milValueRow('Agency staffing / spy headcount','Not publicly established','No credible complete headcount is available; no estimate is invented.')+
    `<div class="mil-note">${esc(disclosure.note)}</div>`+
    `<details class="mil-unknown"><summary>No verified country-coverage entry in this reference set for ${unknown.length} other countries</summary>
      <p class="muted tiny">This list reflects missing public coverage detail, not a claim that intelligence activity is absent.</p>
      <div class="mil-country-list">${countryPills(s,unknown)}</div></details>`);
  const profileUrl = GFP_PROFILE_SLUG[iso] ? MIL_2026_SOURCE.profileBase+GFP_PROFILE_SLUG[iso] : MIL_2026_SOURCE.aircraftUrl;

  return `<div class="mil-kpis">${kpis.map(([label,value])=>`<div class="mil-kpi"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')}</div>
    <div class="mil-disclaimer">Public estimates · GFP 2026 inventories · SIPRI nuclear estimates (January 2026). GFP “available” numbers are modelled rates, not verified serviceability.</div>
    ${milCompare(s,iso)}
    <div class="mil-grid">${people}${land}${aircraft}${navy}${strategic}${intel}</div>
    <div class="muted tiny mil-sources">Sources: <a href="${profileUrl}" target="_blank" rel="noopener">GFP ${esc(iso)} 2026 country breakdown</a> · <a href="${MIL_2026_SOURCE.activeUrl}" target="_blank" rel="noopener">personnel</a> · <a href="${MIL_2026_SOURCE.reserveUrl}" target="_blank" rel="noopener">reserves</a> · <a href="${MIL_2026_SOURCE.annualAgeUrl}" target="_blank" rel="noopener">annual age cohort</a> · <a href="${MIL_2026_SOURCE.aircraftUrl}" target="_blank" rel="noopener">aircraft definitions</a> · <a href="${MIL_2026_SOURCE.tanksUrl}" target="_blank" rel="noopener">tanks</a> · <a href="${MIL_2026_SOURCE.navyUrl}" target="_blank" rel="noopener">naval assets</a> · <a href="https://www.sipri.org/visualizations/2026/world-nuclear-forces-january-2026" target="_blank" rel="noopener">SIPRI nuclear estimates</a> · <a href="https://www.iiss.org/publications/the-military-balance/2025/dr-bastian-giegerichs-launch-event-remarks/" target="_blank" rel="noopener">IISS overview</a>.</div>`;
}
function fmtMillions(value){
  if (value===null || value===undefined || value==='') return 'Not reported';
  const n=Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US',{maximumFractionDigits:2}) : 'Not reported';
}
function resourcePopupHtml(iso, c){
  const oil = OIL_PROFILE[iso], ur = URANIUM_2026[iso];
  const mineralRows = USGS_MINERALS_2026.filter(item=>item.rows[iso]).map(item=>{
    const r=item.rows[iso];
    return `<article class="resource-mineral"><h5>${esc(item.symbol)} · ${esc(item.name)}</h5>
      <div class="resource-facts"><span>2025 estimated mine output</span><b>${esc(r.prod)}</b>
        <span>Reserves</span><b>${esc(r.reserve)}</b></div>
      <small>${esc(item.unit)} · ${esc(item.source)} · reserve definition is commodity-specific.</small></article>`;
  }).join('');
  const oilBlock = oil ? (()=>{
    const monthlyFromDaily = v=>v===null || v===undefined ? null : v*30;
    const importMonthly=oil.importsMonthly!==undefined ? oil.importsMonthly : monthlyFromDaily(oil.importsDaily);
    const exportMonthly=oil.exportsMonthly!==undefined ? oil.exportsMonthly : monthlyFromDaily(oil.exportsDaily);
    const flowText=v=>v===null || v===undefined ? 'Not separately reported in a comparable source' : `~${fmtMillions(v)} million barrels per 30-day month`;
    const dailyText=v=>v===null || v===undefined ? 'Not reported' : `${fmtMillions(v*1000000)} bbl/day · ~${fmtMillions(monthlyFromDaily(v))} million bbl per 30 days`;
    const source=OIL_SOURCES[iso], tradeSource=OIL_TRADE_SOURCES[iso];
    return `<section class="resource-section"><h4>🛢 Oil (crude)</h4>
      <div class="resource-facts"><span>Proved reserves</span><b>${esc(oil.reserves||'Not reported')}</b>
        <span>${esc(oil.productionType||'Domestic production')}</span><b>${esc(dailyText(oil.productionDaily))}<small>${esc(oil.productionYear||'Reference year not stated')}</small></b>
        <span>Crude imports / month</span><b>${esc(flowText(importMonthly))}${oil.importsYear?`<small>${esc(oil.importsYear)}</small>`:''}</b>
        <span>Crude exports / month</span><b>${esc(flowText(exportMonthly))}${oil.exportsYear?`<small>${esc(oil.exportsYear)}</small>`:''}</b></div>
      <div class="resource-note">${esc(oil.note||'Monthly amounts are 30-day equivalents of the stated annual/daily measure; crude and refined products are separate.')}</div>
      <small>Source: ${source?`<a href="${source}" target="_blank" rel="noopener">${iso==='PAK'?'Pakistan Ministry of Energy brochure':iso==='IND'?'EIA India country analysis':'World Oil Monitor country summary'}</a>`:'country data'}${tradeSource?` · Trade series: <a href="${tradeSource}" target="_blank" rel="noopener">${iso==='PAK'?'Ministry energy balance':'EIA / national trade data'}</a>`:''}</small></section>`;
  })() : `<section class="resource-section"><h4>🛢 Oil (crude)</h4><div class="resource-note">No country-specific, comparable proved-reserve and monthly crude-trade series is included for this country. Unknown is not zero; gross import/export flows are not inferred from consumption.</div></section>`;
  const uraniumBlock = ur ? `<section class="resource-section"><h4>☢ Uranium</h4>
    <div class="resource-facts"><span>2024 mine output</span><b>${ur.output===null?'Not separately listed by WNA':`${fmtMillions(ur.output)} tU/year · ~${fmtMillions(ur.output/12)} tU/month (annual average)`}</b>
      <span>Identified recoverable resources</span><b>${ur.resources===null?'Not separately listed':fmtMillions(ur.resources)+' tU'}</b>
      <span>Uranium imports / month</span><b>Not reported by the cited WNA country table</b>
      <span>Uranium exports / month</span><b>Not reported by the cited WNA country table</b></div>
    <div class="resource-note">Resources are reasonably assured plus inferred at costs up to US$130/kg U (as of 2025-01-01). Mine output is not the same as fuel imports, conversion, enrichment or reactor-fuel deliveries.</div></section>`
    : `<section class="resource-section"><h4>☢ Uranium</h4><div class="resource-note">No separate national production/resource figure appears in the cited WNA 2024 output / 2025 resource tables. This is not a zero estimate. Country-level uranium import/export flows are not published there.</div></section>`;
  const local=(LOCAL_RESOURCE_FACTS[iso]||[]).map(x=>`<article class="resource-mineral local-mineral"><h5>${esc(x.name)}</h5>
    <div class="resource-facts"><span>Output / status</span><b>${esc(x.output)}</b><span>Resource / reserve</span><b>${esc(x.reserve)}</b></div>
    <small>${esc(x.note)}</small></article>`).join('');
  const energyRows = items=>items.map(([name,value])=>`<div class="resource-flow"><span>${esc(name)}</span><b>${Number(value).toFixed(3)} MTOE</b></div>`).join('');
  const energyBlock = iso==='PAK' ? `<section class="resource-section"><h4>⚡ Pakistan energy balance · ${esc(ENERGY_BALANCE_PAK.year)}</h4>
    <div class="energy-columns"><div><h5>Indigenous primary supply</h5>${energyRows(ENERGY_BALANCE_PAK.indigenous)}</div>
      <div><h5>Imports</h5>${energyRows(ENERGY_BALANCE_PAK.imports)}</div></div>
    <div class="resource-note">MTOE means million tonnes of oil equivalent. These are energy-balance flows, not reserves or installed capacity. ${esc(ENERGY_BALANCE_PAK.gasResource)}</div>
    <small>Source: <a href="${ENERGY_BALANCE_PAK.source}" target="_blank" rel="noopener">Ministry of Energy (Petroleum Division), 2025 brochure; Energy Year Book 2023–24 map</a>.</small>
  </section>` : '';
  const note=RESOURCE_NOTES[iso] || 'USGS Mineral Commodity Summaries report selected country estimates. A missing row does not mean zero reserves or zero production.';
  return `${oilBlock}${uraniumBlock}${energyBlock}
    <section class="resource-section"><h4>⛏ Selected minerals & precious materials</h4>
      ${mineralRows?`<div class="resource-mineral-grid">${mineralRows}</div>`:'<div class="resource-note">No country-specific rows for the selected USGS commodities are shown for this country. Missing rows do not mean zero resources or production.</div>'}
      ${local?`<div class="resource-mineral-grid local-resource-grid">${local}</div>`:''}
      <div class="resource-note">${esc(note)} USGS dash-marked production entries are shown as zero; “Not available” and absent rows are unknown, not zero. Natural gem-quality diamonds and gemstones are distinct from USGS natural industrial-diamond statistics.</div>
    </section>
    <div class="muted tiny resource-sources">Sources: <a href="${USGS_MCS_2026_URL}" target="_blank" rel="noopener">USGS Mineral Commodity Summaries 2026 (2025 estimates)</a> · <a href="${URANIUM_SOURCE_URL}" target="_blank" rel="noopener">World Nuclear Association / OECD-NEA & IAEA uranium data</a>${iso==='PAK'?` · <a href="https://www.barrick.com/English/operations/mineral-reserves-and-resources/default.aspx" target="_blank" rel="noopener">Barrick Reko Diq reserves</a> · <a href="https://www.secmc.com.pk/" target="_blank" rel="noopener">SECMC Thar coal data</a>`:''}. Oil monthly figures are 30-day equivalents; they are not live meters.</div>`;
}
function popHead(kind, flag, name, subtitle){
  return `<div class="pophead ${kind}"><span class="pflag">${flag}</span>
    <div><h2>${esc(name)}</h2><div class="muted tiny">${subtitle}</div></div>
    <button class="btn mini close" onclick="closePopup()">✕</button></div>`;
}
function openPopup(iso, kind){
  const s = G.getState();
  const countryKinds = ['mil','econ','trade','rule','ops','alli','res'];
  let c = null, rank = 0, rel = 50;
  if (countryKinds.includes(kind)){
    c = s.countries[iso];
    if (!c) return;
    rank = worldRank(s, c);
    rel = c.rel && c.rel.PAK !== undefined ? c.rel.PAK : 50;
  }
  const modal = document.getElementById('modal');
  const tile = (k,v,cls='') => `<div class="tile ${cls}"><span>${k}</span><b>${v}</b></div>`;
  let head='', body='';
  if (kind==='mil'){
    const profile = MIL_2026[iso];
    head = popHead('mil', c.flag||'🏳', c.name+' — Military',
      `Game power rank #${rank} · public-source inventory profile ${profile?'available':'limited'}`);
    body = militaryPopupHtml(s, iso, c, rank);
  }
  if (kind==='econ'){
    head = popHead('econ', c.flag||'🏳', c.name+' — Economy', `${c.currency||'—'} currency · ${esc(c.gov||'—')}`);
    const income = c.gdp*(c.tax||16)/100/12;
    const spend = income + c.gdp*(c.def||4)/100/12;
    const prof = income - spend;
    const goldVal = (c.gold||0)*0.128;
    body = `
      <div class="pgrid">
        ${tile('💰 GDP total', fmtB(c.gdp))}
        ${tile('📈 Growth', c.growth.toFixed(1)+'%')}
        ${tile('🔥 Inflation', c.infl.toFixed(1)+'%')}
        ${tile('💵 Monthly output', fmtB(c.gdp/12))}
        ${tile('🏛 Govt income / month', fmtB(income))}
        ${tile('🏛 Govt spending / month', fmtB(spend))}
        ${tile('📅 Monthly balance', (prof>=0?'+':'')+fmtB(prof), prof>=0?'good':'bad')}
        ${tile('🏦 FX reserves', c.reserves?fmtB(c.reserves):'—')}
        ${tile('🪙 Gold reserves', (c.gold||0).toLocaleString()+'t (~$'+goldVal.toFixed(1)+'B)')}
        ${tile('💳 External debt', c.extDebt>0?fmtB(c.extDebt):'Reserve currency')}
        ${tile('🧾 Debt installments / month', c.extDebt>0?fmtB(c.extDebt*0.055/12):'—')}
        ${tile('📊 Tax / GDP', (c.tax||16).toFixed(0)+'%')}
      </div>
      <div class="muted tiny">Monthly figures are government-budget estimates (tax take + deficit). Gold valued at $4,000/oz.</div>`;
  }
  if (kind==='trade'){
    head = popHead('trade', c.flag||'🏳', c.name+' — Trade', 'Imports & exports');
    const exM = c.exports/12, imM = c.imports/12;
    const bal = c.exports - c.imports;
    const chips = arr => `<div class="chiprow">${String(arr||'Mixed goods').split(',').map(g=>`<span class="chipbtn">${esc(g.trim())}</span>`).join('')}</div>`;
    body = `
      <div class="pgrid">
        ${tile('📦 Exports / year', fmtB(c.exports))}
        ${tile('📦 Exports / month', fmtB(exM))}
        ${tile('🚚 Imports / year', fmtB(c.imports))}
        ${tile('🚚 Imports / month', fmtB(imM))}
        ${tile('⚖ Trade balance / yr', (bal>=0?'+':'')+fmtB(bal), bal>=0?'good':'bad')}
        ${tile('🔁 Trade volume / yr', fmtB(c.exports+c.imports))}
      </div>
      <h4 class="popsub">🚀 Main exports</h4>${chips(c.expGoods)}
      <h4 class="popsub">🛒 Main imports</h4>${chips(c.impGoods)}
      <h4 class="popsub">🌍 Trade partners</h4>
      ${String(c.partners||'Global').split(',').map(p=>{
        const bits = p.trim().split(/\s+/); const pct = parseFloat(bits[bits.length-1])||0;
        const nm = bits.slice(0,-1).join(' ');
        return `<div class="frow small"><b>${esc(nm)}</b><span>${pct}%</span></div><div class="bar thin"><i style="width:${clamp(pct*3,3,100)}%;background:#14b8a6"></i></div>`;
      }).join('')}`;
  }
  if (kind==='ops'){
    const profile=MIL_2026[iso], disclosure=INTEL_DISCLOSURE[iso]||INTEL_DISCLOSURE.DEFAULT;
    const unknown=Object.keys(s.countries).filter(k=>k!==iso);
    const agencies=(profile&&profile.intel||[]).join('; ')||'No reliable country-specific list in this profile.';
    const publicPanel=`<div class="ops-public">
      <h4 class="popsub">Public reporting</h4>
      ${milValueRow('Publicly named agencies',agencies)}
      ${milValueRow('Agency staffing / spy headcount','Not publicly established','No complete credible headcount is available; none is estimated here.')}
      <div class="mil-note">${esc(disclosure.note)}</div>
      <details class="mil-unknown"><summary>No verified country-coverage entry in this reference set for ${unknown.length} other countries</summary>
        <p class="muted tiny">This list reflects missing public coverage detail, not a claim that intelligence activity is absent.</p>
        <div class="mil-country-list">${countryPills(s,unknown)}</div></details>
    </div>`;
    if (iso==='PAK'){
      head=popHead('ops',c.flag||'🏳','Pakistan — Intelligence reporting','Public information only · staffing and country coverage are not disclosed');
      body=publicPanel+`<div class="note tiny">Intel actions in Orders affect only the game simulation; no real-world operations or agent counts are displayed.</div>`;
    } else {
      head=popHead('ops',c.flag||'🏳',c.name+' — Intelligence', 'Public reporting is separate from the game network below');
      const n=s.intel.networks[iso], lvl=n?n.lvl:0, heat=n?n.heat:0;
      const status=lvl===0?['NO GAME NETWORK','bad']:lvl>=6?['DEEP GAME NETWORK','good']:lvl>=4?['ESTABLISHED GAME NETWORK','good']:lvl>=2?['ACTIVE GAME NETWORK','warn']:['INITIAL GAME NETWORK','warn'];
      const ctrl=Math.round(lvl/8*100), assets=lvl*7+(lvl>0?3:0);
      body=`<div class="ops-sim-banner">GAME SIMULATION ONLY · Network level, exposure, control and simulated asset count are fictional gameplay values, not real-world coverage or staffing.</div>
        <div class="opstatus ${status[1]}"><span class="dot"></span> ${status[0]}</div>
        <div class="pgrid">${tile('🎛 Game control value',ctrl+'%',ctrl>=50?'good':ctrl>=25?'warn':'bad')}${tile('🕶 Simulated assets',lvl?String(assets):'0')}</div>
        <div class="gauge"><div class="glabel"><span>Game network level</span><span>${lvl}/8</span></div><div class="bar"><i style="width:${Math.max(2,ctrl)}%;background:linear-gradient(90deg,#0f766e,#2dd4bf)"></i></div></div>
        <div class="gauge"><div class="glabel"><span>Game exposure</span><span class="${heat>6?'bad':heat>3?'warn':'good'}">${heat>6?'HIGH':heat>3?'Elevated':'Calm'}</span></div><div class="bar"><i class="${heat>6?'red':heat>3?'orange':'green'}" style="width:${clamp(heat*10,2,100)}%"></i></div></div>
        ${publicPanel}
        <div class="note tiny">Change game values via Orders → Intel. Real country coverage is not represented.</div>`;
    }
  }
  if (kind==='alli'){
    head = popHead('alli', c.flag||'🏳', c.name+' — Alliances', 'Bloc memberships (Nov 2026)');
    const inB = Object.entries(ALLIANCES).filter(([k,a])=>a.members.includes(iso));
    const strip = a => a.members.filter(x=>s.countries[x]).slice(0,8).map(x=>s.countries[x].flag||'🏳').join('') ;
    body = inB.length ? `
      ${inB.map(([k,a])=>`
        <div class="allrow" onclick="openPopup('${k}','alliance')">
          <span class="aicon">${a.icon}</span>
          <div class="amain">
            <b>${esc(a.name)}</b>
            <div class="muted tiny">${a.type} · ${a.members.length} members · led by ${esc(a.lead)}</div>
            <div class="flagstrip">${strip(a)}</div>
          </div>
          <span class="aopen">expand ›</span>
        </div>`).join('')}
      ${iso==='PAK'?'<div class="note">🕋 The Makkah Defense Pact is your crown jewel: Saudi money + your army. SCO puts you in a room with India; OIC gives you the Muslim world\'s mic.</div>'
        :'<div class="muted tiny" style="margin-top:8px">Click any alliance to expand members, leader & economic shares.</div>'}`
    : `<div class="note">❌ ${esc(c.name)} belongs to no major bloc — non-aligned or simply ignored.</div>`;
  }
  if (kind==='alliance'){
    const a = ALLIANCES[iso];
    if (!a){ closePopup(); return; }
    const mem = a.members.filter(x=>s.countries[x]);
    const totGdp = mem.reduce((t,x)=>t+s.countries[x].gdp,0) || 1;
    const sorted = [...mem].sort((x,y)=>s.countries[y].gdp - s.countries[x].gdp);
    const rels = mem.filter(x=>x!=='PAK' && s.countries[x].rel && s.countries[x].rel.PAK!==undefined);
    const standing = rels.length ? Math.round(rels.reduce((t,x)=>t+s.countries[x].rel.PAK,0)/rels.length) : null;
    head = popHead('alliance', a.icon, a.name, `${a.type} · est. ${a.founded} · HQ: ${esc(a.hq)}`);
    body = `
      <div class="bigstrip">${mem.map(x=>`<span title="${esc(s.countries[x].name)}">${s.countries[x].flag||'🏳'}</span>`).join('')}</div>
      <div class="pgrid">
        ${tile('🚩 Members', mem.length)}
        ${tile('👑 Led by', a.lead)}
        ${tile('🤝 Your standing', standing===null?'Member state':standing, standing===null?'good':standing>=40?'good':standing>=0?'warn':'bad')}
        ${tile('⚖ Top economy', sorted[0] ? s.countries[sorted[0]].flag+' '+s.countries[sorted[0]].name : '—')}
      </div>
      <div class="noteline">${esc(a.note)}</div>
      <h4 class="popsub">🌍 Members by economic weight (share of bloc)</h4>
      <div class="memgrid">
      ${sorted.map((x,i)=>{
        const cc = s.countries[x]; const share = (cc.gdp/totGdp*100);
        const rl = x==='PAK' ? null : (cc.rel&&cc.rel.PAK!==undefined?cc.rel.PAK:undefined);
        return `<div class="memrow ${x==='PAK'?'me':''}">
          <span class="mi">${i+1}</span><span class="mf">${cc.flag}</span>
          <span class="mn">${esc(cc.name)}${x==='PAK'?' <span class="youbadge">YOU</span>':''}</span>
          <span class="mg tiny muted">${fmtB(cc.gdp)}</span>
          <div class="bar thin mb"><i style="width:${clamp(share*2.2,3,100)}%;background:${rl!==undefined?relColor(rl):'#f0b429'}"></i></div>
          <span class="mp">${share.toFixed(1)}%</span>
        </div>`;}).join('')}
      </div>
      <div class="muted tiny">Lead: ${esc(a.lead)}. Bar color = that country's relations with you.</div>`;
  }
  if (kind==='company'){
    const co = COMPANIES[iso];
    if (!co){ closePopup(); return; }
    head = popHead('company', co.flag, co.name, `${co.sector} · worth $${co.worth.toLocaleString()}B`);
    body = `
      <div class="pgrid">
        ${tile('💼 Sector', co.sector)}
        ${tile('💵 Worth', '$'+co.worth.toLocaleString()+'B')}
        ${tile('🇵🇰 Your relationship', co.rel, co.rel>=60?'good':co.rel>=30?'warn':'bad')}
        ${tile('🧾 OUR SHARES / STAKE', (co.stake||'0% — none').split('—')[0].trim(), (co.stake||'').startsWith('0%')?'':'good')}
      </div>
      <div class="frow small"><b>Relationship with Pakistan</b><span style="color:${relColor(co.rel)}"><b>${co.rel}/100</b></span></div>
      <div class="bar"><i style="width:${co.rel}%;background:${relColor(co.rel)}"></i></div>
      <h4 class="popsub">🧾 Our stake in them</h4>
      <div class="noteline">${esc(co.stake||'No Pakistani sovereign stake.')}</div>
      <h4 class="popsub">📋 Footprint in Pakistan</h4>
      <div class="noteline">${esc(co.note)}</div>`;
  }
  if (kind==='res'){
    head = popHead('res', c.flag||'🏳', c.name+' — Resources', 'Public source estimates · units and years shown · unknown is not zero');
    body = resourcePopupHtml(iso, c);
  }
  if (kind==='rule'){
    head = popHead('rule', c.flag||'🏳', c.name+' — Ruling', 'Leadership & governance');
    const income = c.gdp*(c.tax||16)/100/12;
    const spend = income + c.gdp*(c.def||4)/100/12;
    body = `
      <div class="ruler">
        <div class="rulerava">👑</div>
        <div><div class="rulername">${esc(c.leader||'Government of '+c.name)}</div>
        <div class="muted small">${esc(c.gov||'—')}</div></div>
      </div>
      <div class="pgrid">
        ${tile('🏛 Inner stability', G.stabLabel(c.st||55)+' ('+(c.st||55)+'/100)', (c.st||55)<40?'bad':(c.st||55)>=70?'good':'warn')}
        ${tile('💳 Debt installments / mo', c.extDebt>0?fmtB(c.extDebt*0.055/12):'Reserve currency')}
        ${tile('📥 Monthly income', fmtB(income))}
        ${tile('📤 Monthly spending', fmtB(spend))}
      </div>
      <div class="frow small"><b>Stability</b><span>${(c.st||55)}/100</span></div>
      <div class="bar"><i class="${(c.st||55)<40?'red':(c.st||55)>=70?'green':'orange'}" style="width:${c.st||55}%"></i></div>
      ${c.un?`<div class="note">⚠ ${esc(c.un)}</div>`:''}
      ${iso!=='PAK'?`<div class="frow small" style="margin-top:8px"><b>Relations with you</b><span style="color:${relColor(rel)}"><b>${rel.toFixed(0)} — ${G.relLabel(rel)}</b></span></div>
      <div class="bar"><i style="width:${(rel+100)/2}%;background:${relColor(rel)}"></i></div>
      <div class="muted tiny" style="margin-top:6px">💡 Improve with Orders → Foreign → State Visit / Trade Deal.</div>`:`<div class="note">This is YOUR government, President Zain Chaudary. The country answers to you.</div>`}`;
  }
  modal.innerHTML = `<div class="pop">${head}<div class="popbody">${body}</div></div>`;
  modal.style.display = 'flex';
  modal.dataset.kind = 'popup';
}
function closePopup(){
  const modal = document.getElementById('modal');
  modal.style.display = 'none';
  modal.innerHTML = '';
  delete modal.dataset.kind;
}

/* ============ TAB: ORDERS ============ */
function tabOrders(s){
  const activeCat = window._ordersCat || 'Economy';
  return `
    <div class="catbar">${CATS.map(c=>`<button class="cat ${c===activeCat?'on':''}" onclick="setCat('${c}')">${c}</button>`).join('')}</div>
    <div class="orders">
      ${ACTIONS.filter(a=>a.cat===activeCat).map(a=>{
        const ok = G.actionAvailable(s,a);
        const cdUntil = s.cooldowns[a.id];
        const cd = cdUntil && (s.date.y*12+s.date.m) < cdUntil ? cdUntil - (s.date.y*12+s.date.m) : 0;
        let tgt = '';
        if (a.target==='diploTarget'){
          const opts = Object.keys(s.countries).filter(k=>k!=='PAK').sort((x,y)=>(s.countries[y].gdp)-(s.countries[x].gdp)).slice(0,40);
          tgt = `<select onchange="setDip(this.value)">${opts.map(k=>`<option value="${k}" ${window._dipTarget===k?'selected':''}>${flag(k)} ${esc(s.countries[k].name)}</option>`).join('')}</select>`;
        } else if (a.target==='covertTarget'){
          tgt = `<select onchange="setOp(this.value)">${['IND','AFG','USA','IRN','ISR','GBR','BGD'].filter(k=>s.countries[k]).map(k=>`<option value="${k}" ${window._opTarget===k?'selected':''}>${flag(k)} ${esc(s.countries[k].name)}</option>`).join('')}</select>`;
        } else if (a.target==='exercisePartner'){
          tgt = `<select onchange="setEx(this.value)">${['CHN','SAU','TUR','ARE','AZE'].map(k=>`<option value="${k}" ${window._exTarget===k?'selected':''}>${flag(k)} ${esc(s.countries[k].name)}</option>`).join('')}</select>`;
        }
        return `
        <div class="order ${ok?'':'off'}">
          <div class="orow">
            <div><b>${esc(a.name)}</b><div class="muted small">${esc(a.desc)}</div>
            <div class="costs">${a.cost.money?`<span>💵 $${a.cost.money}B</span>`:''}${a.cost.pc?`<span>🏛 ${a.cost.pc} PC</span>`:''}${cd?`<span class="bad">⏳ ${cd}mo</span>`:''}</div></div>
            <div class="obtn">${tgt}<button class="btn" ${ok?'':'disabled'} onclick="issue('${a.id}')">Issue</button></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}
function setCat(c){ window._ordersCat = c; render(); }
function setDip(v){ window._dipTarget = v; }
function setOp(v){ window._opTarget = v; }
function setEx(v){ window._exTarget = v; }
function issue(id){
  const s = G.getState();
  const a = ACTIONS.find(x=>x.id===id);
  if (!a || !G.actionAvailable(s,a)) return;
  if (a.target==='diploTarget'){ if(!window._dipTarget) window._dipTarget='CHN'; s._dipTarget = window._dipTarget; }
  if (a.target==='covertTarget'){ if(!window._opTarget) window._opTarget='IND'; s._opTarget = window._opTarget; }
  if (a.target==='exercisePartner'){ if(!window._exTarget) window._exTarget='CHN'; s._exTarget = window._exTarget; }
  G.doAction(s, a);
  toast('Order issued: ' + a.name);
  render();
}

/* ============ TAB: INTEL ============ */
function tabIntel(s){
  return `
  <div class="card"><h3>🕵 Intelligence network · game simulation</h3>
    <div class="ops-sim-banner">These network levels and heat values are fictional gameplay mechanics. They do not describe real agent headcounts, country coverage, or current operations.</div>
    ${Object.entries(s.intel.networks).map(([k,n])=>{
      const T = s.countries[k];
      return `<div class="faction">
        <div class="frow"><b>${T?T.flag+' '+esc(T.name):k}</b><span>game level ${n.lvl} · game heat ${n.heat.toFixed(1)}</span></div>
        <div class="bar"><i class="${n.heat>6?'red':'green'}" style="width:${n.lvl*12.5}%"></i></div>
      </div>`;}).join('')}
    <div class="note tiny">Game level = simulated network depth. Game heat = simulated exposure. Adjust through Orders → Intel. Public reporting and unknowns are shown separately in country Military/Intelligence popups.</div>
  </div>`;
}

/* ============ TAB: NEWS ============ */
function tabNews(s){
  return `<div class="card"><h3>📰 World & National Feed</h3>
    ${s.news.slice(0,80).map(n=>`<div class="newsitem ${n.tone}"><span class="d">${n.d}</span> ${esc(n.t)}</div>`).join('')}
  </div>`;
}

/* ============ VIEW SWITCHING ============ */
function openMap(){
  document.getElementById('view-home').classList.add('hidden');
  document.getElementById('view-map').classList.remove('hidden');
  fitMapCanvas();
  renderRankList(G.getState());
  drawMap();
}
function openHome(){
  document.getElementById('view-map').classList.add('hidden');
  document.getElementById('view-home').classList.remove('hidden');
}

/* ============ EVENT MODALS ============ */
function showEventModal(){
  const s = G.getState();
  const pending = G.getPending();
  const modal = document.getElementById('modal');
  if (pending.length===0 || s.gameOver){
    if (modal.dataset.kind!=='popup') modal.style.display='none';
    return;
  }
  const ev = EVENTS[pending[0]];
  if (!ev){ G.shiftPending(); return; }
  if (['ceasefireOffer','nuclearDecision'].includes(pending[0]) && !s.war){ G.shiftPending(); showEventModal(); return; }
  modal.innerHTML = `
    <div class="modal-box">
      <h2>${esc(ev.title)}</h2>
      <p>${esc(ev.text(s))}</p>
      <div class="choices">
        ${ev.choices.map((c,i)=>`<button class="btn choice" onclick="chooseEvent(${i})">${esc(c.label)}</button>`).join('')}
      </div>
    </div>`;
  modal.style.display = 'flex';
}
function chooseEvent(i){
  const s = G.getState();
  const ev = EVENTS[G.getPending()[0]];
  if (!ev) return;
  const c = ev.choices[i];
  G.shiftPending();
  c.fx(s);
  saveGameSilent();
  render();
  if (G.getPending().length) setTimeout(showEventModal, 250);
}
function saveGameSilent(){ if (!G.getState().gameOver) localStorage.setItem('wl2026', JSON.stringify(G.getState())); }

/* ============ MASTER RENDER ============ */
function render(){
  const s = G.getState();
  if (!s) return;
  renderChips(s);
  const tab = window._tab || 'gov';
  document.getElementById('panel').innerHTML =
    tab==='gov'    ? tabGov(s) :
    tab==='orders' ? tabOrders(s) :
    tab==='intel'  ? tabIntel(s) :
    tabNews(s);
  document.querySelectorAll('.tabbtn').forEach(b=>b.classList.toggle('on', b.dataset.tab===tab));
  const tick = document.getElementById('ticker');
  if (tick) tick.textContent = s.news.slice(0,10).map(n=>n.t).join('   ●   ');
  showEventModal();
}
function switchTab(t){ window._tab = t; render(); }
