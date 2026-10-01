// opal-scorebook-sync — game-state sync + archive for Opal Scorebook.
// Auth: a client-generated sync code. Every row carries it; every request
// must present the matching code. No accounts, no login.
//
// Concurrency (2026-10-01): rows carry a `rev` integer. PUT may send
// `base_rev` — the revision the client's state was based on. When the row
// exists and base_rev !== current rev, the write is rejected with 409
// {error:'stale',rev} so the client can ask the user (load theirs / keep
// mine) instead of silently clobbering the other device's game. A PUT with
// no base_rev is an explicit force-overwrite (keeps old clients working).
const WORKER_VER = '2026-10-01-rev1';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
const okId = (id) => typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id);
const okCode = (c) => typeof c === 'string' && /^[A-Za-z0-9-]{4,64}$/.test(c);

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === '/api/health') return json({ ok: true, ver: WORKER_VER });

    if (path === '/api/games' && req.method === 'GET') {
      const code = url.searchParams.get('code');
      if (!okCode(code)) return json({ error: 'code required' }, 400);
      const rows = await env.DB.prepare(
        'SELECT id,name,device,created_at,updated_at,finished,score,rev FROM games WHERE sync_code=? ORDER BY updated_at DESC LIMIT 200'
      ).bind(code).all();
      return json({ games: rows.results });
    }

    const m = path.match(/^\/api\/games\/([A-Za-z0-9-]{8,64})$/);
    if (m) {
      const id = m[1];
      if (req.method === 'GET') {
        const code = url.searchParams.get('code');
        if (!okCode(code)) return json({ error: 'code required' }, 400);
        const row = await env.DB.prepare(
          'SELECT * FROM games WHERE id=? AND sync_code=?'
        ).bind(id, code).first();
        if (!row) return json({ error: 'not found' }, 404);
        return json(row);
      }
      if (req.method === 'PUT') {
        let body;
        try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
        if (!okId(id) || !okCode(body.code)) return json({ error: 'code required' }, 400);
        const existing = await env.DB.prepare(
          'SELECT sync_code, created_at, rev FROM games WHERE id=?'
        ).bind(id).first();
        if (existing && existing.sync_code !== body.code) return json({ error: 'forbidden' }, 403);
        const curRev = existing ? (existing.rev == null ? 0 : existing.rev) : 0;
        // Stale write: the client's base_rev is behind the row's rev — reject
        // instead of clobbering. Omit base_rev only for an explicit overwrite.
        if (existing && body.base_rev !== undefined && body.base_rev !== null &&
            Number(body.base_rev) !== curRev)
          return json({ error: 'stale', rev: curRev }, 409);
        const now = Date.now();
        const created = existing ? existing.created_at : now;
        const newRev = existing ? curRev + 1 : 0;
        const state = typeof body.state === 'string' ? body.state : JSON.stringify(body.state || {});
        if (state.length > 2000000) return json({ error: 'game too large' }, 413);
        await env.DB.prepare(
          `INSERT INTO games (id,sync_code,name,device,created_at,updated_at,finished,score,state,rev)
           VALUES (?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(id) DO UPDATE SET name=excluded.name, device=excluded.device,
             updated_at=excluded.updated_at, finished=excluded.finished,
             score=excluded.score, state=excluded.state, rev=excluded.rev`
        ).bind(
          id, body.code,
          String(body.name || '').slice(0, 80),
          String(body.device || '').slice(0, 40),
          created, now, body.finished ? 1 : 0,
          String(body.score || '').slice(0, 40),
          state, newRev
        ).run();
        return json({ ok: true, id, updated_at: now, rev: newRev });
      }
      if (req.method === 'DELETE') {
        const code = url.searchParams.get('code');
        if (!okCode(code)) return json({ error: 'code required' }, 400);
        await env.DB.prepare('DELETE FROM games WHERE id=? AND sync_code=?').bind(id, code).run();
        return json({ ok: true });
      }
    }
    return json({ error: 'not found' }, 404);
  },
};
