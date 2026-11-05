/* ============================================================
   THE GREAT CHANGE — country dashboard + world map + power rankings
   ============================================================ */

const ORDER_GROUPS = [
  {id:'Economy', label:'Economy', cats:['Economy']},
  {id:'Domestic', label:'Home', cats:['Domestic']},
  {id:'Military', label:'Defense', cats:['Military','Nuclear']},
  {id:'Foreign', label:'Diplomacy', cats:['Foreign']},
  {id:'Projects', label:'Projects & operations', cats:['Intel']}
];
const BUDGET_META = [
  {key:'defense',  label:'🪖 Defense',           min:0.2, max:2.0, note:'Army, PAF, Navy, missiles. Drives readiness & power.'},
  {key:'dev',      label:'🏗 Development',        min:0.0, max:1.5, note:'Infrastructure, CPEC projects, energy. Drives growth.'},
  {key:'health',   label:'🏥 Health',             min:0.0, max:0.8, note:'Hospitals, polio drive. Drives approval.'},
  {key:'edu',      label:'🎓 Education',          min:0.0, max:0.8, note:'Schools, universities. Drives long-term growth & approval.'},
  {key:'interior', label:'🚔 Interior & Police',  min:0.05,max:0.8, note:'Police, CTD, Rangers. Squeezes TTP & BLA.'},
  {key:'subsidy',  label:'⚡ Subsidies',          min:0.0, max:1.5, note:'Power & fuel relief. Popular — and expensive. Cutting raises inflation.'},
  {key:'admin',    label:'🏛 Government & Admin', min:0.2, max:1.2, note:'Salaries, courts, ministries. Cutting too far breeds corruption.'}
];

function esc(x){ return String(x).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
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
    chip('☢ Scenario', P.nu, 'nuke') +
    (s.war ? chip('⚔ WAR', s.countries[s.war.enemy].flag, 'bad') : '');
}

/* ============ TAB: GOVERNMENT DASHBOARD ============ */
function tabGov(s){
  const P = s.countries.PAK;
  const publicMil = MIL_2026.PAK;
  const support = clamp(s.approval,0,100);
  const supportedPeople = P.pop * support / 100;
  const rev = G.monthlyRevenue(s), spend = G.monthlySpend(s), balance = rev-spend;
  const debtService = G.monthlyDebtService(s);
  const relations = s.innerInfluence.relationships;
  const leaderCard = leader => {
    const rawScore = Number(relations[leader.id]);
    const score = clamp(Number.isFinite(rawScore)?rawScore:50,0,100);
    const tone = score>=65?'green':score>=45?'orange':'red';
    const label = score>=70?'Strong':score>=55?'Constructive':score>=40?'Cautious':'Strained';
    return `<article class="leader-card">
      <div class="leader-card-head"><span>${esc(leader.role)}</span><b>${score.toFixed(0)}<small>/100</small></b></div>
      <h4>${esc(leader.name)}</h4>
      ${leader.status?`<div class="leader-status">${esc(leader.status)}</div>`:''}
      <div class="leader-relation"><span>In-game standing</span><strong>${label}</strong></div>
      <div class="bar"><i class="${tone}" style="width:${score}%"></i></div>
      <a class="leader-source" href="${esc(leader.source)}" target="_blank" rel="noopener noreferrer">Public reference ↗</a>
    </article>`;
  };
  let warcard = '';
  if (s.war){
    const w=s.war;
    warcard = `<section class="card warcard"><div class="section-title"><div><span class="eyebrow">ACTIVE CRISIS</span><h2>⚔ War vs ${esc(s.countries[w.enemy].name)}</h2></div><span class="war-month">Month ${w.months}</span></div>
      <div class="ministat"><div>Your losses <b>${w.lossesYou.toLocaleString()}</b></div><div>Their losses <b>${w.lossesThem.toLocaleString()}</b></div><div>World pressure <b class="${w.intlPressure>70?'bad':'warn'}">${w.intlPressure.toFixed(0)}/100</b></div></div>
      ${Object.values(w.fronts).map(f=>`<div class="faction"><div class="frow"><b>${esc(f.name)}</b><span class="${f.ctl<0.4?'bad':f.ctl>0.6?'good':'warn'}">${(f.ctl*100).toFixed(0)}% yours</span></div><div class="bar"><i class="${f.ctl<0.4?'red':f.ctl>0.6?'green':'orange'}" style="width:${f.ctl*100}%"></i></div></div>`).join('')}
      <div class="note">A high-pressure scenario. The game simulates escalation and international response each month.</div></section>`;
  }
  return `
  <section class="dashboard-heading">
    <div><span class="eyebrow">PAKISTAN · NATIONAL DASHBOARD</span><h1>Government</h1><p>One clear view of public support, national finances and your team’s in-game standing.</p></div>
    <div class="dashboard-heading-actions"><button class="btn" onclick="switchTab('projects')">🗂 View projects</button><button class="btn primary" onclick="openOrderGroup('Economy')">＋ Plan a decision</button></div>
  </section>

  <section class="government-hero">
    <div class="government-identity"><div class="dashboard-flag">🇵🇰</div><div><span class="eyebrow">PRESIDENT</span><h2>Zain Chaudary</h2><p>Islamic Republic of Pakistan · ${dateStr(s)}</p></div></div>
    <div class="government-kpis">
      <div class="government-kpi"><span>Public support</span><b>${support.toFixed(0)}%</b><small>~${supportedPeople.toFixed(1)}M people</small></div>
      <div class="government-kpi"><span>Stability</span><b>${s.stability.toFixed(0)}<small>/100</small></b><small>${esc(G.stabLabel(s.stability))}</small></div>
      <div class="government-kpi"><span>Treasury</span><b>${fmtB(P.reserves)}</b><small>available reserves</small></div>
      <div class="government-kpi"><span>Economy</span><b>${fmtB(P.gdp)}</b><small>${P.growth.toFixed(1)}% modeled growth</small></div>
    </div>
    <div class="government-support"><div class="frow"><b>People currently supporting your government</b><span>~${supportedPeople.toFixed(1)}M / ${P.pop.toFixed(1)}M</span></div><div class="bar bigbar"><i class="green" style="width:${support}%"></i></div><small>Approval is a game estimate, not a poll or measured population count.</small></div>
  </section>

  <section class="quick-links" aria-label="Government shortcuts">
    <button class="quick-link" onclick="switchTab('projects')"><span>🗂</span><b>Projects</b><small>See schemes & future outlook</small></button>
    <button class="quick-link" onclick="openOrderGroup('Domestic')"><span>🏠</span><b>Domestic priorities</b><small>Review a policy before issuing</small></button>
    <button class="quick-link" onclick="openOrderGroup('Projects')"><span>🌐</span><b>Game operations</b><small>Simulation-only records in Projects</small></button>
  </section>

  <section class="card inner-influence">
    <div class="section-title"><div><span class="eyebrow">YOUR WORKING CIRCLE</span><h2>Inner Influence</h2><p>Named public officeholders · reference date: ${esc(PAK_INFLUENCE.asOf)}</p></div><span class="leader-count">${PAK_INFLUENCE.institutions.length} institutions · ${PAK_INFLUENCE.regions.length} regional offices</span></div>
    <div class="influence-disclaimer">The names and offices are public references. “In-game standing” is a fictional relationship score for this scenario—not a factual claim about any real person’s relationship with Zain Chaudary.</div>
    <h3 class="subsection-title">National institutions</h3>
    <div class="leader-grid">${PAK_INFLUENCE.institutions.map(leaderCard).join('')}</div>
    <div class="section-title regional-title"><div><h3>Provincial & regional leadership</h3><p>Four provinces plus Gilgit-Baltistan and Azad Jammu & Kashmir—the six regions modeled in this game.</p></div></div>
    <div class="leader-grid regional-grid">${PAK_INFLUENCE.regions.map(leaderCard).join('')}</div>
  </section>

  <div class="dashboard-grid">
    <section class="card finance-card">
      <div class="section-title"><div><span class="eyebrow">PUBLIC FINANCES</span><h2>Treasury</h2></div><span class="status-pill ${P.reserves<6?'status-bad':'status-good'}">${P.reserves<6?'Under pressure':'Available'}</span></div>
      <div class="finance-grid">
        <div><span>Available reserves</span><b class="${P.reserves<6?'bad':'good'}">${fmtB(P.reserves)}</b></div>
        <div><span>Debt to repay</span><b class="warn">${fmtB(P.extDebt)}</b></div>
        <div><span>Debt / GDP</span><b>${P.debtGdp.toFixed(0)}%</b></div>
        <div><span>Import cover</span><b class="${P.reserves/(P.imports/12)<2?'bad':'good'}">${(P.reserves/(P.imports/12)).toFixed(1)} months</b></div>
      </div>
      <div class="finance-flow"><div><span>Monthly revenue</span><b class="good">+${fmtB(rev)}</b></div><div><span>Monthly spending</span><b class="warn">−${fmtB(spend)}</b></div><div><span>Projected balance</span><b class="${balance>=0?'good':'bad'}">${balance>=0?'+':''}${fmtB(balance)}</b></div></div>
      <small class="muted">Includes ${fmtB(debtService)} debt interest${s.war?' and modeled war costs':''}. A deficit draws reserves or adds loans.</small>
    </section>
    <section class="card internal-card">
      <div class="section-title"><div><span class="eyebrow">DOMESTIC CONDITIONS</span><h2>National pulse</h2></div><span class="status-pill">${esc(G.stabLabel(s.stability))}</span></div>
      <h3 class="subsection-title">Pressure groups · game model</h3>
      <div class="compact-bars">${['TTP','BLA','PTI','SECT'].map(k=>{const f=P.factions[k];return `<div class="compact-bar-row"><div><span>${esc(f.name)}</span><b class="${f.power>50?'bad':f.power>35?'warn':'good'}">${f.power.toFixed(0)}</b></div><div class="bar"><i class="${f.power>50?'red':f.power>35?'orange':'green'}" style="width:${clamp(f.power,0,100)}%"></i></div></div>`;}).join('')}</div>
      <h3 class="subsection-title">Regional mood · game model</h3>
      <div class="region-mood-grid">${P.provinces.map(pr=>`<div><span>${esc(pr.name)}</span><b class="${pr.mood<40?'bad':pr.mood>60?'good':'warn'}">${pr.mood.toFixed(0)}</b><div class="bar"><i class="${pr.mood<40?'red':pr.mood>60?'green':'orange'}" style="width:${clamp(pr.mood,0,100)}%"></i></div></div>`).join('')}</div>
    </section>
  </div>

  <section class="card budget-card">
    <div class="section-title"><div><span class="eyebrow">PLAYER CONTROLS</span><h2>Monthly budgets</h2><p>Adjust allocations; the simulation applies them on the next turn.</p></div><span class="budget-unit">$B / month</span></div>
    <div class="budgets compact-budgets">${BUDGET_META.map(m=>`<div class="brow"><div class="blabel"><b>${m.label}</b><div class="muted tiny">${m.note}</div></div><div class="bctl"><button class="btn mini" aria-label="Decrease ${esc(m.key)} budget" onclick="bump('${m.key}',-0.05)">−</button><input type="range" min="${m.min}" max="${m.max}" step="0.01" value="${s.budget[m.key]}" aria-label="${esc(m.label)} budget" oninput="setBudget('${m.key}',this.value)"><button class="btn mini" aria-label="Increase ${esc(m.key)} budget" onclick="bump('${m.key}',0.05)">+</button><b class="bval" id="bv_${m.key}">$${s.budget[m.key].toFixed(2)}B</b></div></div>`).join('')}</div>
    <div class="balanceline" id="balanceline">${balanceLine(s)}</div>
  </section>

  <section class="card military-snapshot">
    <div class="section-title"><div><span class="eyebrow">SEPARATE BASELINES</span><h2>Military snapshot</h2><p>Public estimates and game scenario values are shown separately.</p></div></div>
    <div class="mil-snapshot-columns">
      <div class="mil-snapshot-panel public-reference"><span class="snapshot-label">Public reference · estimates</span><div class="snapshot-values"><div>Active <b>${publicPeople(publicMil.active)}</b></div><div>Reserve <b>${publicPeople(publicMil.reserve)}</b></div><div>Tanks <b>${publicCount(publicMil.land.tanks[0])}</b></div><div>Aircraft <b>${publicCount(publicMil.air.total[0])}</b></div><div>Navy <b>${publicCount(publicMil.navy.total)}</b></div><div>Warheads <b>${publicCount(SIPRI_NUCLEAR_2026.PAK)}</b></div></div></div>
      <div class="mil-snapshot-panel game-reference"><span class="snapshot-label">Game scenario · not readiness data</span><div class="snapshot-values"><div>Troops <b>${P.troops.toLocaleString()}k</b></div><div>Tanks <b>${P.tanks.toLocaleString()}</b></div><div>Aircraft <b>${P.aircraft}</b></div><div>Ships <b>${P.ships}</b></div><div>Scenario variable <b>${P.nu} warheads</b></div><div>Readiness <b>${(s.readiness*100).toFixed(0)}%</b></div></div><small>Game readiness is a modeled gameplay value; serviceability is not available here.</small></div>
    </div>
  </section>
  ${warcard}
  ${renderProjectPreview(s)}`;
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
        <button class="act ops" onclick="openPopup('${iso}','ops')">Public brief</button>
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
  const tabs=[['overview','Overview'],['land','Land'],['air','Air'],['navy','Navy'],['strategic','Strategic'],['intel','Public agencies'],['sources','Sources']];
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
    const publicPanel=`<details class="clean-details"><summary>Public intelligence references</summary>
      ${profileMetricGrid([profileMetric('Agencies',agencies),profileMetric('Staffing','Not public')])}
      <div class="profile-note">${esc(disclosure.note)}</div>
      <details class="mil-unknown"><summary>Coverage · no verified entries (${unknown.length})</summary>
        <div class="mil-country-list">${countryPills(s,unknown)}</div></details>
    </details>`;
    if (iso==='PAK'){
      head=popHead('ops',c.flag||'🏳','Pakistan · Public brief','Public reporting & unknowns');
      body=publicPanel+`<button class="btn" onclick="switchTab('projects')">Open game operations in Projects</button>`;
    } else {
      head=popHead('ops',c.flag||'🏳',c.name+' · Public brief','Public reporting & unknowns');
      body=publicPanel+`<div class="muted tiny">Any fictional game-operation meters are grouped under Projects; this public-reference panel does not imply operational coverage.</div>`;
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

/* ============ PROJECT OUTLOOK ============ */
function projectProjection(project,s){
  if (project.type!=='scheme') return '';
  const P=s.countries.PAK;
  const now=clamp(s.approval,0,100);
  const future=clamp(now+(Number(project.supportLift)||0),0,100);
  const nowPeople=P.pop*now/100, futurePeople=P.pop*future/100;
  const region=project.regionId && P.provinces.find(p=>p.id===project.regionId);
  return `<div class="project-forecast">
    <div><span>Now · national approval</span><b>${now.toFixed(0)}% · ~${nowPeople.toFixed(1)}M people</b></div>
    <i aria-hidden="true">→</i>
    <div><span>Modelled in ${project.horizon||6} months</span><b>${future.toFixed(0)}% · ~${futurePeople.toFixed(1)}M people</b></div>
    <small>${project.supportLift>0?`Scenario estimate: +${project.supportLift} points`:'No modeled change'}${region?` · focused on ${esc(region.name)}`:''}. Not a poll or guarantee.</small>
  </div>`;
}
function renderSchemeCard(project,s,compact=false){
  return `<article class="scheme-card ${compact?'scheme-compact':''}">
    <div class="scheme-card-top"><span class="project-tag">${project.type==='scheme'?'DOMESTIC SCHEME':'INITIATIVE'}</span><span class="scheme-date">${esc(project.date||'')}</span></div>
    <h3>${esc(project.name)}</h3>
    <p>${esc(project.sector||'Government initiative')}${project.regionId?` · ${esc((s.countries.PAK.provinces.find(p=>p.id===project.regionId)||{}).name||'Pakistan')}`:''}</p>
    ${projectProjection(project,s)}
    ${!compact&&project.outcome?`<div class="project-outcome"><b>In-game response</b><span>${esc(project.outcome)}</span></div>`:''}
  </article>`;
}
function renderProjectPreview(s){
  const projects=(s.projects||[]).filter(p=>p.type==='scheme').slice(0,3);
  return `<section class="card project-preview">
    <div class="section-title"><div><span class="eyebrow">DELIVERY & PUBLIC OUTLOOK</span><h2>Projects by Zain Chaudary</h2><p>Launched schemes and their modelled future national support.</p></div><button class="btn" onclick="switchTab('projects')">All projects ↗</button></div>
    ${projects.length?`<div class="scheme-grid">${projects.map(p=>renderSchemeCard(p,s,true)).join('')}</div>`:`<div class="project-empty"><div class="empty-icon">＋</div><div><b>No schemes launched yet</b><p>Review a proposal first. Launching is optional; forecasts appear here after you issue a scheme.</p></div><button class="btn primary" onclick="openOrderGroup('Economy')">Review schemes</button></div>`}
  </section>`;
}
function projectRecordMarkup(record,s){
  const operation=!!record.simulationOnly;
  const kind=operation?'GAME SIMULATION':record.type==='scheme'?'SCHEME':'INITIATIVE';
  return `<article class="country-project-record">
    <div class="project-record-head"><span class="project-tag ${operation?'tag-sim':''}">${kind}</span><time>${esc(record.date||'')}</time></div>
    <b>${esc(record.name||'Policy')}</b>
    ${!operation&&record.sector?`<small>${esc(record.sector)}</small>`:''}
    ${record.outcome?`<small class="${operation?'sim-only-outcome':'project-record-outcome'}">In-game response: ${esc(record.outcome)}</small>`:''}
    ${operation?`<small class="sim-only-note">Fictional game record only · no real-world activity or coverage is implied.</small>`:''}
  </article>`;
}
function projectsByCountry(s){
  const groups={};
  for (const project of (s.projects||[])){
    const iso=project.countryIso||'PAK';
    (groups[iso] ||= []).push(project);
  }
  for (const op of (s.ops||[])){
    const iso=op.countryIso||'PAK';
    (groups[iso] ||= []).push(op);
  }
  return Object.entries(groups).sort((a,b)=>{
    if(a[0]==='PAK') return -1;
    if(b[0]==='PAK') return 1;
    return (s.countries[a[0]]?.name||a[0]).localeCompare(s.countries[b[0]]?.name||b[0]);
  }).map(([iso,records])=>{
    const country=s.countries[iso];
    return `<article class="country-project-card">
      <div class="country-project-head"><span>${country?country.flag:'🏳'} ${esc(country?country.name:iso)}</span><small>${records.length} record${records.length===1?'':'s'}</small></div>
      <div class="country-project-list">${records.slice(0,5).map(record=>projectRecordMarkup(record,s)).join('')}</div>
      ${records.length>5?`<small class="muted">+ ${records.length-5} older records</small>`:''}
    </article>`;
  }).join('') || `<div class="project-empty"><div class="empty-icon">🗂</div><div><b>No country projects recorded</b><p>Launched schemes and diplomacy/operations records will be grouped here.</p></div></div>`;
}
function tabProjects(s){
  const allProjects=s.projects||[];
  const schemes=allProjects.filter(p=>p.type==='scheme');
  const initiatives=allProjects.filter(p=>p.type==='initiative');
  const ops=s.ops||[];
  const countryMarkup=projectsByCountry(s);
  const P=s.countries.PAK;
  const projected=clamp(s.approval+(schemes[0]?Number(schemes[0].supportLift)||0:0),0,100);
  return `<section class="dashboard-heading">
      <div><span class="eyebrow">PLANS · DELIVERY · GAME SIMULATION</span><h1>Projects</h1><p>Track launched schemes, see a cautious support outlook and review projects by country.</p></div>
      <div class="dashboard-heading-actions"><button class="btn" onclick="openOrderGroup('Projects')">🌐 Game operations</button><button class="btn primary" onclick="openOrderGroup('Economy')">＋ Review a scheme</button></div>
    </section>
    <section class="project-overview">
      <div class="project-overview-stat"><span>Launched schemes</span><b>${schemes.length}</b><small>Pakistan domestic projects</small></div>
      <div class="project-overview-stat"><span>International initiatives</span><b>${initiatives.length}</b><small>Diplomacy & cooperation</small></div>
      <div class="project-overview-stat"><span>Game operation records</span><b>${ops.length}</b><small>Simulation only</small></div>
      <div class="project-overview-stat"><span>National support outlook</span><b>${schemes.length?projected.toFixed(0)+'%':'—'}</b><small>${schemes.length?`~${(P.pop*projected/100).toFixed(1)}M modeled people`:'Launch a scheme to see an estimate'}</small></div>
    </section>
    <section class="card project-section">
      <div class="section-title"><div><span class="eyebrow">PAKISTAN</span><h2>Launched schemes</h2><p>Each forecast is a simple scenario estimate based on current approval—not measured satisfaction.</p></div><button class="btn" onclick="openOrderGroup('Economy')">Browse schemes</button></div>
      ${schemes.length?`<div class="scheme-grid">${schemes.map(p=>renderSchemeCard(p,s)).join('')}</div>`:`<div class="project-empty"><div class="empty-icon">＋</div><div><b>No schemes launched yet</b><p>Nothing has been launched. Describe a goal or review a proposal; issuing an order is always your choice.</p></div><button class="btn primary" onclick="openOrderGroup('Economy')">Review first scheme</button></div>`}
    </section>
    <section class="card project-section">
      <div class="section-title"><div><span class="eyebrow">BY COUNTRY</span><h2>Projects by Zain Chaudary</h2><p>Domestic schemes and international initiatives grouped by their in-game destination.</p></div></div>
      ${allProjects.length||ops.length?`<div class="country-project-grid">${countryMarkup}</div>`:`${countryMarkup}`}
    </section>
    <section class="card project-section game-operations-section">
      <div class="section-title"><div><span class="eyebrow">FICTIONAL GAME SYSTEM</span><h2>Operations & network levels</h2><p>Placed in Projects as requested. These are gameplay meters and records, not real intelligence coverage.</p></div><button class="btn" onclick="openOrderGroup('Projects')">Review game operations</button></div>
      <div class="ops-sim-banner">Simulation only: network levels and exposure are fictional. They do not establish real agents, staffing, access, geographic coverage or ongoing activity.</div>
      <div class="game-network-grid">${Object.entries(s.intel.networks||{}).map(([iso,n])=>{const c=s.countries[iso];const lvl=clamp(Number(n.lvl)||0,0,8);const heat=clamp(Number(n.heat)||0,0,10);return `<article class="game-network-card"><div><b>${c?c.flag+' '+esc(c.name):esc(iso)}</b><span>Level ${lvl}/8 · exposure ${heat.toFixed(1)}/10</span></div><div class="bar"><i class="${heat>6?'red':'green'}" style="width:${lvl/8*100}%"></i></div></article>`;}).join('')}</div>
      ${ops.length?`<h3 class="subsection-title">Recent fictional game records</h3><div class="sim-record-list">${ops.slice(0,6).map(op=>projectRecordMarkup(op,s)).join('')}</div>`:`<div class="project-empty compact-empty"><div><b>No game-operation orders issued</b><p>These optional mechanics remain idle unless you choose one.</p></div></div>`}
      <p class="profile-note">Network level = simulated depth; exposure = simulated heat. Neither is a verified real-world count or country-coverage claim. Public reporting and unknowns remain separate in the country reference panels.</p>
    </section>`;
}

/* ============ TAB: ORDERS ============ */
function actionCooldown(s,a){
  const until=s.cooldowns[a.id], now=s.date.y*12+s.date.m;
  return until&&now<until?until-now:0;
}
function actionBlockReason(s,a){
  if (s.gameOver) return 'The campaign has ended.';
  if (a.avail&&!a.avail(s)) return 'The required situation is not in place yet.';
  const cd=actionCooldown(s,a);
  if (cd) return `Available again in ${cd} month${cd===1?'':'s'}.`;
  if (a.cost.money&&s.countries.PAK.reserves<a.cost.money) return `Needs ${fmtB(a.cost.money)} in available reserves.`;
  if (a.cost.pc&&s.pc<a.cost.pc) return `Needs ${a.cost.pc} political capital.`;
  return '';
}
function actionTargetControl(s,a){
  let options=[], current='', setter='';
  if (a.target==='diploTarget'){
    options=Object.keys(s.countries).filter(k=>k!=='PAK').sort((x,y)=>s.countries[y].gdp-s.countries[x].gdp).slice(0,40);
    current=window._dipTarget||'CHN'; setter='setDip';
  } else if (a.target==='covertTarget'){
    options=['IND','AFG','USA','IRN','ISR','GBR','BGD'].filter(k=>s.countries[k]);
    current=window._opTarget||'IND'; setter='setOp';
  } else if (a.target==='exercisePartner'){
    options=['CHN','SAU','TUR','ARE','AZE'].filter(k=>s.countries[k]);
    current=window._exTarget||'CHN'; setter='setEx';
  }
  if (!options.length) return '';
  return `<label class="target-picker">Country<select aria-label="Choose country" onchange="${setter}(this.value);refreshBrief()">${options.map(k=>`<option value="${esc(k)}" ${current===k?'selected':''}>${flag(k)} ${esc(s.countries[k].name)}</option>`).join('')}</select></label>`;
}
function currentTargetIso(s,a){
  if(a.target==='diploTarget') return window._dipTarget||'CHN';
  if(a.target==='covertTarget') return window._opTarget||'IND';
  if(a.target==='exercisePartner') return window._exTarget||'CHN';
  return null;
}
function simulatedContext(s,a){
  const P=s.countries.PAK;
  const parts=[];
  if(a.cat==='Economy') parts.push(`Reserves are ${fmtB(P.reserves)}; inflation is ${P.infl.toFixed(1)}%. The simulated result depends on the scheme and current fiscal room.`);
  if(a.cat==='Domestic') parts.push(`Current national approval is ${s.approval.toFixed(0)}% and stability is ${s.stability.toFixed(0)}/100; local mood and security conditions can affect the in-game response.`);
  if(a.cat==='Military'||a.cat==='Nuclear') parts.push(`The game uses scenario readiness (${(s.readiness*100).toFixed(0)}%) and political capital (${s.pc.toFixed(0)}). This is not a real-world capability or readiness assessment.`);
  if(a.cat==='Foreign'){
    const iso=currentTargetIso(s,a), c=iso&&s.countries[iso];
    if(c&&c.rel&&c.rel.PAK!==undefined) parts.push(`Current modeled relations with ${c.name}: ${c.rel.PAK.toFixed(0)}/100 (${G.relLabel(c.rel.PAK)}).`);
  }
  if(a.cat==='Intel') parts.push('This is a fictional game operation. Its outcome is probabilistic and is logged only inside the simulation; it is not a real-world activity or coverage claim.');
  return parts.join(' ');
}
function renderPlannerBriefing(s){
  const actionId=window._planAction;
  const notice=window._plannerNotice;
  if(!actionId) return notice?`<div class="planner-notice"><b>Cabinet desk</b><p>${esc(notice)}</p><small>No order has been issued and the game state is unchanged.</small></div>`:'';
  const a=ACTIONS.find(item=>item.id===actionId);
  if(!a) return '';
  const reason=actionBlockReason(s,a), targetControl=actionTargetControl(s,a);
  const cost=[a.cost.money?`${fmtB(a.cost.money)} reserves`:null,a.cost.pc?`${a.cost.pc} political capital`:null].filter(Boolean).join(' + ')||'No direct cost';
  const context=simulatedContext(s,a);
  const suggestedText=window._orderText?`Your intent: “${esc(window._orderText)}”`:'';
  return `<div class="planner-briefing">
    <div class="briefing-head"><div><span class="eyebrow">SIMULATED CABINET BRIEF</span><h3>${esc(a.name)}</h3></div><span class="status-pill ${reason?'status-bad':'status-good'}">${reason?'Not available':'Ready to review'}</span></div>
    ${suggestedText?`<p class="briefing-intent">${suggestedText}</p>`:''}
    <div class="briefing-columns"><div><b>Likely in-game trade-off</b><p>${esc(a.desc)}</p></div><div><b>Current context</b><p>${esc(context||'The simulation will use this policy’s scripted effects and current state.')}</p></div></div>
    <div class="briefing-meta"><span>Estimated cost <b>${esc(cost)}</b></span><span>Approval now <b>${s.approval.toFixed(0)}%</b></span><span>Political capital <b>${s.pc.toFixed(0)}</b></span></div>
    ${targetControl}
    ${reason?`<div class="order-blocked">${esc(reason)}</div>`:''}
    <div class="briefing-actions"><button class="btn primary" ${reason?'disabled':''} onclick="issue('${a.id}')">Issue this order</button><button class="btn" onclick="dismissBrief()">Not now</button></div>
    <small class="briefing-disclaimer">This is a scripted game briefing, not an AI or real-world policy forecast. Nothing changes until you press “Issue this order”.</small>
  </div>`;
}
function tabOrders(s){
  const activeGroup=ORDER_GROUPS.find(group=>group.id===(window._ordersCat||'Economy'))||ORDER_GROUPS[0];
  const actions=ACTIONS.filter(a=>activeGroup.cats.includes(a.cat));
  return `<section class="dashboard-heading orders-heading"><div><span class="eyebrow">OPTIONAL · YOU DECIDE</span><h1>Orders</h1><p>Describe a goal, review the simulated consequences, then decide whether to issue anything.</p></div></section>
    <section class="planner-card">
      <div class="planner-intro"><div class="planner-symbol">✦</div><div><h2>What do you want to achieve?</h2><p>The cabinet desk matches your description to a scripted game action. If no match exists, it will say so rather than invent a policy.</p></div></div>
      <label class="prompt-label" for="policy-prompt">Your intended action</label>
      <textarea id="policy-prompt" maxlength="320" placeholder="For example: Launch a solar and energy security programme, or open talks with the opposition…" oninput="window._orderText=this.value">${esc(window._orderText||'')}</textarea>
      <div class="planner-submit-row"><button class="btn primary" onclick="previewPlan()">Get a simulated response</button><span>Draft only · no cost · nothing is issued</span></div>
      <div id="planner-response">${renderPlannerBriefing(s)}</div>
    </section>
    <section class="order-picker-section"><div class="section-title"><div><span class="eyebrow">SCRIPTED OPTIONS</span><h2>Review an order</h2><p>Every action opens a briefing first. There is no one-click issue button.</p></div></div>
      <div class="order-groupbar">${ORDER_GROUPS.map(group=>`<button class="order-group ${group.id===activeGroup.id?'on':''}" onclick="setCat('${group.id}')">${esc(group.label)}<small>${ACTIONS.filter(a=>group.cats.includes(a.cat)).length}</small></button>`).join('')}</div>
      <div class="order-grid">${actions.map(a=>{
        const reason=actionBlockReason(s,a), cost=[a.cost.money?`${fmtB(a.cost.money)}`:null,a.cost.pc?`${a.cost.pc} PC`:null].filter(Boolean).join(' · ')||'No direct cost';
        return `<article class="order-option ${reason?'order-option-off':''}"><div class="order-option-top"><span class="order-tag">${esc(activeGroup.label)}</span><span class="order-cost">${esc(cost)}</span></div><h3>${esc(a.name)}</h3><p>${esc(a.desc)}</p><div class="order-option-footer">${reason?`<small>${esc(reason)}</small>`:'<small>Review consequences before deciding.</small>'}<button class="btn" onclick="reviewAction('${a.id}')">Review</button></div></article>`;
      }).join('')}</div>
    </section>`;
}
function inferCountryFromText(text){
  const lower=String(text||'').toLowerCase(), s=G.getState();
  const words=lower.split(/[^a-z0-9]+/).filter(Boolean);
  const mentioned=term=>term.includes(' ')?lower.includes(term):words.includes(term);
  const entries=Object.entries(s.countries).sort((a,b)=>b[1].name.length-a[1].name.length);
  for(const [iso,country] of entries){
    if(lower.includes(country.name.toLowerCase())||mentioned(iso.toLowerCase())) return iso;
  }
  const aliases={USA:['us','america','washington'],CHN:['china','beijing'],IND:['india','delhi'],IRN:['iran','tehran'],AFG:['afghan','kabul'],SAU:['saudi','riyadh'],ARE:['uae','emirates'],TUR:['turkey','turkiye'],GBR:['britain','uk','london'],ISR:['israel','tel aviv'],PSE:['palestine','gaza'],BGD:['bangladesh']};
  for(const [iso,terms] of Object.entries(aliases)) if(terms.some(mentioned)) return iso;
  return null;
}
function previewPlan(){
  const field=document.getElementById('policy-prompt');
  const text=(field?field.value:window._orderText||'').trim();
  window._orderText=text;
  window._planAction=null;
  if(!text){window._plannerNotice='Write a short goal first. I will match it only to an existing scripted game action.';render();return;}
  const lower=text.toLowerCase();
  const rules=[
    [/\b(solar|energy|power|electricity|load.?shedding|dam|thar)\b/,'energy_invest'],
    [/\b(agri|agriculture|farm|farmer|food price|fertili[sz]er|crop|wheat)\b/,'agri_emergency'],
    [/\b(export|textile|it park|it export|jobs|manufactur)\b/,'export_push'],
    [/\b(balochistan|baloch|reko diq)\b/,/\b(talk|dialogue|peace|reconcil)\b/.test(lower)?'bla_talks':'bla_dev'],
    [/\b(pti|opposition|political dialogue|protest)\b/,'pti_talks'],
    [/\b(kurram|sectarian|jirga)\b/,'sect_jirga'],
    [/\b(police|judiciary|court|justice reform)\b/,'police_reform'],
    [/\b(cut taxes|tax relief|lower taxes)\b/,'tax_cut'],
    [/\b(tax|gst|revenue base)\b/,'tax_up'],
    [/\b(subsid|fuel price|electricity price)\b/,'subsidy_cut'],
    [/\b(navy|submarine|hangor)\b/,'hangor'],
    [/\b(air force|fighter jet|jf.?17|aircraft purchase)\b/,'jf17'],
    [/\b(defen[cs]e budget|military budget|border posture)\b/,'def_budget_up'],
    [/\b(imf|tranche)\b/,'imf_tranche'],
    [/\b(afghan|kabul|ttp sanctuary|ttp)\b/,/\b(trade|transit)\b/.test(lower)?'afg_trade':'afg_pressure'],
    [/\b(state visit|diplomatic visit|visit)\b/,'visit'],
    [/\b(india|loc|line of control|backchannel)\b/,/\b(trade|market access|tariff)\b/.test(lower)?'trade_deal':'india_backchannel'],
    [/\b(trade deal|trade agreement|market access|trade with)\b/,'trade_deal'],
    [/\b(cyber|covert|secret operation|influence campaign)\b/,'covert_disinfo']
  ];
  const match=rules.find(([pattern])=>pattern.test(lower));
  if(!match){window._plannerNotice='I could not match that request to a specific scripted action. Try a goal such as energy security, agriculture, exports, Balochistan development, dialogue, police reform, diplomacy or defence—or review a listed action below.';render();return;}
  window._planAction=match[1];
  window._plannerNotice=null;
  const selectedAction=ACTIONS.find(a=>a.id===match[1]);
  const mentionedCountry=inferCountryFromText(text);
  if(selectedAction&&mentionedCountry){
    if(selectedAction.target==='diploTarget')window._dipTarget=mentionedCountry;
    if(selectedAction.target==='covertTarget')window._opTarget=mentionedCountry;
    if(selectedAction.target==='exercisePartner')window._exTarget=mentionedCountry;
  }
  window._ordersCat=ORDER_GROUPS.find(group=>group.cats.includes(selectedAction?.cat))?.id||'Economy';
  render();
}
function dismissBrief(){window._planAction=null;window._plannerNotice=null;render();}
function reviewAction(id){
  const a=ACTIONS.find(item=>item.id===id);
  if(!a)return;
  window._planAction=id;window._plannerNotice=null;window._orderText='';
  window._ordersCat=ORDER_GROUPS.find(group=>group.cats.includes(a.cat))?.id||'Economy';
  render();
  document.querySelector('.planner-card')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function refreshBrief(){const response=document.getElementById('planner-response');if(response)response.innerHTML=renderPlannerBriefing(G.getState());}
function setCat(category){window._ordersCat=category;render();}
function openOrderGroup(category){window._ordersCat=category;window._tab='orders';render();}
function setDip(v){window._dipTarget=v;}
function setOp(v){window._opTarget=v;}
function setEx(v){window._exTarget=v;}
function issue(id){
  const s=G.getState(),a=ACTIONS.find(item=>item.id===id);
  if(!a)return;
  if(!G.actionAvailable(s,a)){toast(actionBlockReason(s,a)||'Order unavailable');return;}
  if(a.target==='diploTarget'){if(!window._dipTarget)window._dipTarget='CHN';s._dipTarget=window._dipTarget;}
  if(a.target==='covertTarget'){if(!window._opTarget)window._opTarget='IND';s._opTarget=window._opTarget;}
  if(a.target==='exercisePartner'){if(!window._exTarget)window._exTarget='CHN';s._exTarget=window._exTarget;}
  G.doAction(s,a);
  window._planAction=null;window._plannerNotice=null;window._orderText='';
  toast('Order issued: '+a.name);
  render();
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
    tab==='gov'      ? tabGov(s) :
    tab==='projects' ? tabProjects(s) :
    tab==='orders'   ? tabOrders(s) :
    tabNews(s);
  document.querySelectorAll('.tabbtn').forEach(b=>b.classList.toggle('on', b.dataset.tab===tab));
  const tick = document.getElementById('ticker');
  if (tick) tick.textContent = s.news.slice(0,10).map(n=>n.t).join('   ●   ');
  showEventModal();
}
function switchTab(t){ window._tab = t; render(); }
