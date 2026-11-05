/* ============================================================
   WORLD MAP — canvas, equirectangular, pan/zoom, click select
   Colors = country relations toward Pakistan
   ============================================================ */
let MAP = { canvas:null, ctx:null, features:[], paths:[], scale:1, ox:0, oy:0, drag:null, hover:null };

function project(lon, lat, W, H){
  const x = (lon + 180) / 360 * W;
  const latRad = lat * Math.PI / 180;
  // mercator-ish for nicer shape
  const y = H * (0.5 - Math.log(Math.tan(Math.PI/4 + latRad/2)) / (2*Math.PI)) * 1.35;
  return [x, y + H*0.18];
}

function buildMap(){
  const cv = document.getElementById('map');
  MAP.canvas = cv; MAP.ctx = cv.getContext('2d');
  fetch('data/world.geo.json').then(r=>r.json()).then(gj=>{
    MAP.features = gj.features.filter(f=>f.id && f.id !== 'ATA'); // skip Antarctica
    MAP.paths = MAP.features.map(f=>{
      const p = new Path2D();
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const poly of polys){
        for (const ring of poly){
          ring.forEach((pt,i)=>{
            const [x,y] = project(pt[0], pt[1], cv.width, cv.height);
            i===0 ? p.moveTo(x,y) : p.lineTo(x,y);
          });
          p.closePath();
        }
      }
      return p;
    });
    drawMap();
  });
  // interactions
  cv.addEventListener('mousedown', e=>{ MAP.drag = {x:e.offsetX, y:e.offsetY, ox:MAP.ox, oy:MAP.oy}; });
  window.addEventListener('mouseup', ()=> MAP.drag = null);
  cv.addEventListener('mousemove', e=>{
    if (MAP.drag){ MAP.ox = MAP.drag.ox + (e.offsetX - MAP.drag.x); MAP.oy = MAP.drag.oy + (e.offsetY - MAP.drag.y); drawMap(); return; }
    const hit = hitTest(e.offsetX, e.offsetY);
    MAP.hover = hit;
    cv.title = hit ? (G.getState().countries[hit.id]?.name || hit.id) : '';
    drawMap();
  });
  cv.addEventListener('click', e=>{
    if (MAP.drag && (e.offsetX!==MAP.drag.x || e.offsetY!==MAP.drag.y)) return;
    const hit = hitTest(e.offsetX, e.offsetY);
    if (hit){ window._sel = hit.id; window._tab = 'country'; render(); }
  });
  cv.addEventListener('wheel', e=>{
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.15 : 1/1.15;
    MAP.scale = clamp(MAP.scale*f, 0.8, 8);
    drawMap();
  }, {passive:false});
}

function hitTest(mx, my){
  const {ctx, features, paths} = MAP;
  const W = MAP.canvas.width, H = MAP.canvas.height;
  const t = ctx.getTransform();
  ctx.setTransform(1,0,0,1,0,0);
  const x = (mx - MAP.ox)/MAP.scale, y = (my - MAP.oy)/MAP.scale;
  let found = null;
  for (let i=paths.length-1; i>=0; i--){
    if (ctx.isPointInPath(paths[i], x*1, y*1)){ found = {id: features[i].id}; break; }
  }
  ctx.setTransform(t);
  return found;
}

function drawMap(){
  const {ctx, canvas, features, paths} = MAP;
  if (!ctx || !features.length) return;
  const s = G.getState();
  const W = canvas.width, H = canvas.height;
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0,0,W,H);
  ctx.translate(MAP.ox, MAP.oy);
  ctx.scale(MAP.scale, MAP.scale);
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
    if (f.id === selectedISO){
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.2; ctx.stroke(paths[i]);
    } else if (MAP.hover && MAP.hover.id === f.id){
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.4; ctx.stroke(paths[i]);
    }
  }
  ctx.restore();
}
