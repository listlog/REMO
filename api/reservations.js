import { getDb } from '../db.mjs';
import { setupResponse, sameOrigin, jsonBody, isAdmin, digest } from '../board-server.mjs';
import { CONSENT_VERSION, acceptingReservations, cronAuthorized, validateReservation, validToken, limitRequests, purgeExpired } from '../reservations-server.mjs';
import {purgeSupportLogs} from '../support-logs.mjs';

export function createHandler(database = getDb) {
  return async function handler(req, res) {
    setupResponse(res);
    if (!['GET','POST','DELETE'].includes(req.method)) {
      res.setHeader('Allow','GET, POST, DELETE');
      return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
    }
    const url = new URL(req.url, 'https://remo.local');
    const action = url.searchParams.get('action');
    if (req.method !== 'GET' && !sameOrigin(req)) return res.status(403).json({error:'FORBIDDEN'});
    try {
      if (req.method === 'GET' && action === 'cleanup') {
        if (!cronAuthorized(req)) return res.status(401).json({error:'UNAUTHORIZED'});
        await purgeExpired(database());
        await purgeSupportLogs(database());
        return res.status(200).json({ok:true});
      }
      if (req.method === 'GET' && action === 'status') {
        if (!acceptingReservations()) return res.status(200).json({accepting:false});
        const sql = database();
        await sql`SELECT id FROM public.remo_reservations LIMIT 0`;
        await sql`SELECT key FROM public.remo_reservation_limits LIMIT 0`;
        return res.status(200).json({accepting:true});
      }
      if (req.method === 'POST') {
        let body;
        try {
          body = jsonBody(req);
          if (JSON.stringify(body).length > 4096) throw new Error('INVALID_INPUT');
        } catch { return res.status(400).json({error:'INVALID_INPUT'}); }
        // Cancellation stays available when new registrations are paused.
        if (action === 'cancel') {
          if (!validToken(body.cancelToken)) return res.status(400).json({error:'INVALID_INPUT'});
          const sql = database();
          await sql`DELETE FROM public.remo_reservations WHERE cancel_token_hash=${digest(body.cancelToken)}`;
          return res.status(200).json({ok:true});
        }
        if (action) return res.status(400).json({error:'INVALID_INPUT'});
        if (!acceptingReservations()) return res.status(503).json({error:'REGISTRATION_PAUSED'});
        let data;
        try { data = validateReservation(body); } catch { return res.status(400).json({error:'INVALID_INPUT'}); }
        // Honeypot: match the normal response without storing spam.
        if (body.website) return res.status(202).json({accepted:true});
        const sql = database();
        if (!await limitRequests(req, sql)) {
          res.setHeader('Retry-After','900');
          return res.status(429).json({error:'TOO_MANY_ATTEMPTS'});
        }
        await purgeExpired(sql);
        await sql`INSERT INTO public.remo_reservations (email,cancel_token_hash,consent_version,expires_at)
          VALUES (${data.email},${data.tokenHash},${CONSENT_VERSION},now()+interval '6 months')
          ON CONFLICT (email) DO NOTHING`;
        // Never disclose whether someone else's email is already registered.
        return res.status(202).json({accepted:true});
      }
      const sql = database();
      if (!await isAdmin(req, sql)) return res.status(401).json({error:'UNAUTHORIZED'});
      if (action) return res.status(400).json({error:'INVALID_INPUT'});
      if (req.method === 'DELETE') {
        const id = url.searchParams.get('id') || '';
        if (!/^[1-9][0-9]{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) return res.status(400).json({error:'INVALID_INPUT'});
        await sql`DELETE FROM public.remo_reservations WHERE id=${id}`;
        return res.status(200).json({ok:true});
      }
      const before = url.searchParams.get('before') || '9223372036854775807';
      if (!/^[1-9][0-9]{0,18}$/.test(before) || BigInt(before) > 9223372036854775807n) return res.status(400).json({error:'INVALID_INPUT'});
      await purgeExpired(sql);
      const rows = await sql`SELECT id,email,created_at,expires_at FROM public.remo_reservations
        WHERE expires_at > now() AND id < ${before} ORDER BY id DESC LIMIT 51`;
      return res.status(200).json({reservations:rows.slice(0,50),next:rows.length>50?String(rows[49].id):null});
    } catch { return res.status(503).json({error:'SERVICE_UNAVAILABLE'}); }
  };
}
export default createHandler();
