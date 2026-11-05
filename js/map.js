/* ============================================================
   WORLD MAP v3 — premium canvas renderer
   Ocean gradient, graticule, glow, zoom-to-cursor, controls
   ============================================================ */
let MAP = { canvas:null, ctx:null, features:[], paths:[], meta:[], scale:1, ox:0, oy:0,
            drag:null, hover:null, ready:false, inited:false };

function project(lon, lat, W, H){
  const x = (lon + 180) / 360 * W;
  const latRad = lat * Math.PI / 180;
  const y = H * (0.5 - Math.log(Math.tan(Math.PI/4 + latRad/2)) / (2*Math.PI)) * 1.30 + H*0.18;
  return [x, y];
}
/* content vertical extent at scale 1 ≈ [0.41H, 1.07H] → center offset */
const WORLD_CY = 0.74;

function fitMapCanvas(){
  const wrap = document.getElementById('mapfull');
  const cv = MAP.canvas;
  if (!wrap || !cv) return;
  const w = Math.max(300, wrap.clientWidth), h = Math.max(300, wrap.clientHeight);
  if (cv.width !== w || cv.height !== h){
    cv.width = w; cv.height = h;
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
function zoomAt(mx, my, factor){
  const ns = clamp(MAP.scale*factor, 1, 12);
  const f = ns / MAP.scale;
  MAP.ox = mx - (mx - MAP.ox)*f;
  MAP.oy = my - (my - MAP.oy)*f;
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
    let sx=0, sy=0, n=0, minX=1e9, maxX=-1e9, minY=1e9, maxY=-1e9;
    for (const poly of polys){
      for (const ring of poly){
        ring.forEach((pt,i)=>{
          const [x,y] = project(pt[0], pt[1], cv.width, cv.height);
          i===0 ? p.moveTo(x,y) : p.lineTo(x,y);
          sx+=x; sy+=y; n++;
          if (x<minX)minX=x; if (x>maxX)maxX=x; if (y<minY)minY=y; if (y>maxY)maxY=y;
        });
        p.closePath();
      }
    }
    MAP.meta.push({ cx:sx/n, cy:sy/n, w:maxX-minX, h:maxY-minY, name:(f.properties&&f.properties.name)||f.id });
    return p;
  });
}

function buildMap(){
  MAP.canvas = document.getElementById('map');
  MAP.ctx = MAP.canvas.getContext('2d');
  fetch('data/world.geo.json').then(r=>r.json()).then(gj=>{
    MAP.features = gj.features.filter(f=>f.id && f.id !== 'ATA' && f.id !== 'ATF');
    fitMapCanvas();
    MAP.ready = true;
    drawMap();
  }).catch(err=>{
    if (MAP.ctx){ MAP.ctx.fillStyle='#ef4444'; MAP.ctx.font='16px monospace'; MAP.ctx.fillText('Map data failed: '+err.message, 20, 30); }
  });

  const cv = MAP.canvas;
  /* pan */
  cv.addEventListener('mousedown', e=>{ MAP.drag = {x:e.offsetX, y:e.offsetY, ox:MAP.ox, oy:MAP.oy}; });
  window.addEventListener('mouseup', ()=> MAP.drag = null);
  cv.addEventListener('mousemove', e=>{
    if (MAP.drag){
      MAP.ox = clamp(MAP.drag.ox + (e.offsetX - MAP.drag.x), cv.width*(1-MAP.scale), 0);
      MAP.oy = MAP.drag.oy + (e.offsetY - MAP.drag.y);
      clampPan(); drawMap(); return;
    }
    MAP.hover = hitTest(e.offsetX, e.offsetY);
    const s = G.getState();
    cv.title = MAP.hover ? (s.countries[MAP.hover.id]?.name || MAP.hover.id) : '';
    drawMap();
  });
  /* click = select */
  cv.addEventListener('click', e=>{
    if (MAP.drag && (e.offsetX!==MAP.drag.x || e.offsetY!==MAP.drag.y)) return;
    const hit = hitTest(e.offsetX, e.offsetY);
    if (hit){ showCountryCard(hit.id); }
  });
  /* zoom to cursor */
  cv.addEventListener('wheel', e=>{
    e.preventDefault();
    zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.2 : 1/1.2);
  }, {passive:false});
  /* double-click zoom in */
  cv.addEventListener('dblclick', e=> zoomAt(e.offsetX, e.offsetY, 1.7));

  /* control buttons */
  const zIn = document.getElementById('zin'), zOut = document.getElementById('zout'),
        zReset = document.getElementById('zreset'), zPak = document.getElementById('zpak');
  if (zIn) zIn.addEventListener('click', ()=> zoomAt(MAP.canvas.width/2, MAP.canvas.height/2, 1.35));
  if (zOut) zOut.addEventListener('click', ()=> zoomAt(MAP.canvas.width/2, MAP.canvas.height/2, 1/1.35));
  if (zReset) zReset.addEventListener('click', ()=>{ resetView(); drawMap(); });
  if (zPak) zPak.addEventListener('click', ()=>{ focusOn(69.4, 30.1, 3.4); drawMap(); });

  window.addEventListener('resize', ()=>{ if (!document.getElementById('view-map').classList.contains('hidden')) fitMapCanvas(); });
}

function hitTest(mx, my){
  const {ctx, paths} = MAP;
  if (!ctx || !paths.length) return null;
  const t = ctx.getTransform();
  ctx.setTransform(1,0,0,1,0,0);
  const x = (mx - MAP.ox)/MAP.scale, y = (my - MAP.oy)/MAP.scale;
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

  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);

  /* --- ocean: deep slate gradient + vignette --- */
  const og = ctx.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0, '#0c1420');
  og.addColorStop(0.5, '#0a101a');
  og.addColorStop(1, '#0b131f');
  ctx.fillStyle = og;
  ctx.fillRect(0,0,W,H);

  /* --- graticule (drawn in world space) --- */
  ctx.save();
  ctx.translate(MAP.ox, MAP.oy);
  ctx.scale(MAP.scale, MAP.scale);
  ctx.strokeStyle = 'rgba(148,163,184,0.055)';
  ctx.lineWidth = 0.7/MAP.scale;
  ctx.beginPath();
  for (let lon=-180; lon<=180; lon+=30){ const [x] = project(lon,0,W,H); ctx.moveTo(x, 0); ctx.lineTo(x, H*1.4); }
  for (let lat=-60; lat<=80; lat+=20){ const [,y] = project(0,lat,W,H); ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  /* equator emphasis */
  ctx.strokeStyle = 'rgba(148,163,184,0.10)';
  ctx.beginPath();
  const [,eqy] = project(0,0,W,H); ctx.moveTo(0, eqy); ctx.lineTo(W, eqy);
  ctx.stroke();
  ctx.restore();

  /* --- landmass drop shadow (one soft pass) --- */
  ctx.save();
  ctx.translate(MAP.ox, MAP.oy);
  ctx.scale(MAP.scale, MAP.scale);
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = 10/MAP.scale;
  ctx.shadowOffsetY = 3/MAP.scale;
  ctx.fillStyle = '#242b37';
  for (let i=0;i<paths.length;i++) ctx.fill(paths[i]);
  ctx.restore();

  /* --- country fills + borders --- */
  ctx.save();
  ctx.translate(MAP.ox, MAP.oy);
  ctx.scale(MAP.scale, MAP.scale);
  for (let i=0;i<features.length;i++){
    const f = features[i];
    const c = s.countries[f.id];
    let fill = '#242b37';
    if (f.id === 'PAK') fill = '#0da271';
    else if (c && c.rel && c.rel.PAK !== undefined) fill = relColor(c.rel.PAK);
    ctx.fillStyle = fill;
    ctx.fill(paths[i]);
  }
  /* borders on top, crisp */
  ctx.strokeStyle = 'rgba(10,14,22,0.85)';
  ctx.lineWidth = 0.7/MAP.scale;
  for (let i=0;i<paths.length;i++) ctx.stroke(paths[i]);

  /* --- highlights: PAK glow, selection, hover --- */
  const sel = window._sel;
  for (let i=0;i<features.length;i++){
    const f = features[i];
    if (f.id === 'PAK'){
      ctx.save();
      ctx.shadowColor = 'rgba(16,185,129,.9)'; ctx.shadowBlur = 16/MAP.scale;
      ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 1.8/MAP.scale;
      ctx.stroke(paths[i]);
      ctx.restore();
    } else if (f.id === sel){
      ctx.save();
      ctx.shadowColor = 'rgba(240,180,41,.95)'; ctx.shadowBlur = 14/MAP.scale;
      ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 2.2/MAP.scale;
      ctx.stroke(paths[i]);
      ctx.restore();
    } else if (MAP.hover && MAP.hover.id === f.id){
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,.55)'; ctx.shadowBlur = 8/MAP.scale;
      ctx.strokeStyle = '#f4f6f9'; ctx.lineWidth = 1.4/MAP.scale;
      ctx.stroke(paths[i]);
      ctx.restore();
    }
  }
  ctx.restore();

  /* --- country name labels (screen space, zoom-aware) --- */
  if (!MAP.meta || !MAP.meta.length){ ctx.restore(); return; }
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = '1.2px'; } catch(e){}
  for (let i=0;i<features.length;i++){
    const f = features[i];
    const m = MAP.meta[i];
    if (!m) continue;
    const sx = m.cx*MAP.scale + MAP.ox, sy = m.cy*MAP.scale + MAP.oy;
    if (sx < -40 || sx > W+40 || sy < -20 || sy > H+20) continue;
    const px = m.w * MAP.scale;
    if (MAP.scale < 2.2 && px < 40) continue;
    if (MAP.scale >= 2.2 && px < 13) continue;
    const size = clamp(9 + MAP.scale*1.3, 9.5, 16);
    ctx.font = (f.id==='PAK' ? '800 ' : '700 ') + size + 'px "Segoe UI",system-ui,sans-serif';
    const label = f.id==='PAK' ? '★ PAKISTAN' : m.name.toUpperCase();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = 'rgba(8,11,17,.88)';
    ctx.strokeText(label, sx, sy);
    ctx.fillStyle = f.id==='PAK' ? '#f0b429' : (MAP.hover && MAP.hover.id===f.id ? '#ffffff' : '#c9d2de');
    ctx.fillText(label, sx, sy);
  }
  ctx.restore();
  ctx.restore();   /* close the outer save from draw start */
}
