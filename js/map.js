/* ============================================================
   WORLD MAP — fullscreen canvas, pan/zoom/click, auto-resize
   Colors = relations toward Pakistan
   ============================================================ */
let MAP = { canvas:null, ctx:null, features:[], paths:[], scale:1, ox:0, oy:0, drag:null, hover:null, ready:false };

function project(lon, lat, W, H){
  const x = (lon + 180) / 360 * W;
  const latRad = lat * Math.PI / 180;
  const y = H * (0.5 - Math.log(Math.tan(Math.PI/4 + latRad/2)) / (2*Math.PI)) * 1.30;
  return [x, y + H*0.18];
}

function fitMapCanvas(){
  const wrap = document.getElementById('mapfull');
  const cv = MAP.canvas;
  if (!wrap || !cv) return;
  const w = Math.max(300, wrap.clientWidth), h = Math.max(300, wrap.clientHeight);
  if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; rebuildPaths(); drawMap(); }
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
    MAP.ctx && (MAP.ctx.fillStyle='#ef4444', MAP.ctx.font='16px monospace', MAP.ctx.fillText('Map data failed to load: '+err.message, 20, 30));
  });
  // interactions
  const cv = MAP.canvas;
  cv.addEventListener('mousedown', e=>{ MAP.drag = {x:e.offsetX, y:e.offsetY, ox:MAP.ox, oy:MAP.oy}; });
  window.addEventListener('mouseup', ()=> MAP.drag = null);
  cv.addEventListener('mousemove', e=>{
    if (MAP.drag){ MAP.ox = MAP.drag.ox + (e.offsetX - MAP.drag.x); MAP.oy = MAP.drag.oy + (e.offsetY - MAP.drag.y); drawMap(); return; }
    MAP.hover = hitTest(e.offsetX, e.offsetY);
    const s = G.getState();
    cv.title = MAP.hover ? (s.countries[MAP.hover.id]?.name || MAP.hover.id) : '';
    drawMap();
  });
  cv.addEventListener('click', e=>{
    if (MAP.drag && (e.offsetX!==MAP.drag.x || e.offsetY!==MAP.drag.y)) return;
    const hit = hitTest(e.offsetX, e.offsetY);
    if (hit){ showCountryCard(hit.id); }
  });
  cv.addEventListener('wheel', e=>{
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.15 : 1/1.15;
    MAP.scale = clamp(MAP.scale*f, 0.8, 8);
    drawMap();
  }, {passive:false});
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
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.translate(MAP.ox, MAP.oy);
  ctx.scale(MAP.scale, MAP.scale);
  const sel = window._sel;
  for (let i=0;i<features.length;i++){
    const f = features[i];
    const c = s.countries[f.id];
    let fill = '#39414f';
    if (f.id === 'PAK') fill = '#16a34a';
    else if (c && c.rel && c.rel.PAK !== undefined) fill = relColor(c.rel.PAK);
    ctx.fillStyle = fill;
    ctx.fill(paths[i]);
    ctx.strokeStyle = '#0b1220';
    ctx.lineWidth = 0.6;
    ctx.stroke(paths[i]);
    if (f.id === sel){
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.2; ctx.stroke(paths[i]);
    } else if (MAP.hover && MAP.hover.id === f.id){
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.4; ctx.stroke(paths[i]);
    }
  }
  ctx.restore();

  /* ---- country name labels (screen space, zoom-aware density) ---- */
  if (!MAP.meta || !MAP.meta.length) return;
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i=0;i<features.length;i++){
    const f = features[i];
    const m = MAP.meta[i];
    if (!m) continue;
    const sx = m.cx*MAP.scale + MAP.ox, sy = m.cy*MAP.scale + MAP.oy;
    if (sx < -40 || sx > canvas.width+40 || sy < -20 || sy > canvas.height+20) continue;
    const px = m.w * MAP.scale;                       // country width on screen
    if (MAP.scale < 2.5 && px < 34) continue;         // too small at world zoom
    if (MAP.scale >= 2.5 && px < 12) continue;        // even zoomed, hide micro dots
    const size = clamp(9 + MAP.scale*1.4, 9.5, 17);
    ctx.font = (f.id==='PAK' ? '800 ' : '600 ') + size + 'px "Segoe UI",system-ui,sans-serif';
    const label = f.id==='PAK' ? '★ PAKISTAN' : m.name.toUpperCase();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(5,10,22,.85)';
    ctx.strokeText(label, sx, sy);
    ctx.fillStyle = f.id==='PAK' ? '#fbbf24' : (MAP.hover && MAP.hover.id===f.id ? '#ffffff' : '#dbe4f0');
    ctx.fillText(label, sx, sy);
  }
  ctx.restore();
}
