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
    <h3>🎖 Total Army</h3>
    <div class="ministat army">
      <div>👥 Troops <b>${P.troops.toLocaleString()}k</b></div>
      <div>🛡 Tanks <b>${P.tanks.toLocaleString()}</b></div>
      <div>✈ Jets <b>${P.aircraft}</b></div>
      <div>🚢 Ships <b>${P.ships}</b></div>
      <div>☢ Warheads <b>${P.nu}</b></div>
      <div>💵 Defense/yr <b>$${P.defense.toFixed(1)}B</b></div>
    </div>
    <div class="frow small"><b>Readiness</b><span>${(s.readiness*100).toFixed(0)}%</span></div>
    <div class="bar"><i class="${s.readiness>0.6?'green':'orange'}" style="width:${s.readiness*100}%"></i></div>
    <div class="frow small"><b>Border posture vs India</b><span>${'▮'.repeat(s.militPosture)}${'▯'.repeat(5-s.militPosture)}</span></div>
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
  const q = (window._rankq || '').toLowerCase();
  const ranked = Object.entries(s.countries)
    .map(([iso,c])=>({iso, c, score: G.powerScore(c)}))
    .sort((a,b)=>b.score-a.score);
  const top = ranked[0].score || 1;
  const list = ranked.filter(r=>!q || r.c.name.toLowerCase().includes(q));
  document.getElementById('ranklist').innerHTML = list.map((r,i)=>`
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
      <div>🎖 Troops <b>${c.troops.toLocaleString()}k</b></div>
      <div>☢ Nukes <b>${c.nu||'0'}</b></div>
    </div>
    <div class="actions">
      <button class="act mil" onclick="openPopup('${iso}','mil')">🎖 Military</button>
      <button class="act econ" onclick="openPopup('${iso}','econ')">💰 Economy</button>
      <button class="act trade" onclick="openPopup('${iso}','trade')">📦 Trade</button>
      <button class="act rule" onclick="openPopup('${iso}','rule')">👑 Ruling</button>
    </div>
    <div class="frow small" style="margin-top:10px"><b>Inner condition</b><span class="${(c.st||55)<40?'bad':(c.st||55)>=70?'good':'warn'}"><b>${G.stabLabel(c.st||55)} (${(c.st||55)}/100)</b></span></div>
    <div class="bar"><i class="${(c.st||55)<40?'red':(c.st||55)>=70?'green':'orange'}" style="width:${c.st||55}%"></i></div>
    ${isPAK?'<button class="btn primary" style="width:100%;margin-top:12px" onclick="goHome()">🎖 Open My Government →</button>':''}`;
}
function hideCard(){ document.getElementById('countrycard').classList.add('hidden'); }
function goHome(){ hideCard(); openHome(); switchTab('gov'); }

/* ---------- detail popups ---------- */
function vsRow(label, mine, theirs, invert=false){
  const mx = Math.max(mine, theirs, 1);
  const myPct = clamp(mine/mx*100, 2, 100), thPct = clamp(theirs/mx*100, 2, 100);
  const ratio = mine>0 ? (theirs/mine) : 99;
  let verdict = ratio>1.5 ? `<span class="bad">⚠ ${ratio.toFixed(1)}× stronger than you</span>`
    : ratio>0.8 ? `<span class="warn">≈ equal to you</span>`
    : `<span class="good">✔ ${ratio<0.02?'negligible':(mine/theirs).toFixed(1)+'× weaker than you'}</span>`;
  if (invert) verdict = '';
  return `
    <div class="vsrow">
      <div class="vslabel">${label}</div>
      <div class="vsbars">
        <div class="vsbar you"><i style="width:${myPct}%"></i><b>${mine.toLocaleString()}</b><span>YOU</span></div>
        <div class="vsbar them"><i style="width:${thPct}%"></i><b>${theirs.toLocaleString()}</b><span>THEM</span></div>
      </div>
      <div class="vsverdict tiny">${verdict}</div>
    </div>`;
}
function milCompare(s, iso){
  const c = s.countries[iso], P = s.countries.PAK;
  const foe = iso==='PAK' ? s.countries.IND : P;
  const foeName = iso==='PAK' ? 'India (your rival)' : 'Pakistan';
  const a = iso==='PAK' ? P : c, b = foe;
  return `
    <h4 class="popsub">⚔ ${iso==='PAK'? 'You vs India — your rival' : esc(a.name)+' vs '+foeName}</h4>
    ${vsRow('⚔ Power score', Math.round(G.powerScore(a)), Math.round(G.powerScore(b)))}
    ${vsRow('👥 Troops', a.troops, b.troops)}
    ${vsRow('🛡 Tanks', a.tanks, b.tanks)}
    ${vsRow('✈ Aircraft', a.aircraft, b.aircraft)}
    ${vsRow('☢ Warheads', a.nu||0, b.nu||0)}
    <div class="muted tiny" style="margin-bottom:6px">Bars: gold = ${iso==='PAK'?'you':'you'} · grey = ${iso==='PAK'?'India':'them'}. Numbers rounded.</div>`;
}
function popHead(kind, flag, name, subtitle){
  return `<div class="pophead ${kind}"><span class="pflag">${flag}</span>
    <div><h2>${esc(name)}</h2><div class="muted tiny">${subtitle}</div></div>
    <button class="btn mini close" onclick="closePopup()">✕</button></div>`;
}
function openPopup(iso, kind){
  const s = G.getState();
  const c = s.countries[iso];
  if (!c) return;
  const modal = document.getElementById('modal');
  const rank = worldRank(s, c);
  const rel = c.rel && c.rel.PAK !== undefined ? c.rel.PAK : 50;
  const tile = (k,v,cls='') => `<div class="tile ${cls}"><span>${k}</span><b>${v}</b></div>`;
  let head='', body='';
  if (kind==='mil'){
    head = popHead('mil', c.flag||'🏳', c.name+' — Military', `World power rank #${rank} · ${c.nu? c.nu+' nuclear warheads ☢':'No nuclear weapons'} · Agency: ${esc(c.agency||'—')}`);
    const per1000 = (c.troops*1000/(c.pop*1000000)).toFixed(1);
    const m = c.mil || null;
    body = `
      <div class="pgrid">
        ${tile('👥 Active troops', c.troops.toLocaleString()+'k')}
        ${tile('🛡 Tanks', c.tanks.toLocaleString())}
        ${tile('✈ Combat aircraft', c.aircraft.toLocaleString())}
        ${tile('🚢 Naval ships', (c.ships||0).toLocaleString())}
        ${tile('💥 Artillery', (c.artillery?Math.round(c.artillery).toLocaleString():'—'))}
        ${tile('💵 Defense budget', '$'+(c.defense||0).toFixed(1)+'B/yr')}
        ${tile('☢ Warheads', c.nu? c.nu+' ☢':'None')}
        ${tile('🧍 Soldiers per 1,000 people', per1000)}
      </div>
      ${m ? `
      <h4 class="popsub">🪖 Army equipment</h4><div class="noteline">${esc(m.a)}</div>
      <h4 class="popsub">✈ Air Force</h4><div class="noteline">${esc(m.f)}</div>
      <h4 class="popsub">🚢 Navy</h4><div class="noteline">${esc(m.n)}</div>
      <h4 class="popsub">🚀 Missiles & Strategic</h4><div class="noteline">${esc(m.m)}</div>
      <div class="pgrid" style="margin-top:10px">
        ${tile('🎖 Reserves / SF', m.r)}
        ${tile('🛒 Main suppliers', m.s)}
        ${tile('🔥 Combat experience', m.x)}
        ${tile('🌍 Foreign bases', m.b)}
      </div>
      <div class="note">🧭 ${esc(m.j)}</div>
      ` : `<div class="note">Open-source detail limited for this country — judge by the numbers above.</div>`}
      ${milCompare(s, iso)}
      <div class="frow small" style="margin-top:4px"><b>Power score vs world #1 (USA)</b><span><b>${Math.round(G.powerScore(c)).toLocaleString()} / ${Math.round(G.powerScore(s.countries.USA)).toLocaleString()}</b></span></div>
      <div class="bar"><i style="width:${clamp(G.powerScore(c)/G.powerScore(s.countries.USA)*100,2,100)}%;background:linear-gradient(90deg,#b8860b,#f0b429)"></i></div>
      ${c.milNote?`<div class="muted tiny" style="margin-top:6px">${esc(c.milNote)}</div>`:''}`;
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
    body = `
      <div class="pgrid">
        ${tile('📦 Exports / year', fmtB(c.exports))}
        ${tile('📦 Exports / month', fmtB(exM))}
        ${tile('🚚 Imports / year', fmtB(c.imports))}
        ${tile('🚚 Imports / month', fmtB(imM))}
        ${tile('⚖ Trade balance / yr', (bal>=0?'+':'')+fmtB(bal), bal>=0?'good':'bad')}
        ${tile('🔁 Trade volume / yr', fmtB(c.exports+c.imports))}
      </div>
      <h4 class="popsub">🚀 Main exports</h4><div class="noteline">${esc(c.expGoods||'Mixed goods')}</div>
      <h4 class="popsub">🛒 Main imports</h4><div class="noteline">${esc(c.impGoods||'Machinery & fuel')}</div>
      <h4 class="popsub">🌍 Trade partners</h4>
      ${String(c.partners||'Global').split(',').map(p=>{
        const bits = p.trim().split(/\s+/); const pct = parseFloat(bits[bits.length-1])||0;
        const nm = bits.slice(0,-1).join(' ');
        return `<div class="frow small"><b>${esc(nm)}</b><span>${pct}%</span></div><div class="bar thin"><i style="width:${clamp(pct*3,3,100)}%;background:#2dd4bf"></i></div>`;
      }).join('')}`;
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
  <div class="card"><h3>🕵 ISI Foreign Networks</h3>
    ${Object.entries(s.intel.networks).map(([k,n])=>{
      const T = s.countries[k];
      return `<div class="faction">
        <div class="frow"><b>${T?T.flag+' '+esc(T.name):k}</b><span>level ${n.lvl} · heat ${n.heat.toFixed(1)}</span></div>
        <div class="bar"><i class="${n.heat>6?'red':'green'}" style="width:${n.lvl*12.5}%"></i></div>
      </div>`;}).join('')}
    <div class="note tiny">Level = penetration depth. Heat = exposure — above 7, networks get rolled up. Grow them via Orders → Intel.</div>
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
