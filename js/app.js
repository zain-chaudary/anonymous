/* boot */
window.addEventListener('DOMContentLoaded', ()=>{
  // restore selection hook
  Object.defineProperty(window, '_sel', {
    get(){ return this.__sel; },
    set(v){ this.__sel = v; G.setSelected(v); if (MAP.features.length) drawMap(); }
  });

  const hadSave = G.loadGame();
  if (!hadSave) {
    // fresh game
    G.newGame();
  }

  buildMap();

  document.getElementById('endmonth').addEventListener('click', ()=>{
    if (G.getState().gameOver) return;
    if (G.getPending().length) { showEventModal(); return; }
    G.endMonth(G.getState());
    toast(dateStr(G.getState()) + ' — month resolved');
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
  // intro modal for fresh games
  if (!hadSave) showIntro();
});

function showIntro(){
  const modal = document.getElementById('modal');
  modal.innerHTML = `
  <div class="modal-box intro">
    <h1>🇵🇰 WORLD LEADER 2026</h1>
    <p class="tag">Realistic geopolitical simulator — you rule Pakistan from <b>November 2026</b>.</p>
    <div class="intro-cols">
      <div>
        <h3>Your inheritance</h3>
        <ul>
          <li>241 million people, $415B economy, 7% inflation</li>
          <li>$15.5B reserves, $91B external debt, IMF program running</li>
          <li>170 nuclear warheads, 654k troops, battle-hardened PAF</li>
          <li>Insurgencies: TTP (KP), BLA (Balochistan)</li>
          <li>Political firestorm: PTI street movement, leadership in Adiala jail</li>
          <li>India hostile, China generous, America transactional, Gulf rich, Afghanistan hostile</li>
        </ul>
      </div>
      <div>
        <h3>How to play</h3>
        <ul>
          <li><b>Orders tab</b>: issue directives (cost 💵 money + 🏛 political capital)</li>
          <li><b>End Month</b>: the world simulates — economy, factions, war, spies, AI countries react</li>
          <li><b>Map</b>: click any country; color = relations toward you</li>
          <li>Decision modals arrive — choose wisely, hardcore mode has no undo</li>
          <li>Lose by: coup, revolution, default, losing a war, nuclear war</li>
        </ul>
      </div>
    </div>
    <p class="muted small">Baseline data: IMF/World Bank/SIPRI/IISS 2025 estimates projected to Nov 2026. You can also give orders in chat — the simulation adjudicates them.</p>
    <button class="btn big" onclick="document.getElementById('modal').style.display='none'">Take Power</button>
  </div>`;
  modal.style.display = 'flex';
}
