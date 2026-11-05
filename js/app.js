/* boot */
window.addEventListener('DOMContentLoaded', ()=>{
  Object.defineProperty(window, '_sel', {
    get(){ return this.__sel; },
    set(v){ this.__sel = v; if (G.getState()) G.setSelected(v); if (MAP.features.length) drawMap(); }
  });

  const hadSave = G.loadGame();
  if (!hadSave) G.newGame();

  buildMap();

  document.getElementById('endmonth').addEventListener('click', ()=>{
    const s = G.getState();
    if (s.gameOver) return;
    if (G.getPending().length) { showEventModal(); return; }
    G.endMonth(s);
    toast(dateStr(G.getState()) + ' — month resolved');
  });
  document.getElementById('openmap').addEventListener('click', openMap);
  document.getElementById('closemap').addEventListener('click', openHome);
  document.getElementById('ranksearch').addEventListener('input', function(){
    window._rankq = this.value; renderRankList(G.getState());
  });
  document.querySelectorAll('#ranktabs .segbtn').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.querySelectorAll('#ranktabs .segbtn').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      setRankMode(b.dataset.mode);
    });
  });
  document.getElementById('save').addEventListener('click', ()=>{ localStorage.setItem('wl2026', JSON.stringify(G.getState())); toast('Game saved'); });
  document.getElementById('reset').addEventListener('click', ()=>{
    if (confirm('Start a NEW GAME? Current campaign will be deleted.')){
      localStorage.removeItem('wl2026'); location.reload();
    }
  });
  document.querySelectorAll('.tabbtn').forEach(b=>{
    b.addEventListener('click', ()=> switchTab(b.dataset.tab));
  });

  render();
  if (!hadSave) showIntro();
});

function showIntro(){
  const modal = document.getElementById('modal');
  modal.innerHTML = `
  <div class="modal-box intro">
    <h1>🇵🇰 WORLD LEADER 2026</h1>
    <p class="tag">You are <b>President Zain Chaudary</b> of Pakistan — supreme ruler since <b>November 2026</b>.</p>
    <div class="intro-cols">
      <div>
        <h3>Your inheritance</h3>
        <ul>
          <li>241M people · $415B economy · 7% inflation</li>
          <li>$15.5B in the government bank · $91B loans to repay</li>
          <li>Game scenario values: 654k troops, 3,719 tanks, 470 aircraft, 170 warheads</li>
          <li>TTP insurgency in KP, BLA in Balochistan</li>
          <li>India hostile · China generous · America transactional</li>
        </ul>
      </div>
      <div>
        <h3>How to rule</h3>
        <ul>
          <li><b>My Government</b>: set ministry budgets with sliders — balance revenue vs spending</li>
          <li><b>🗺 World Map</b>: see all countries ranked by power; click any for relations, army, condition</li>
          <li><b>Orders</b>: issue directives (cost 💵 + 🏛 political capital)</li>
          <li><b>End Month</b>: the world simulates and reacts</li>
          <li>Lose by coup, revolution, default, lost war, or nuclear war</li>
        </ul>
      </div>
    </div>
    <p class="muted small">Starting values are simplified game scenario baselines, not a live national inventory. Public reference data retain their own dates and definitions in the Military and Resources panels and do not alter gameplay counts. Hardcore mode: no undo.</p>
    <button class="btn big primary" onclick="document.getElementById('modal').style.display='none'">Take Power</button>
  </div>`;
  modal.style.display = 'flex';
}
