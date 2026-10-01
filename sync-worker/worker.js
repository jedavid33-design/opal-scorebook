/* ⚠️ INCOMPATIBLE DRAFT — NEVER DEPLOY. The live sync worker is the ROOT
   worker.js (deployed as opal-scorebook-sync); this draft uses a different,
   incompatible API/auth model and deploying it would break sync. It is kept
   in the tree for reference only. */
/* Opal Scorebook sync worker — free tier (Workers + D1).
   One sync "account" = one pairing code. The client hashes the code with
   SHA-256 and sends only the 64-hex hash as the Bearer token, so this
   worker never sees the raw code. All game rows are namespaced by that hash.
   No accounts, no emails, no secrets stored. */

const ALLOWED_ORIGIN = 'https://jedavid33-design.github.io';
const MAX_BODY = 2 * 1024 * 1024; // 2 MB per game state

function cors() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Device',
    'Access-Control-Max-Age': '86400',
  };
}
function json(data, status, extra) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, cors(), extra || {}),
  });
}
function syncIdFrom(req) {
  const h = req.headers.get('Authorization') || '';
  const m = /^Bearer ([a-f0-9]{64})$/.exec(h.trim());
  return m ? m[1] : null;
}
function gameIdFrom(pathname) {
  const m = /^\/api\/games\/([A-Za-z0-9_-]{1,64})$/.exec(pathname);
  return m ? m[1] : null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });

    const sid = syncIdFrom(req);
    if (!sid) return json({ error: 'unauthorized' }, 401);

    // GET /api/games — list summaries, newest first
    if (req.method === 'GET' && url.pathname === '/api/games') {
      const rows = await env.DB.prepare(
        'SELECT game_id, summary, updated_at, device FROM games WHERE sync_id = ? ORDER BY updated_at DESC LIMIT 50'
      ).bind(sid).all();
      return json({ games: rows.results || [] });
    }

    const gid = gameIdFrom(url.pathname);
    if (!gid) return json({ error: 'not found' }, 404);

    if (req.method === 'GET') {
      const row = await env.DB.prepare(
        'SELECT data, updated_at FROM games WHERE sync_id = ? AND game_id = ?'
      ).bind(sid, gid).first();
      if (!row) return json({ error: 'not found' }, 404);
      let state = null;
      try { state = JSON.parse(row.data); } catch (e) { /* corrupted row */ }
      if (!state) return json({ error: 'corrupt' }, 500);
      return json({ state: state, updatedAt: row.updated_at });
    }

    if (req.method === 'PUT') {
      const len = parseInt(req.headers.get('Content-Length') || '0', 10);
      if (len > MAX_BODY) return json({ error: 'too large' }, 413);
      let body = null;
      try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
      if (!body || typeof body.state !== 'object' || !body.state) return json({ error: 'bad body' }, 400);
      const data = JSON.stringify(body.state);
      if (data.length > MAX_BODY) return json({ error: 'too large' }, 413);
      const summary = String(body.summary || '').slice(0, 200);
      const device = (req.headers.get('X-Device') || '').slice(0, 40);
      const updatedAt = Number(body.updatedAt) > 0 ? Math.floor(Number(body.updatedAt)) : Date.now();
      await env.DB.prepare(
        'INSERT INTO games (sync_id, game_id, data, summary, updated_at, device) VALUES (?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (sync_id, game_id) DO UPDATE SET data = excluded.data, summary = excluded.summary, ' +
        'updated_at = excluded.updated_at, device = excluded.device'
      ).bind(sid, gid, data, summary, updatedAt, device).run();
      return json({ ok: true });
    }

    if (req.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM games WHERE sync_id = ? AND game_id = ?').bind(sid, gid).run();
      return json({ ok: true });
    }

    return json({ error: 'method not allowed' }, 405);
  },
};
