'use strict';
/**
 * server.js — zero-dependency HTTP server for the Malware & Vaccine Lab.
 *
 * Run:  node server.js      (PORT env optional, default 3000)
 * Then: open http://localhost:3000
 */

const http = require('node:http');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const url = require('node:url');

const lab = require('./lib/lab');
const safeFs = require('./lib/safeFs');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const sseClients = new Set();

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

// Clean URLs for the pages we actually link to.
const ROUTES = {
  '/': 'index.html',
  '/system-check': 'system-check.html',
  '/system-check/': 'system-check.html',
};

async function serveStatic(req, res, pathname) {
  const rel = ROUTES[pathname] || pathname.replace(/^\/+/, '');
  const abs = path.resolve(PUBLIC_DIR, rel);
  if (!abs.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const data = await fsp.readFile(abs);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  }
}

function broadcast(event, data) {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(frame);
    } catch {
      sseClients.delete(res);
    }
  }
}

lab.on('log', (entry) => broadcast('log', entry));
lab.on('blocked', (info) => broadcast('blocked', info));

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';

  try {
    // ---------------------------------------------------------------- SSE --
    if (pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(': connected\n\n');
      res.write(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`);
      sseClients.add(res);
      const keepAlive = setInterval(() => {
        try {
          res.write(': ping\n\n');
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);
      req.on('close', () => {
        clearInterval(keepAlive);
        sseClients.delete(res);
      });
      return;
    }

    // ---------------------------------------------------------------- API --
    if (pathname.startsWith('/api/')) {
      if (req.method === 'GET' && pathname === '/api/state') {
        return sendJson(res, 200, await lab.snapshot());
      }

      if (req.method === 'GET' && pathname === '/api/file') {
        const p = String(parsed.query.path || '');
        try {
          const content = await safeFs.read(p);
          const stat = await safeFs.stat(p);
          return sendJson(res, 200, {
            path: p,
            size: stat.size,
            content: content.slice(0, 20000),
            truncated: content.length > 20000,
          });
        } catch (err) {
          return sendJson(res, 404, { error: String(err.message || err) });
        }
      }

      if (req.method === 'GET' && pathname === '/api/report') {
        const body = JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            signatureVersion: lab.vaccine.SIGNATURES.version,
            state: await lab.snapshot(),
          },
          null,
          2
        );
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="malware-lab-report.json"',
        });
        return res.end(body);
      }

      if (req.method === 'POST') {
        const body = await readBody(req);
        switch (pathname) {
          case '/api/reset':
            return sendJson(res, 200, await lab.reset());
          case '/api/infect': {
            const stages = body.stages === 'all' || !body.stages ? 'all' : body.stages;
            const out = await lab.infect(stages);
            return sendJson(res, 200, { ...out, state: await lab.snapshot() });
          }
          case '/api/mount':
            return sendJson(res, 200, { ...(await lab.mount()), state: await lab.snapshot() });
          case '/api/unmount':
            return sendJson(res, 200, { ...(await lab.unmount()), state: await lab.snapshot() });
          case '/api/scan': {
            const report = await lab.scan();
            if (report.error) return sendJson(res, 409, report);
            return sendJson(res, 200, { report, state: await lab.snapshot() });
          }
          case '/api/heal': {
            const report = await lab.heal();
            if (report.error) return sendJson(res, 409, report);
            return sendJson(res, 200, { report, state: await lab.snapshot() });
          }
          case '/api/immunize': {
            const record = await lab.immunize();
            if (record.error) return sendJson(res, 409, record);
            return sendJson(res, 200, { record, state: await lab.snapshot() });
          }
          case '/api/protect': {
            const out = await lab.setProtection(!!body.enabled);
            if (out.error) return sendJson(res, 409, out);
            return sendJson(res, 200, { ...out, state: await lab.snapshot() });
          }
          default:
            return sendJson(res, 404, { error: 'unknown endpoint' });
        }
      }

      return sendJson(res, 405, { error: 'method not allowed' });
    }

    // ------------------------------------------------------------- static --
    return await serveStatic(req, res, pathname);
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) sendJson(res, 500, { error: String(err.message || err) });
    else res.end();
  }
});

async function boot() {
  // Always start from a clean image so the first screen is deterministic.
  await lab.reset();
  server.listen(PORT, HOST, () => {
    console.log(`\n  Malware & Vaccine Lab`);
    console.log(`  ─────────────────────────────────────────`);
    console.log(`  listening on http://${HOST}:${PORT}`);
    console.log(`  patient PC : ${safeFs.PC_ROOT}`);
    console.log(`  containment: writes are refused outside that directory\n`);
  });
}

boot();
