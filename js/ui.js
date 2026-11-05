/* ============================================================
   UI — dashboard rendering, orders, modals, news ticker
   ============================================================ */

const CATS = ['Economy','Domestic','Military','Intel','Foreign','Nuclear'];

function esc(x){ return String(x).replace(/</g,'&lt;'); }
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1800);
}

/* ---------- top bar ---------- */
function renderTop(s){
  const P = s.countries.PAK;
  const cover = P.reserves / (P.imports/12);
  document.getElementById('date').textContent = dateStr(s);
  document.getElementById('topstats').innerHTML = `
    ${stat('Approval', s.approval.toFixed(0)+'%', s.approval<35?'bad':s.approval>55?'good':'')}
    ${stat('Stability', s.stability.toFixed(0), s.stability<35?'bad':'')}
    ${stat('Political Capital', s.pc.toFixed(0), '')}
    ${stat('Reserves', fmtB(P.reserves) + ' (' + cover.toFixed(1) + 'mo)', cover<2?'bad':'good')}
    ${stat('GDP', fmtB(P.gdp), '')}
    ${stat('Growth', P.growth.toFixed(1)+'%', P.growth<3?'warn':'good')}
    ${stat('Inflation', P.infl.toFixed(1)+'%', P.infl>10?'bad':'')}
    ${stat('Rupee', '₨' + P.fx.toFixed(0), P.fx>295?'bad':'')}
    ${stat('Debt/GDP', P.debtGdp.toFixed(0)+'%', P.debtGdp>80?'bad':'')}
    ${stat('Oil', '$'+s.oil.toFixed(0), s.oil>100?'warn':'')}
  `;
}
const stat = (k,v,cls='') => `<div class="stat ${cls}"><span>${k}</span><b>${v}</b></div>`;

/* ---------- tab: Pakistan overview ---------- */
function tabPakistan(s){
  const P = s.countries.PAK;
  const F = P.factions;
  const bar = (v,cls='') => `<div class="bar"><i class="${cls}" style="width:${clamp(v,0,100)}%"></i></div>`;
  return `
  <div class="grid2">
    <div class="card">
      <h3>🇵🇰 The State</h3>
      <table class="kv">
        <tr><td>Population</td><td>${fmtPop(P.pop)}</td></tr>
        <tr><td>GDP (nominal)</td><td>${fmtB(P.gdp)}</td></tr>
        <tr><td>Growth</td><td>${P.growth.toFixed(1)}%</td></tr>
        <tr><td>Inflation</td><td>${P.infl.toFixed(1)}%</td></tr>
        <tr><td>Reserves (SBP)</td><td>${fmtB(P.reserves)}</td></tr>
        <tr><td>External debt</td><td>${fmtB(P.extDebt)}</td></tr>
        <tr><td>Tax/GDP</td><td>${P.taxGdp.toFixed(1)}%</td></tr>
        <tr><td>Deficit</td><td>${P.deficit.toFixed(1)}%</td></tr>
        <tr><td>Remittances</td><td>$${P.remit}B/yr</td></tr>
        <tr><td>Exports / Imports</td><td>$${P.exports}B / $${P.imports}B</td></tr>
      </table>
      <div class="note">${esc(P.econNotes)}</div>
    </div>
    <div class="card">
      <h3>🕊 Internal Security</h3>
      ${['TTP','BLA','PTI','SECT'].map(k=>`
        <div class="faction">
          <div class="frow"><b>${esc(F[k].name)}</b><span class="${F[k].power>50?'bad':''}">${F[k].power.toFixed(0)}/100</span></div>
          ${bar(F[k].power, F[k].power>50?'red':F[k].power>35?'orange':'green')}
          <div class="muted small">${esc(F[k].note)}</div>
        </div>`).join('')}
    </div>
    <div class="card">
      <h3>🗺 Provinces</h3>
      ${P.provinces.map(p=>`
        <div class="faction">
          <div class="frow"><b>${p.name}</b><span class="${p.mood<40?'bad':''}">mood ${p.mood.toFixed(0)}</span></div>
          ${bar(p.mood, p.mood<40?'red':p.mood<55?'orange':'green')}
          <div class="muted small">${esc(p.note)}</div>
        </div>`).join('')}
    </div>
    <div class="card">
      <h3>🎖 Armed Forces</h3>
      <table class="kv">
        <tr><td>Active troops</td><td>${P.troops.toLocaleString()}k</td></tr>
        <tr><td>Tanks</td><td>${P.tanks.toLocaleString()}</td></tr>
        <tr><td>Combat aircraft</td><td>${P.aircraft}</td></tr>
        <tr><td>Warheads</td><td>${P.nu} ☢</td></tr>
        <tr><td>Defense budget</td><td>$${P.defense.toFixed(1)}B</td></tr>
        <tr><td>Readiness</td><td>${(s.readiness*100).toFixed(0)}%</td></tr>
        <tr><td>Border posture (India)</td><td>${'▮'.repeat(s.militPosture)}${'▯'.repeat(5-s.militPosture)}</td></tr>
      </table>
      ${Object.entries(P.forces).map(([k,f])=>`<div class="frow small"><b>${f.label}</b><span>${f.strength}/100 — ${esc(f.note)}</span></div>`).join('')}
    </div>
    <div class="card">
      <h3>🤝 Advisors</h3>
      ${P.advisors.map(a=>`<div class="advisor"><b>${esc(a.name)}</b> <span class="muted small">— ${a.role}</span><div class="muted small">${esc(a.note)}</div></div>`).join('')}
    </div>
    <div class="card">
      <h3>📜 Programs & Flags</h3>
      <table class="kv">
        <tr><td>IMF program</td><td>${s.flags.imfActive? `Active — ${P.programs.imf.tranchesLeft} tranches left`:'❌ Not active'}</td></tr>
        <tr><td>CPEC</td><td>Phase 2.0 (ML-1, industrial relocation)</td></tr>
        <tr><td>Saudi Defense Pact</td><td>Signed Sep 2025 — mutual defense</td></tr>
        <tr><td>Money printing</td><td>${s.flags.moneyPrinting?'🔴 ON — inflation bomb':'No'}</td></tr>
        <tr><td>Khan released</td><td>${s.flags.khanReleased?'Yes':'No (in Adiala)'}</td></tr>
        <tr><td>Full-spectrum doctrine</td><td>${s.flags.fullSpectrum?'Yes':'Credible minimum'}</td></tr>
      </table>
    </div>
  </div>`;
}

/* ---------- tab: country detail ---------- */
function tabCountry(s){
  const iso = selectedISO;
  if (!iso || !s.countries[iso]) return '<div class="card"><p class="muted">Click a country on the map to inspect it.</p></div>';
  const c = s.countries[iso];
  const rel = c.rel && c.rel.PAK !== undefined ? c.rel.PAK : 50;
  const blocs = Object.entries(BLOCS).filter(([k,v])=>v.includes(iso)).map(([k])=>k).join(', ') || '—';
  const relToYou = iso==='PAK' ? '' : `<tr><td>Relations with you</td><td><b style="color:${relColor(rel)}">${rel.toFixed(0)}</b> ${'●'.repeat(Math.max(1,Math.round((rel+100)/20)))}</td></tr>`;
  return `
  <div class="card">
    <h3>${c.flag||'🏳'} ${esc(c.name)} <span class="muted small">${iso}</span></h3>
    <table class="kv">
      ${relToYou}
      <tr><td>Population</td><td>${fmtPop(c.pop)}</td></tr>
      <tr><td>GDP</td><td>${fmtB(c.gdp)}</td></tr>
      <tr><td>Growth / Inflation</td><td>${c.growth.toFixed(1)}% / ${c.infl.toFixed(1)}%</td></tr>
      <tr><td>Government</td><td>${esc(c.gov)}</td></tr>
      <tr><td>Leader</td><td>${esc(c.leader)}</td></tr>
      <tr><td>Military</td><td>${c.troops.toLocaleString()}k troops · ${c.tanks.toLocaleString()} tanks · ${c.aircraft} combat aircraft · ${c.ships} ships</td></tr>
      <tr><td>Nuclear warheads</td><td>${c.nu? c.nu+' ☢':'None'}</td></tr>
      <tr><td>Intel agency</td><td>${esc(c.agency||'—')}</td></tr>
      <tr><td>Defense budget</td><td>$${(c.defense||0).toFixed(1)}B</td></tr>
      <tr><td>Internal stability</td><td>${c.st||55}/100</td></tr>
      <tr><td>Blocs</td><td>${blocs}</td></tr>
    </table>
    ${c.un? `<div class="note">⚠ ${esc(c.un)}</div>`:''}
    ${iso==='IND'? '<div class="note">Adversary. 4x your economy, 2x your troops, matching arsenal. Deterrence is the strategy — not fantasies of conventional victory.</div>':''}
    ${iso==='CHN'? '<div class="note">All-weather friend and banker. CPEC patron. Expects loyalty and access.</div>':''}
    ${iso==='USA'? '<div class="note">Transactional superpower. Aid, sanctions and drone bases — all negotiable, all priced.</div>':''}
    ${iso==='SAU'? '<div class="note">Financial patron since the 70s. Defense pact 2025 made it strategic.</div>':''}
    ${iso==='AFG'? '<div class="note">The TTP sanctuary problem lives here. Every KP funeral traces back across this border.</div>':''}
  </div>`;
}

/* ---------- tab: orders ---------- */
function tabOrders(s){
  const activeCat = window._ordersCat || 'Economy';
  return `
    <div class="catbar">${CATS.map(c=>`<button class="cat ${c===activeCat?'on':''}" onclick="setCat('${c}')">${c}</button>`).join('')}</div>
    <div class="orders">
      ${ACTIONS.filter(a=>a.cat===activeCat).map(a=>{
        const ok = G.actionAvailable(s,a);
        const cdUntil = s.cooldowns[a.id];
        const cd = cdUntil && (s.date.y*12+s.date.m) < cdUntil ? cdUntil - (s.date.y*12+s.date.m) : 0;
        const needsTarget = a.target;
        let tgt = '';
        if (a.target==='diploTarget'){
          const opts = Object.keys(s.countries).filter(k=>k!=='PAK').sort((x,y)=>(s.countries[y].gdp)-(s.countries[x].gdp)).slice(0,40);
          tgt = `<select onchange="setDip(this.value)">${opts.map(k=>`<option value="${k}" ${window._dipTarget===k?'selected':''}>${s.countries[k].flag||''} ${esc(s.countries[k].name)}</option>`).join('')}</select>`;
        } else if (a.target==='covertTarget'){
          const opts = ['IND','AFG','USA','IRN','ISR','GBR','BGD'].filter(k=>s.countries[k]);
          tgt = `<select onchange="setOp(this.value)">${opts.map(k=>`<option value="${k}" ${window._opTarget===k?'selected':''}>${s.countries[k].flag} ${esc(s.countries[k].name)}</option>`).join('')}</select>`;
        } else if (a.target==='exercisePartner'){
          tgt = `<select onchange="setEx(this.value)">${['CHN','SAU','TUR','ARE','AZE'].map(k=>`<option value="${k}" ${window._exTarget===k?'selected':''}>${s.countries[k].flag} ${esc(s.countries[k].name)}</option>`).join('')}</select>`;
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

/* ---------- tab: intel ---------- */
function tabIntel(s){
  const nets = Object.entries(s.intel.networks);
  return `
  <div class="card"><h3>🕵 ISI Foreign Networks</h3>
    ${nets.map(([k,n])=>{
      const T = s.countries[k];
      return `<div class="faction">
        <div class="frow"><b>${T?T.flag+' '+esc(T.name):k}</b><span>level ${n.lvl} · heat ${n.heat.toFixed(1)}</span></div>
        <div class="bar"><i class="${n.heat>6?'red':'green'}" style="width:${n.lvl*12.5}%"></i></div>
      </div>`;}).join('')}
    <div class="note muted small">Level = penetration depth. Heat = exposure risk — above 7, networks start getting rolled up. Ops raise heat; time lowers it.</div>
  </div>
  <div class="card"><h3>🛡 Defense Against Foreign Ops</h3>
    <p class="muted small">Counter-intelligence sweep (Orders → Intel) reduces hostile penetration. RAW activity against you is ongoing — watch the news feed.</p>
  </div>`;
}

/* ---------- tab: military ---------- */
function tabMilitary(s){
  const P = s.countries.PAK;
  let war = '';
  if (s.war){
    const w = s.war;
    war = `<div class="card warcard"><h3>⚔ WAR vs ${s.countries[w.enemy].name} — month ${w.months}</h3>
      <table class="kv"><tr><td>Your losses</td><td>${w.lossesYou.toLocaleString()}</td></tr>
      <tr><td>Their losses</td><td>${w.lossesThem.toLocaleString()}</td></tr>
      <tr><td>International pressure</td><td>${w.intlPressure.toFixed(0)}/100</td></tr></table>
      ${Object.values(w.fronts).map(f=>`
        <div class="faction"><div class="frow"><b>${f.name}</b><span class="${f.ctl<0.4?'bad':f.ctl>0.6?'good':''}">${(f.ctl*100).toFixed(0)}% your favor</span></div>
        <div class="bar"><i class="${f.ctl<0.4?'red':f.ctl>0.6?'green':'orange'}" style="width:${f.ctl*100}%"></i></div></div>`).join('')}
      <div class="note">☠ If 3+ fronts collapse, the nuclear brief arrives. The world knows what a South Asia war means.</div>
    </div>`;
  }
  return `${war}
  <div class="card"><h3>🎖 Force Status</h3>
    <table class="kv">
      <tr><td>Readiness</td><td>${(s.readiness*100).toFixed(0)}%</td></tr>
      <tr><td>Border posture (India)</td><td>${'▮'.repeat(s.militPosture)}${'▯'.repeat(5-s.militPosture)} — level ${s.militPosture}</td></tr>
      <tr><td>Warheads</td><td>${P.nu}</td></tr>
      <tr><td>Doctrine</td><td>${s.flags.fullSpectrum?'Full-spectrum deterrence':'Credible minimum deterrence'}</td></tr>
    </table>
    <div class="note">Combat power vs India — You: ${Math.round(G.combatPower(P))} · India: ${Math.round(G.combatPower(s.countries.IND))}. India wins long conventional wars; you never let it be long.</div>
  </div>`;
}

/* ---------- tab: news ---------- */
function tabNews(s){
  return `<div class="card"><h3>📰 World & National Feed</h3>
    ${s.news.slice(0,80).map(n=>`<div class="newsitem ${n.tone}"><span class="d">${n.d}</span> ${esc(n.t)}</div>`).join('')}
  </div>`;
}

/* ---------- event modals ---------- */
function showEventModal(){
  const s = G.getState();
  const pending = G.getPending();
  const modal = document.getElementById('modal');
  if (s.gameOver || pending.length===0){ modal.style.display='none'; return; }
  const ev = EVENTS[pending[0]];
  if (!ev){ G.shiftPending(); return; }
  // war events are void if the war already ended
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
  const id = G.getPending()[0];
  const ev = EVENTS[id];
  const c = ev.choices[i];
  G.shiftPending();
  c.fx(s);
  saveGameSilent();
  render();
  // chain next pending event immediately
  if (G.getPending().length) setTimeout(showEventModal, 250);
}
function saveGameSilent(){ if (!G.getState().gameOver) localStorage.setItem('wl2026', JSON.stringify(G.getState())); }

/* ---------- master render ---------- */
function render(){
  const s = G.getState();
  if (!s) return;
  selectedISO = window._sel;
  renderTop(s);
  const tab = window._tab || 'pakistan';
  document.getElementById('panel').innerHTML =
    tab==='pakistan' ? tabPakistan(s) :
    tab==='country'  ? tabCountry(s) :
    tab==='orders'   ? tabOrders(s) :
    tab==='intel'    ? tabIntel(s) :
    tab==='military' ? tabMilitary(s) :
    tabNews(s);
  document.querySelectorAll('.tabbtn').forEach(b=>b.classList.toggle('on', b.dataset.tab===tab));
  // ticker
  const tick = document.getElementById('ticker');
  if (tick) tick.textContent = s.news.slice(0,10).map(n=>n.t).join('   ●   ');
  showEventModal();
}
function switchTab(t){
  window._tab = t;
  if (t==='country' && !window._sel){ window._sel = 'PAK'; }
  render();
}
