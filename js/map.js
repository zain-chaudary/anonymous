/* ============================================================
   WORLD MAP v5 — high-DPI, realistic "war room atlas" style
   Ocean gradient + light falloff, tinted landmass, glowing
   coastlines, subtle relation edges, zoom-to-cursor
   ============================================================ */
let MAP = { canvas:null, ctx:null, features:[], paths:[], meta:[], scale:1, ox:0, oy:0,
            drag:null, hover:null, ready:false, inited:false, style:'atlas', dpr:1 };

function project(lon, lat, W, H){
  const x = (lon + 180) / 360 * W;
  const latRad = lat * Math.PI / 180;
  const y = H * (0.5 - Math.log(Math.tan(Math.PI/4 + latRad/2)) / (2*Math.PI)) * 1.30 + H*0.18;
  return [x, y];
}
const WORLD_CY = 0.74;

/* deterministic muted land tint per country (dark realistic atlas) */
function isoHash(iso){ let h=0; for (let i=0;i<iso.length;i++) h=(h*31+iso.charCodeAt(i))>>>0; return h; }
/* REALISTIC BIOME COLORS — sand deserts, green rainforest, brown mountains,
   snow ice caps, temperate greens. Jittered per country so borders read. */
function biomeColor(lat, lon, iso){
  const v = (isoHash(iso)%9)-4;   /* -4..4 subtle variation */
  const sh = (r,g,b)=>`rgb(${clamp(r+v*5,0,255)},${clamp(g+v*5,0,255)},${clamp(b+v*5,0,255)})`;
  if (lat > 62) return sh(198,206,213);                       /* arctic snow — Greenland, Iceland north */
  if (lat > 55) return sh(99,112,101);                        /* taiga — Canada, Scandinavia, Siberia */
  const desert = (lat>13.5 && lat<32.5 && lon>-18 && lon<77)   /* Sahara + Arabia + Thar */
              || (lat>33 && lat<49 && lon>48 && lon<72)        /* Karakum/Kyzylkum */
              || (lat>22 && lat<32 && lon>74 && lon<80);       /* Rajasthan side */
  if (desert) return sh(172,149,106);
  if (lat>26 && lat<40 && lon>67 && lon<104) return sh(121,109,95);  /* Himalaya + Tibet plateau */
  const rain = (lat>-13 && lat<7 && lon>-76 && lon<-44)        /* Amazon */
            || (lat>-9 && lat<9 && lon>7 && lon<33)            /* Congo */
            || (lat>-9 && lat<8 && lon>94 && lon<146);         /* Indonesia */
  if (rain) return sh(55,83,52);
  if (lat>29 && lat<56 && lon>-10 && lon<45) return sh(93,113,86);   /* Europe temperate */
  return sh(88,107,78);                                        /* default grass/steppe */
}
function relSoft(r){ /* softened heat fill for "relations" style */
  const c = relColor(r);
  const n = parseInt(c.slice(1),16), R=(n>>16)&255, G=(n>>8)&255, B=n&255;
  const mix = (v)=> Math.round(v*0.62 + 42*0.38);
  return `rgb(${mix(R)},${mix(G)},${mix(B)})`;
}

function fitMapCanvas(){
  const wrap = document.getElementById('mapfull');
  const cv = MAP.canvas;
  if (!wrap || !cv) return;
  const dpr = MAP.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = Math.max(300, wrap.clientWidth), h = Math.max(300, wrap.clientHeight);
  if (cv.width !== Math.round(w*dpr) || cv.height !== Math.round(h*dpr)){
    cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
    rebuildPaths();
    if (!MAP.inited){ resetView(); MAP.inited = true; }
    drawMap();
  }
}
function resetView(){
  const cv = MAP.canvas;
  MAP.scale = 1;
  MAP.ox = 0;
  MAP.oy = cv.height*0.5 - WORLD_CY*cv.height;
}
function focusOn(lon, lat, scale){
  const cv = MAP.canvas;
  MAP.scale = clamp(scale, 1, 12);
  const [bx, by] = project(lon, lat, cv.width, cv.height);
  MAP.ox = cv.width/2 - bx*MAP.scale;
  MAP.oy = cv.height/2 - by*MAP.scale;
  clampPan();
}
function zoomAt(dmx, dmy, factor){ /* device-pixel coords */
  const cv = MAP.canvas;
  const ns = clamp(MAP.scale*factor, 1, 12);
  const f = ns / MAP.scale;
  MAP.ox = dmx - (dmx - MAP.ox)*f;
  MAP.oy = dmy - (dmy - MAP.oy)*f;
  MAP.scale = ns;
  clampPan();
  drawMap();
}
function clampPan(){
  const cv = MAP.canvas, s = MAP.scale, W = cv.width, H = cv.height;
  MAP.ox = clamp(MAP.ox, W*(1-s), 0);
  MAP.oy = clamp(MAP.oy, -1.07*H*s, H - 0.41*H*s);
}

function rebuildPaths(){
  const cv = MAP.canvas;
  MAP.meta = [];
  MAP.paths = MAP.features.map(f=>{
    const p = new Path2D();
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let sx=0, sy=0, n=0, slon=0, slat=0, minX=1e9, maxX=-1e9, minY=1e9, maxY=-1e9;
    for (const poly of polys){
      for (const ring of poly){
        ring.forEach((pt,i)=>{
          const [x,y] = project(pt[0], pt[1], cv.width, cv.height);
          i===0 ? p.moveTo(x,y) : p.lineTo(x,y);
          sx+=x; sy+=y; slon+=pt[0]; slat+=pt[1]; n++;
          if (x<minX)minX=x; if (x>maxX)maxX=x; if (y<minY)minY=y; if (y>maxY)maxY=y;
        });
        p.closePath();
      }
    }
    MAP.meta.push({ cx:sx/n, cy:sy/n, lat:slat/n, lon:slon/n, w:maxX-minX, h:maxY-minY, name:(f.properties&&f.properties.name)||f.id });
    return p;
  });
}

function buildMap(){
  MAP.canvas = document.getElementById('map');
  MAP.ctx = MAP.canvas.getContext('2d');
  MAP.style = localStorage.getItem('wl_mapstyle') || 'atlas';
  fetch('data/world.geo.json').then(r=>r.json()).then(gj=>{
    MAP.features = gj.features.filter(f=>f.id && f.id !== 'ATA' && f.id !== 'ATF');
    fitMapCanvas();
    MAP.ready = true;
    drawMap();
  }).catch(err=>{
    if (MAP.ctx){ MAP.ctx.fillStyle='#ef4444'; MAP.ctx.font='16px monospace'; MAP.ctx.fillText('Map data failed: '+err.message, 20, 30); }
  });

  const cv = MAP.canvas;
  const d = ()=>MAP.dpr; /* css→device multiplier */
  cv.addEventListener('mousedown', e=>{ MAP.drag = {x:e.offsetX*d(), y:e.offsetY*d(), ox:MAP.ox, oy:MAP.oy}; });
  window.addEventListener('mouseup', ()=> MAP.drag = null);
  cv.addEventListener('mousemove', e=>{
    if (MAP.drag){
      MAP.ox = clamp(MAP.drag.ox + (e.offsetX*d() - MAP.drag.x), cv.width*(1-MAP.scale), 0);
      MAP.oy = MAP.drag.oy + (e.offsetY*d() - MAP.drag.y);
      clampPan(); drawMap(); return;
    }
    MAP.hover = hitTest(e.offsetX*d(), e.offsetY*d());
    const s = G.getState();
    cv.title = MAP.hover ? (s.countries[MAP.hover.id]?.name || MAP.hover.id) : '';
    drawMap();
  });
  cv.addEventListener('click', e=>{
    if (MAP.drag && (e.offsetX*d()!==MAP.drag.x || e.offsetY*d()!==MAP.drag.y)) return;
    const hit = hitTest(e.offsetX*d(), e.offsetY*d());
    if (hit){ showCountryCard(hit.id); }
  });
  cv.addEventListener('wheel', e=>{
    e.preventDefault();
    zoomAt(e.offsetX*d(), e.offsetY*d(), e.deltaY < 0 ? 1.2 : 1/1.2);
  }, {passive:false});
  cv.addEventListener('dblclick', e=> zoomAt(e.offsetX*d(), e.offsetY*d(), 1.7));

  const zIn = document.getElementById('zin'), zOut = document.getElementById('zout'),
        zReset = document.getElementById('zreset'), zPak = document.getElementById('zpak'),
        zStyle = document.getElementById('zstyle');
  if (zIn) zIn.addEventListener('click', ()=> zoomAt(MAP.canvas.width/2, MAP.canvas.height/2, 1.35));
  if (zOut) zOut.addEventListener('click', ()=> zoomAt(MAP.canvas.width/2, MAP.canvas.height/2, 1/1.35));
  if (zReset) zReset.addEventListener('click', ()=>{ resetView(); drawMap(); });
  if (zPak) zPak.addEventListener('click', ()=>{ focusOn(69.4, 30.1, 3.4); drawMap(); });
  if (zStyle) zStyle.addEventListener('click', ()=>{
    MAP.style = MAP.style==='atlas' ? 'relations' : 'atlas';
    localStorage.setItem('wl_mapstyle', MAP.style);
    zStyle.textContent = MAP.style==='atlas' ? '🌍' : '🔥';
    zStyle.title = 'Style: ' + (MAP.style==='atlas' ? 'Atlas (realistic)' : 'Relations heat') + ' — click to switch';
    const hint = document.getElementById('stylehint');
    if (hint) hint.textContent = MAP.style==='atlas'
      ? '🌍 Atlas style — realistic terrain · edge glow = relations'
      : '🔥 Relations heat — fill color = relations toward you';
    drawMap();
  });
  if (zStyle){ zStyle.textContent = MAP.style==='atlas' ? '🌍' : '🔥'; }

  window.addEventListener('resize', ()=>{ if (!document.getElementById('view-map').classList.contains('hidden')) fitMapCanvas(); });
}

function hitTest(dmx, dmy){
  const {ctx, paths} = MAP;
  if (!ctx || !paths.length) return null;
  const t = ctx.getTransform();
  ctx.setTransform(1,0,0,1,0,0);
  const x = (dmx - MAP.ox)/MAP.scale, y = (dmy - MAP.oy)/MAP.scale;
  let found = null;
  for (let i=paths.length-1; i>=0; i--){
    if (ctx.isPointInPath(paths[i], x, y)){ found = {id: MAP.features[i].id}; break; }
  }
  ctx.setTransform(t);
  return found;
}

function drawMap(){
  const {ctx, canvas, features, paths} = MAP;
  if (!ctx || !features.length || !canvas) return;
  const s = G.getState();
  const W = canvas.width, H = canvas.height;
  const atlas = MAP.style === 'atlas';

  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);

  /* ---------- OCEAN: deep gradient + radial light + vignette ---------- */
  const og = ctx.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0, '#0a1622');
  og.addColorStop(0.45, '#0d1d2e');
  og.addColorStop(1, '#091420');
  ctx.fillStyle = og;
  ctx.fillRect(0,0,W,H);
  const rg = ctx.createRadialGradient(W*0.5, H*0.45, 10, W*0.5, H*0.45, Math.max(W,H)*0.7);
  rg.addColorStop(0, 'rgba(60,120,160,0.10)');
  rg.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = rg;
  ctx.fillRect(0,0,W,H);

  /* ---------- graticule ---------- */
  ctx.save();
  ctx.translate(MAP.ox, MAP.oy);
  ctx.scale(MAP.scale, MAP.scale);
  ctx.strokeStyle = 'rgba(130,160,190,0.05)';
  ctx.lineWidth = 0.7/MAP.scale;
  ctx.beginPath();
  for (let lon=-180; lon<=180; lon+=30){ const [x] = project(lon,0,W,H); ctx.moveTo(x, 0); ctx.lineTo(x, H*1.4); }
  for (let lat=-60; lat<=80; lat+=20){ const [,y] = project(0,lat,W,H); ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.restore();

  /* ---------- landmass: soft under-glow (coast light) ---------- */
  ctx.save();
  ctx.translate(MAP.ox, MAP.oy);
  ctx.scale(MAP.scale, MAP.scale);
  ctx.shadowColor = atlas ? 'rgba(90,150,190,0.30)' : 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = (atlas?7:9)/MAP.scale;
  ctx.shadowOffsetY = (atlas?1:3)/MAP.scale;
  ctx.fillStyle = atlas ? '#2b3740' : '#242b37';
  for (let i=0;i<paths.length;i++) ctx.fill(paths[i]);
  ctx.restore();

  /* ---------- country fills ---------- */
  ctx.save();
  ctx.translate(MAP.ox, MAP.oy);
  ctx.scale(MAP.scale, MAP.scale);
  for (let i=0;i<features.length;i++){
    const f = features[i];
    const c = s.countries[f.id];
    let fill;
    if (f.id === 'PAK') fill = '#6d7b55';
    else if (atlas) fill = MAP.meta[i] ? biomeColor(MAP.meta[i].lat, MAP.meta[i].lon, f.id) : '#5c6b5e';
    else fill = (c && c.rel && c.rel.PAK !== undefined) ? relSoft(c.rel.PAK) : '#2a3340';
    ctx.fillStyle = fill;
    ctx.fill(paths[i]);
  }
  /* internal borders — crisp */
  ctx.strokeStyle = atlas ? 'rgba(12,18,24,0.85)' : 'rgba(10,14,22,0.85)';
  ctx.lineWidth = 0.55/MAP.scale;
  for (let i=0;i<paths.length;i++) ctx.stroke(paths[i]);

  /* coastline accent (atlas): light stroke on outer edge */
  if (atlas){
    ctx.strokeStyle = 'rgba(120,170,205,0.28)';
    ctx.lineWidth = 0.9/MAP.scale;
    for (let i=0;i<paths.length;i++) ctx.stroke(paths[i]);
  }

  /* ---------- relation edge glows (atlas mode: subtle) ---------- */
  for (let i=0;i<features.length;i++){
    const f = features[i];
    if (f.id === 'PAK'){
      ctx.save();
      ctx.shadowColor = 'rgba(16,185,129,.9)'; ctx.shadowBlur = 15/MAP.scale;
      ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 1.7/MAP.scale;
      ctx.stroke(paths[i]);
      ctx.restore();
      continue;
    }
    const c = s.countries[f.id];
    const rel = c && c.rel ? c.rel.PAK : undefined;
    if (atlas){
      if (rel !== undefined && rel >= 60){
        ctx.save();
        ctx.shadowColor = 'rgba(16,185,129,.55)'; ctx.shadowBlur = 7/MAP.scale;
        ctx.strokeStyle = 'rgba(52,211,153,.65)'; ctx.lineWidth = 1.1/MAP.scale;
        ctx.stroke(paths[i]); ctx.restore();
      } else if (rel !== undefined && rel <= -30){
        ctx.save();
        ctx.shadowColor = 'rgba(239,68,68,.55)'; ctx.shadowBlur = 7/MAP.scale;
        ctx.strokeStyle = 'rgba(240,82,82,.65)'; ctx.lineWidth = 1.1/MAP.scale;
        ctx.stroke(paths[i]); ctx.restore();
      }
    }
    if (f.id === window._sel){
      ctx.save();
      ctx.shadowColor = 'rgba(240,180,41,.95)'; ctx.shadowBlur = 13/MAP.scale;
      ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 2.1/MAP.scale;
      ctx.stroke(paths[i]);
      ctx.restore();
    } else if (MAP.hover && MAP.hover.id === f.id){
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,.5)'; ctx.shadowBlur = 7/MAP.scale;
      ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1.3/MAP.scale;
      ctx.stroke(paths[i]);
      ctx.restore();
    }
  }
  ctx.restore();

  /* ---------- labels ---------- */
  if (!MAP.meta || !MAP.meta.length){ ctx.restore(); return; }
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = '1.1px'; } catch(e){}
  for (let i=0;i<features.length;i++){
    const f = features[i];
    const m = MAP.meta[i];
    if (!m) continue;
    const sx = m.cx*MAP.scale + MAP.ox, sy = m.cy*MAP.scale + MAP.oy;
    if (sx < -40 || sx > W+40 || sy < -20 || sy > H+20) continue;
    const px = m.w * MAP.scale;
    if (MAP.scale < 2.2 && px < 40) continue;
    if (MAP.scale >= 2.2 && px < 13) continue;
    const size = clamp((9 + MAP.scale*1.25) * Math.sqrt(MAP.dpr||1), 10, 19);
    ctx.font = (f.id==='PAK' ? '800 ' : '650 ') + size + 'px "Segoe UI",system-ui,sans-serif';
    const label = f.id==='PAK' ? '★ PAKISTAN' : m.name.toUpperCase();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = 'rgba(6,10,16,.9)';
    ctx.strokeText(label, sx, sy);
    ctx.fillStyle = f.id==='PAK' ? '#f0b429' : (MAP.hover && MAP.hover.id===f.id ? '#ffffff' : '#b9c6d4');
    ctx.fillText(label, sx, sy);
  }
  ctx.restore();
  ctx.restore();   /* close outer save */
}
