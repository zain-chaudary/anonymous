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
    <h3>🪖 Army</h3>
    <div class="muted tiny">Public estimates · GFP 2026 / SIPRI Jan 2026</div>
    <div class="ministat personnel public-reference">
      <div>👥 Active <b>${publicPeople(publicMil.active)}</b></div>
      <div>🎖 Reserve <b>${publicPeople(publicMil.reserve)}</b></div>
      <div>🛡 Tanks <b>${publicCount(publicMil.land.tanks[0])}</b></div>
      <div>✈ Aircraft <b>${publicCount(publicMil.air.total[0])}</b></div>
      <div>⚓ Navy <b>${publicCount(publicMil.navy.total)}</b></div>
      <div>☢ Warheads <b>${publicCount(SIPRI_NUCLEAR_2026.PAK)}</b></div>
    </div>
    <div class="muted tiny">Reference estimates are separate from the game.</div>
    <details class="clean-details"><summary>Game scenario</summary>
      <div class="ministat army">
        <div>👥 Troops <b>${P.troops.toLocaleString()}k</b></div>
        <div>🛡 Tanks <b>${P.tanks.toLocaleString()}</b></div>
        <div>✈ Aircraft <b>${P.aircraft}</b></div>
        <div>🚢 Ships <b>${P.ships}</b></div>
        <div>☢ Scenario variable <b>${P.nu}</b></div>
        <div>💵 Defense/yr <b>$${P.defense.toFixed(1)}B</b></div>
      </div>
      <div class="frow small"><b>Game readiness</b><span>${(s.readiness*100).toFixed(0)}%</span></div>
      <div class="bar"><i class="${s.readiness>0.6?'green':'orange'}" style="width:${s.readiness*100}%"></i></div>
      <div class="frow small"><b>Border posture</b><span>${'▮'.repeat(s.militPosture)}${'▯'.repeat(5-s.militPosture)}</span></div>
    </details>
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
  card.innerHTML = `
    <button class="btn mini close" onclick="hideCard()">✕</button>
    <div class="ccrow">
      <div class="ccflag">${c.flag||'🏳'}</div>
      <div>
        <h2>${esc(c.name)} ${isPAK?'<span class="youbadge big">YOU</span>':''}</h2>
        <div class="muted small">Rank #${rank} of ${Object.keys(s.countries).length}</div>
      </div>
    </div>
    <div class="country-status"><span>${isPAK?'Approval':'Relations'}</span><b style="color:${isPAK?(s.approval<35?'var(--red)':s.approval>55?'var(--green)':'var(--amber)'):relColor(rel)}">${isPAK?s.approval.toFixed(0)+'%':G.relLabel(rel)}</b></div>
    <div class="country-quick-stats">
      <div><span>People</span><b>${c.pop>=1000?(c.pop/1000).toFixed(2)+'B':c.pop.toFixed(1)+'M'}</b></div>
      <div><span>GDP</span><b>${fmtB(c.gdp)}</b></div>
    </div>
    <div class="country-primary-actions">
      <button class="act mil" onclick="openPopup('${iso}','mil')">🪖 Army</button>
      <button class="act trade" onclick="openPopup('${iso}','trade')">📦 Trade</button>
    </div>
    <details class="country-more">
      <summary>More</summary>
      <div class="country-extra-actions">
        <button class="act econ" onclick="openPopup('${iso}','econ')">Economy</button>
        <button class="act rule" onclick="openPopup('${iso}','rule')">Government</button>
        <button class="act alli" onclick="openPopup('${iso}','alli')">Alliances</button>
        <button class="act ops" onclick="openPopup('${iso}','ops')">Intel</button>
        <button class="act res" onclick="openPopup('${iso}','res')">Resources</button>
      </div>
      <div class="country-status"><span>Condition</span><b>${G.stabLabel(c.st||55)}</b></div>
    </details>
    ${isPAK?'<button class="btn primary country-home" onclick="goHome()">My Government</button>':''}`;
}
function chipsSimple(str){
  return `<div class="chiprow">${String(str||'—').split(',').map(g=>`<span class="chipbtn">${esc(g.trim())}</span>`).join('')}</div>`;
}
function hideCard(){ document.getElementById('countrycard').classList.add('hidden'); }
function goHome(){ hideCard(); openHome(); switchTab('gov'); }

/* ---------- detail popups ---------- */
function publicCount(n){
  return n===null || n===undefined ? 'Not listed' : Number(n).toLocaleString('en-US');
}
function publicPeople(n){
  if (n===null || n===undefined) return 'Not listed';
  return n>=1000000 ? (n/1000000).toFixed(n>=10000000?1:2)+'M' : Number(n).toLocaleString('en-US');
}
function profileMetric(label, value, meta=''){
  const v=value===null || value===undefined || value==='' ? 'Not listed' : String(value);
  return `<div class="profile-metric"><span>${esc(label)}</span><b>${esc(v)}</b>${meta?`<small>${esc(meta)}</small>`:''}</div>`;
}
function profileMetricGrid(items){ return `<div class="profile-metric-grid">${items.join('')}</div>`; }
function profileTabButtons(group, items, active){
  return `<div class="profile-tab-buttons">${items.map(([key,label])=>
    `<button type="button" class="profile-tab-btn ${key===active?'on':''}" data-profile-button="${group}" data-profile-key="${key}" onclick="showProfileTab('${group}','${key}')">${esc(label)}</button>`).join('')}</div>`;
}
function profileTabPanel(group, key, content, active=false){
  return `<div class="profile-tab-panel${active?'':' hidden'}" data-profile-panel="${group}" data-profile-key="${key}">${content}</div>`;
}
function showProfileTab(group, key){
  document.querySelectorAll(`[data-profile-button="${group}"]`).forEach(button=>
    button.classList.toggle('on',button.dataset.profileKey===key));
  document.querySelectorAll(`[data-profile-panel="${group}"]`).forEach(panel=>
    panel.classList.toggle('hidden',panel.dataset.profileKey!==key));
}
function pairMetric(label, pair){
  if (!Array.isArray(pair)) return profileMetric(label,'Not itemized');
  const meta=pair[1]===null || pair[1]===undefined ? 'Availability not listed' : `GFP modelled available: ${publicCount(pair[1])}`;
  return profileMetric(label,publicCount(pair[0]),meta);
}
function countryPills(s, list){
  return (list||[]).filter(k=>s.countries[k]).map(k=>`<span class="mil-country">${s.countries[k].flag||'🏳'} ${esc(s.countries[k].name)}</span>`).join('') || '<span class="muted tiny">No entries.</span>';
}
function militaryPopupHtml(s, iso, c){
  const p=MIL_2026[iso];
  if (!p) return `<div class="country-empty">No public army profile here. Game figures stay separate.</div>
    <details class="clean-details"><summary>Sources</summary><div class="clean-links">
      <a href="${MIL_2026_SOURCE.aircraftUrl}" target="_blank" rel="noopener">Aircraft</a>
      <a href="${MIL_2026_SOURCE.tanksUrl}" target="_blank" rel="noopener">Tanks</a>
      <a href="${MIL_2026_SOURCE.navyUrl}" target="_blank" rel="noopener">Navy</a>
    </div></details>`;
  const nuclear=SIPRI_NUCLEAR_2026[iso], air=p.air||{}, land=p.land||{}, navy=p.navy||{};
  const overview=profileMetricGrid([
    profileMetric('Active',publicPeople(p.active),'GFP 2026'),
    profileMetric('Reserve',publicPeople(p.reserve),'GFP 2026'),
    profileMetric('Tanks',publicCount(land.tanks&&land.tanks[0]),'GFP 2026'),
    profileMetric('Aircraft',publicCount(air.total&&air.total[0]),'GFP 2026'),
    profileMetric('Fleet',publicCount(navy.total),'GFP 2026'),
    profileMetric('Warheads',nuclear?publicCount(nuclear):'Not listed','SIPRI · Jan 2026'),
    profileMetric('Annual age cohort',publicCount(p.age),'GFP 2026')
  ])+'<div class="profile-note">GFP figures are estimates; “available” is modelled, not measured readiness.</div>';
  const landPanel=profileMetricGrid([
    pairMetric('Tanks',land.tanks),pairMetric('Armored vehicles',land.vehicles),
    pairMetric('Self-propelled guns',land.sp),pairMetric('Towed guns',land.towed),
    pairMetric('Rocket artillery',land.mlrs)
  ]);
  const airPanel=profileMetricGrid([
    pairMetric('All aircraft',air.total),pairMetric('Fighters',air.fighters),
    pairMetric('Attack aircraft',air.attack),profileMetric('Dedicated bombers','Not itemized'),
    pairMetric('Transport',air.transport),pairMetric('Trainers',air.trainers),
    pairMetric('Special mission',air.special),pairMetric('Tankers',air.tankers),
    pairMetric('Helicopters',air.helicopters),pairMetric('Attack helicopters',air.attackHelis)
  ])+'<div class="profile-note">GFP aircraft totals exclude UAVs; bomber counts are not consistently listed.</div>';
  const shipTypes=[['Carriers',navy.carriers],['Helicopter carriers',navy.heloCarriers],['Destroyers',navy.destroyers],
    ['Frigates',navy.frigates],['Corvettes',navy.corvettes],['Submarines',navy.submarines],
    ['Patrol vessels',navy.patrol],['Mine warfare',navy.mine]];
  const navyPanel=profileMetricGrid([profileMetric('All fleet assets',publicCount(navy.total),'GFP 2026'),
    ...shipTypes.filter(([,value])=>value!==null&&value!==undefined).map(([label,value])=>profileMetric(label,publicCount(value)))]);
  const strategicPanel=profileMetricGrid([
    profileMetric('Warhead estimate',nuclear?publicCount(nuclear):'Not listed','SIPRI · Jan 2026'),
    profileMetric('Publicly reported systems',p.special?'See note':'Not listed')
  ])+`<details class="clean-details"><summary>Systems note</summary><div class="profile-note">${esc(p.special||'No profile note.')}</div></details>`;
  const disclosure=INTEL_DISCLOSURE[iso]||INTEL_DISCLOSURE.DEFAULT;
  const unknown=Object.keys(s.countries).filter(k=>k!==iso);
  const intelPanel=profileMetricGrid([
    profileMetric('Public agencies',(p.intel||[]).join(' · ')||'Not listed'),
    profileMetric('Staffing','Not public')
  ])+`<div class="profile-note">${esc(disclosure.note)}</div>
    <details class="clean-details"><summary>Country coverage · no verified entries (${unknown.length})</summary>
      <div class="mil-country-list">${countryPills(s,unknown)}</div></details>`;
  const sources=`<div class="clean-links">
    <a href="${GFP_PROFILE_SLUG[iso]?MIL_2026_SOURCE.profileBase+GFP_PROFILE_SLUG[iso]:MIL_2026_SOURCE.aircraftUrl}" target="_blank" rel="noopener">GFP profile</a>
    <a href="${MIL_2026_SOURCE.activeUrl}" target="_blank" rel="noopener">Personnel</a>
    <a href="${MIL_2026_SOURCE.reserveUrl}" target="_blank" rel="noopener">Reserves</a>
    <a href="${MIL_2026_SOURCE.annualAgeUrl}" target="_blank" rel="noopener">Age cohort</a>
    <a href="${MIL_2026_SOURCE.aircraftUrl}" target="_blank" rel="noopener">Aircraft</a>
    <a href="${MIL_2026_SOURCE.tanksUrl}" target="_blank" rel="noopener">Tanks</a>
    <a href="${MIL_2026_SOURCE.navyUrl}" target="_blank" rel="noopener">Navy</a>
    <a href="https://www.sipri.org/visualizations/2026/world-nuclear-forces-january-2026" target="_blank" rel="noopener">SIPRI</a>
  </div>`;
  const tabs=[['overview','Overview'],['land','Land'],['air','Air'],['navy','Navy'],['strategic','Strategic'],['intel','Intel'],['sources','Sources']];
  return `<div class="profile-tabs" data-profile-tabs="army">${profileTabButtons('army',tabs,'overview')}
    ${profileTabPanel('army','overview',overview,true)}
    ${profileTabPanel('army','land',landPanel)}
    ${profileTabPanel('army','air',airPanel)}
    ${profileTabPanel('army','navy',navyPanel)}
    ${profileTabPanel('army','strategic',strategicPanel)}
    ${profileTabPanel('army','intel',intelPanel)}
    ${profileTabPanel('army','sources',sources)}
  </div>`;
}
function fmtMillions(value){
  if (value===null || value===undefined || value==='') return 'Not reported';
  const n=Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US',{maximumFractionDigits:2}) : 'Not reported';
}
function resourcePopupHtml(iso, c){
  const oil=OIL_PROFILE[iso], uranium=URANIUM_2026[iso];
  const oilSource=OIL_SOURCES[iso], tradeSource=OIL_TRADE_SOURCES[iso];
  const monthlyFromDaily=value=>value===null||value===undefined?null:value*30;
  const flowMonthly=value=>value===null||value===undefined?'Not reported':`~${fmtMillions(value)} M bbl`;
  let oilPanel;
  if (oil){
    const imports=oil.importsMonthly!==undefined?oil.importsMonthly:monthlyFromDaily(oil.importsDaily);
    const exports=oil.exportsMonthly!==undefined?oil.exportsMonthly:monthlyFromDaily(oil.exportsDaily);
    const production=oil.productionDaily===null||oil.productionDaily===undefined?'Not reported':`${fmtMillions(oil.productionDaily*1000000)} bbl/day`;
    oilPanel=profileMetricGrid([
      profileMetric('Proved reserves',oil.reserves||'Not reported'),
      profileMetric('Crude production',production,oil.productionYear||'Year not stated'),
      profileMetric('Crude imports / 30 days',flowMonthly(imports),oil.importsYear||''),
      profileMetric('Crude exports / 30 days',flowMonthly(exports),oil.exportsYear||'')
    ])+`<div class="profile-note">Monthly trade values are 30-day equivalents.</div>
      <details class="clean-details"><summary>Notes</summary><div class="profile-note">${esc(oil.note||'Crude and refined products are separate.')}</div></details>`;
  } else oilPanel='<div class="country-empty">No comparable oil profile. Unknown, not zero.</div>';

  const uraniumPanel=uranium ? profileMetricGrid([
    profileMetric('Mine output',uranium.output===null?'Not listed':`${fmtMillions(uranium.output)} tU/year`,'2024'),
    profileMetric('Identified resources',uranium.resources===null?'Not listed':`${fmtMillions(uranium.resources)} tU`,'2025'),
    profileMetric('Trade','Not in cited WNA table')
  ])+`<details class="clean-details"><summary>Definition</summary><div class="profile-note">Resources: reasonably assured plus inferred, up to US$130/kg U.</div></details>`
    : '<div class="country-empty">No separate WNA figure. Unknown, not zero.</div>';

  const indigenous=ENERGY_BALANCE_PAK.indigenous, imports=ENERGY_BALANCE_PAK.imports;
  const total=items=>items.reduce((sum,[,value])=>sum+Number(value),0).toFixed(3);
  const energyRows=items=>items.map(([name,value])=>`<div class="resource-flow"><span>${esc(name)}</span><b>${Number(value).toFixed(3)} MTOE</b></div>`).join('');
  const energyPanel=iso==='PAK' ? profileMetricGrid([
    profileMetric('Indigenous supply',`${total(indigenous)} MTOE`,'FY2023–24'),
    profileMetric('Imports',`${total(imports)} MTOE`,'FY2023–24')
  ])+`<details class="clean-details"><summary>Itemized balance</summary>
      <div class="energy-columns"><div><h5>Indigenous</h5>${energyRows(indigenous)}</div><div><h5>Imports</h5>${energyRows(imports)}</div></div>
      <div class="profile-note">Energy-balance flows, not reserves or capacity. ${esc(ENERGY_BALANCE_PAK.gasResource)}</div>
      <div class="clean-links"><a href="${ENERGY_BALANCE_PAK.source}" target="_blank" rel="noopener">Ministry source</a></div>
    </details>` : '<div class="country-empty">Pakistan energy balance only.</div>';

  const usgs=USGS_MINERALS_2026.filter(item=>item.rows[iso]);
  const local=LOCAL_RESOURCE_FACTS[iso]||[];
  const mineralTabs=[], mineralPanels=[];
  usgs.forEach((item,index)=>{
    const key=`usgs-${index}`, row=item.rows[iso];
    mineralTabs.push([key,item.symbol]);
    const panel=profileMetricGrid([
      profileMetric('Mine output',row.prod,'2025 estimate'),
      profileMetric('Reserves',row.reserve,item.unit)
    ])+`<details class="clean-details"><summary>Definition</summary><div class="profile-note">${esc(item.name)} · ${esc(item.unit)} · reserve definition is commodity-specific.</div>
      <div class="clean-links"><a href="${USGS_MCS_2026_URL}" target="_blank" rel="noopener">USGS MCS 2026</a></div></details>`;
    mineralPanels.push(profileTabPanel('mineral-items',key,panel,index===0));
  });
  local.forEach((item,index)=>{
    const key=`local-${index}`;
    const label=item.shortLabel||(['Reko Diq copper','Reko Diq gold','Thar coal','Other Pakistani minerals & gems'][index]||item.name);
    mineralTabs.push([key,label]);
    const panel=profileMetricGrid([
      profileMetric('Output / status',item.shortOutput||item.output),
      profileMetric('Resource / reserve',item.shortReserve||item.reserve)
    ])+`<details class="clean-details"><summary>Project note</summary><div class="profile-note">${esc(item.output)} · ${esc(item.reserve)} · ${esc(item.note)}</div></details>`;
    mineralPanels.push(profileTabPanel('mineral-items',key,panel,usgs.length===0&&index===0));
  });
  const resourceNote=RESOURCE_NOTES[iso]||'Missing country rows are not zero.';
  const mineralPanel=mineralTabs.length ? `<div class="profile-tabs" data-profile-tabs="mineral-items">
      ${profileTabButtons('mineral-items',mineralTabs,mineralTabs[0][0])}
      ${mineralPanels.join('')}
      <div class="profile-note">USGS dash = 0 · “Not available” or missing = unknown.</div>
      <details class="clean-details"><summary>Notes</summary><div class="profile-note">${esc(resourceNote)} Gemstones are separate from industrial diamond data.</div></details>
    </div>` : `<div class="country-empty">No listed figures. Unknown, not zero.</div><div class="profile-note">${esc(resourceNote)}</div>`;
  const sourceLinks=`<div class="clean-links">
      ${oilSource?`<a href="${oilSource}" target="_blank" rel="noopener">Oil profile</a>`:''}
      ${tradeSource?`<a href="${tradeSource}" target="_blank" rel="noopener">Oil trade</a>`:''}
      <a href="${URANIUM_SOURCE_URL}" target="_blank" rel="noopener">WNA uranium</a>
      <a href="${USGS_MCS_2026_URL}" target="_blank" rel="noopener">USGS minerals</a>
      ${iso==='PAK'?`<a href="${ENERGY_BALANCE_PAK.source}" target="_blank" rel="noopener">Pakistan energy</a><a href="https://www.barrick.com/English/operations/mineral-reserves-and-resources/default.aspx" target="_blank" rel="noopener">Reko Diq</a><a href="https://www.secmc.com.pk/" target="_blank" rel="noopener">Thar</a>`:''}
    </div>`;
  const tabs=[['oil','Oil'],['uranium','Uranium'],...(iso==='PAK'?[['energy','Energy']]:[]),['minerals','Minerals'],['sources','Sources']];
  return `<div class="profile-tabs" data-profile-tabs="resources">
    ${profileTabButtons('resources',tabs,'oil')}
    ${profileTabPanel('resources','oil',oilPanel,true)}
    ${profileTabPanel('resources','uranium',uraniumPanel)}
    ${iso==='PAK'?profileTabPanel('resources','energy',energyPanel):''}
    ${profileTabPanel('resources','minerals',mineralPanel)}
    ${profileTabPanel('resources','sources',sourceLinks)}
  </div>`;
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
    head = popHead('mil', c.flag||'🏳', c.name+' · Army',
      profile?'Public estimates · GFP 2026':'Limited public profile');
    body = militaryPopupHtml(s, iso, c, rank);
  }
  if (kind==='econ'){
    head = popHead('econ', c.flag||'🏳', c.name+' · Economy', 'Game estimate');
    const income = c.gdp*(c.tax||16)/100/12;
    const spend = income + c.gdp*(c.def||4)/100/12;
    const prof = income - spend;
    const goldVal = (c.gold||0)*0.128;
    body = `<div class="pgrid">
        ${tile('GDP',fmtB(c.gdp))}
        ${tile('Growth',c.growth.toFixed(1)+'%')}
        ${tile('Inflation',c.infl.toFixed(1)+'%')}
        ${tile('FX reserves',c.reserves?fmtB(c.reserves):'—')}
      </div>
      <details class="clean-details"><summary>More figures</summary><div class="pgrid">
        ${tile('Monthly output',fmtB(c.gdp/12))}
        ${tile('Govt income',fmtB(income))}
        ${tile('Govt spending',fmtB(spend))}
        ${tile('Monthly balance',(prof>=0?'+':'')+fmtB(prof),prof>=0?'good':'bad')}
        ${tile('Gold reserves',(c.gold||0).toLocaleString()+'t (~$'+goldVal.toFixed(1)+'B)')}
        ${tile('External debt',c.extDebt>0?fmtB(c.extDebt):'Reserve currency')}
        ${tile('Debt service',c.extDebt>0?fmtB(c.extDebt*0.055/12):'—')}
        ${tile('Tax / GDP',(c.tax||16).toFixed(0)+'%')}
      </div></details>`;
  }
  if (kind==='trade'){
    head = popHead('trade', c.flag||'🏳', c.name+' · Trade', 'Game estimate');
    const bal = c.exports - c.imports;
    const chips = arr => `<div class="chiprow">${String(arr||'Mixed goods').split(',').map(g=>`<span class="chipbtn">${esc(g.trim())}</span>`).join('')}</div>`;
    const partners=String(c.partners||'Global').split(',').map(p=>{
      const bits=p.trim().split(/\s+/), pct=parseFloat(bits[bits.length-1])||0, nm=pct?bits.slice(0,-1).join(' '):p.trim();
      return `<div class="frow small"><b>${esc(nm)}</b><span>${pct?pct+'%':''}</span></div>`;
    }).join('');
    body = `<div class="pgrid">
        ${tile('Exports / year',fmtB(c.exports))}
        ${tile('Imports / year',fmtB(c.imports))}
        ${tile('Balance / year',(bal>=0?'+':'')+fmtB(bal),bal>=0?'good':'bad')}
        ${tile('Trade volume',fmtB(c.exports+c.imports))}
      </div>
      <details class="clean-details"><summary>Goods & partners</summary>
        <h4 class="popsub">Exports</h4>${chips(c.expGoods)}
        <h4 class="popsub">Imports</h4>${chips(c.impGoods)}
        <h4 class="popsub">Partners</h4>${partners}
      </details>`;
  }
  if (kind==='ops'){
    const profile=MIL_2026[iso], disclosure=INTEL_DISCLOSURE[iso]||INTEL_DISCLOSURE.DEFAULT;
    const unknown=Object.keys(s.countries).filter(k=>k!==iso);
    const agencies=(profile&&profile.intel||[]).join('; ')||'Not listed';
    const publicPanel=`<details class="clean-details"><summary>Public intelligence</summary>
      ${profileMetricGrid([profileMetric('Agencies',agencies),profileMetric('Staffing','Not public')])}
      <div class="profile-note">${esc(disclosure.note)}</div>
      <details class="mil-unknown"><summary>Coverage · no verified entries (${unknown.length})</summary>
        <div class="mil-country-list">${countryPills(s,unknown)}</div></details>
    </details>`;
    if (iso==='PAK'){
      head=popHead('ops',c.flag||'🏳','Pakistan · Intel','Public information');
      body=publicPanel+`<div class="muted tiny">Game networks are managed in Orders → Intel.</div>`;
    } else {
      head=popHead('ops',c.flag||'🏳',c.name+' · Intel','Game simulation');
      const n=s.intel.networks[iso], lvl=n?n.lvl:0, heat=n?n.heat:0;
      const status=lvl===0?['NO NETWORK','bad']:lvl>=6?['DEEP','good']:lvl>=4?['ESTABLISHED','good']:lvl>=2?['ACTIVE','warn']:['INITIAL','warn'];
      const ctrl=Math.round(lvl/8*100), assets=lvl*7+(lvl>0?3:0);
      body=`<div class="ops-sim-banner">GAME ONLY</div>
        <div class="opstatus ${status[1]}"><span class="dot"></span> ${status[0]}</div>
        <div class="pgrid">${tile('Control',ctrl+'%',ctrl>=50?'good':ctrl>=25?'warn':'bad')}${tile('Game assets',lvl?String(assets):'0')}</div>
        <div class="gauge"><div class="glabel"><span>Network</span><span>${lvl}/8</span></div><div class="bar"><i style="width:${Math.max(2,ctrl)}%;background:linear-gradient(90deg,#0f766e,#2dd4bf)"></i></div></div>
        <div class="gauge"><div class="glabel"><span>Exposure</span><span class="${heat>6?'bad':heat>3?'warn':'good'}">${heat>6?'HIGH':heat>3?'Elevated':'Calm'}</span></div><div class="bar"><i class="${heat>6?'red':heat>3?'orange':'green'}" style="width:${clamp(heat*10,2,100)}%"></i></div></div>
        ${publicPanel}`;
    }
  }
  if (kind==='alli'){
    head = popHead('alli', c.flag||'🏳', c.name+' · Alliances', 'Member groups');
    const inB = Object.entries(ALLIANCES).filter(([,a])=>a.members.includes(iso));
    body = inB.length ? inB.map(([k,a])=>{
      const members=a.members.filter(x=>s.countries[x]);
      const flags=members.map(x=>s.countries[x].flag||'🏳').join('');
      return `<div class="allrow" onclick="openPopup('${k}','alliance')">
        <span class="aicon">${a.icon}</span><div class="amain"><b>${esc(a.name)}</b>
          <div class="muted tiny">${members.length} members</div><div class="flagstrip">${flags}</div>
        </div><span class="aopen">›</span></div>`;
    }).join('') : '<div class="country-empty">No listed alliances.</div>';
    if (iso==='PAK') body+=`<div class="muted tiny">Türkiye is a game-only addition to the Makkah pact.</div>`;
  }
  if (kind==='alliance'){
    const a = ALLIANCES[iso];
    if (!a){ closePopup(); return; }
    const mem = a.members.filter(x=>s.countries[x]);
    head = popHead('alliance', a.icon, a.name, `${mem.length} members · ${a.type}`);
    body = `<div class="alliance-member-list">${mem.map(x=>
        `<div class="alliance-member"><span>${s.countries[x].flag||'🏳'}</span><b>${esc(s.countries[x].name)}</b>${x==='PAK'?'<i>YOU</i>':''}</div>`).join('')}
      </div><details class="clean-details"><summary>About this group</summary>
        <div class="resource-note">${esc(a.note)}</div>
        <div class="muted tiny">Lead: ${esc(a.lead)} · Founded ${a.founded}</div>
      </details>`;
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
    head = popHead('res', c.flag||'🏳', c.name+' · Resources', 'Oil · Uranium · Minerals');
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
