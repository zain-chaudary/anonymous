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

/* ============ MAP VIEW: RANKED LIST + COUNTRY CARD ============ */
function renderRankList(s){
  const q = (window._rankq || '').toLowerCase();
  const ranked = Object.entries(s.countries)
    .filter(([iso,c])=>iso!=='PAK')
    .map(([iso,c])=>({iso, c, score: G.powerScore(c)}))
    .sort((a,b)=>b.score-a.score);
  const top = ranked[0].score || 1;
  const list = ranked.filter(r=>!q || r.c.name.toLowerCase().includes(q));
  document.getElementById('ranklist').innerHTML = list.map((r,i)=>`
    <div class="rankitem ${window._sel===r.iso?'sel':''}" onclick="pickCountry('${r.iso}')">
      <div class="rrank">#${i+1}</div>
      <div class="rflag">${r.c.flag||'🏳'}</div>
      <div class="rmain">
        <div class="rname">${esc(r.c.name)} ${r.c.nu?`<span class="tiny nuke">☢${r.c.nu}</span>`:''}</div>
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
function showCountryCard(iso){
  const s = G.getState();
  const c = s.countries[iso];
  if (!c) return;
  window._sel = iso;
  drawMap();
  const card = document.getElementById('countrycard');
  card.classList.remove('hidden');
  if (iso === 'PAK'){
    card.innerHTML = `
      <button class="btn mini close" onclick="hideCard()">✕</button>
      <div class="ccflag">🇵🇰</div>
      <h2>Pakistan <span class="muted small">(Your Country)</span></h2>
      <div class="ccline">You rule here, President Zain Chaudary.</div>
      <div class="ministat">
        <div>Population <b>241.5M</b></div><div>GDP <b>${fmtB(c.gdp)}</b></div><div>Warheads <b>${c.nu} ☢</b></div>
      </div>
      <button class="btn primary" style="width:100%;margin-top:10px" onclick="goHome()">🎖 Open My Government →</button>`;
    return;
  }
  const rel = c.rel && c.rel.PAK !== undefined ? c.rel.PAK : 50;
  const rank = Object.values(s.countries).filter(x=>x!==c && G.powerScore(x)>G.powerScore(c)).length + 1;
  card.innerHTML = `
    <button class="btn mini close" onclick="hideCard()">✕</button>
    <div class="ccrow">
      <div class="ccflag">${c.flag||'🏳'}</div>
      <div>
        <h2>${esc(c.name)}</h2>
        <div class="muted small">World power rank <b>#${rank}</b></div>
      </div>
    </div>
    <div class="frow small"><b>Relationship with you</b><span style="color:${relColor(rel)}"><b>${rel.toFixed(0)} — ${G.relLabel(rel)}</b></span></div>
    <div class="bar"><i style="width:${(rel+100)/2}%;background:${relColor(rel)}"></i></div>
    <div class="ministat">
      <div>👥 People <b>${c.pop>=1000?(c.pop/1000).toFixed(2)+'B':c.pop.toFixed(1)+'M'}</b></div>
      <div>💰 Economy <b>${fmtB(c.gdp)}</b></div>
      <div>📈 Growth <b>${c.growth.toFixed(1)}%</b></div>
    </div>
    <div class="ministat">
      <div>🎖 Troops <b>${c.troops.toLocaleString()}k</b></div>
      <div>🛡 Tanks <b>${c.tanks.toLocaleString()}</b></div>
      <div>✈ Jets <b>${c.aircraft}</b></div>
      <div>☢ Nukes <b>${c.nu||'0'}</b></div>
    </div>
    <div class="frow small"><b>Inner condition</b><span class="${(c.st||55)<40?'bad':(c.st||55)>=70?'good':'warn'}"><b>${G.stabLabel(c.st||55)} (${(c.st||55)}/100)</b></span></div>
    <div class="bar"><i class="${(c.st||55)<40?'red':(c.st||55)>=70?'green':'orange'}" style="width:${c.st||55}%"></i></div>
    <div class="muted tiny" style="margin-top:6px">🏛 ${esc(c.gov)} · ${esc(c.leader)} · Spy agency: ${esc(c.agency||'—')}</div>
    ${c.un?`<div class="note tiny">⚠ ${esc(c.un)}</div>`:''}`;
}
function hideCard(){ document.getElementById('countrycard').classList.add('hidden'); }
function goHome(){ openHome(); switchTab('gov'); }

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
  if (s.gameOver || pending.length===0){ modal.style.display='none'; return; }
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
