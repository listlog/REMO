import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getDb } from './db.mjs';

export const digest = value => createHash('sha256').update(value).digest('hex');
export function configured() { const size=(process.env.REMO_ADMIN_PASSWORD || '').length; return size >= 12 && size <= 256; }
export const sessionVersion = token => createHmac('sha256',process.env.REMO_ADMIN_PASSWORD).update(token).digest('hex');
export function validPassword(value) {
  return configured() && typeof value === 'string' && value.length <= 256 &&
    timingSafeEqual(Buffer.from(digest(value)), Buffer.from(digest(process.env.REMO_ADMIN_PASSWORD)));
}
export function setupResponse(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}
export function sameOrigin(req) {
  try { return new URL(req.headers.origin).host === req.headers.host &&
    ['https:', ...(process.env.VERCEL ? [] : ['http:'])].includes(new URL(req.headers.origin).protocol); }
  catch { return false; }
}
export function jsonBody(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new Error('INVALID_INPUT');
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 100000) throw new Error('INVALID_INPUT');
  return body;
}
export function sessionToken(req) {
  const match = String(req.headers.cookie || '').match(/(?:^|;\s*)remo_admin=([a-f0-9]{64})(?:;|$)/);
  return match?.[1] || '';
}
export async function isAdmin(req, sql = getDb()) {
  const token = sessionToken(req);
  if (!configured() || !token) return false;
  const rows = await sql`SELECT token_hash FROM public.remo_admin_sessions WHERE token_hash=${digest(token)} AND password_version=${sessionVersion(token)} AND expires_at > now()`;
  return rows.length === 1;
}
export function cookie(res, token, maxAge) {
  res.setHeader('Set-Cookie', `remo_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.VERCEL ? '; Secure' : ''}`);
}
export async function login(req, res, password, sql = getDb()) {
  if (!configured()) return res.status(503).json({error:'ADMIN_NOT_CONFIGURED'});
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const key = createHmac('sha256', process.env.REMO_ADMIN_PASSWORD).update(ip).digest('hex');
  const rows = await sql`INSERT INTO public.remo_login_limits (key, bucket, attempts) VALUES (${key}, floor(extract(epoch FROM now())/900)::bigint, 1) ON CONFLICT (key) DO UPDATE SET attempts=CASE WHEN remo_login_limits.bucket=excluded.bucket THEN remo_login_limits.attempts+1 ELSE 1 END, bucket=excluded.bucket RETURNING attempts`;
  if (rows[0].attempts > 10) { res.setHeader('Retry-After','900'); return res.status(429).json({error:'TOO_MANY_ATTEMPTS'}); }
  if (!validPassword(password)) return res.status(401).json({error:'INVALID_PASSWORD'});
  const token = randomBytes(32).toString('hex');
  await sql`INSERT INTO public.remo_admin_sessions (token_hash,password_version,expires_at) VALUES (${digest(token)},${sessionVersion(token)},now()+interval '8 hours')`;
  cookie(res,token,28800);
  return res.status(200).json({admin:true});
}
export function validatePost(body) {
  const title=typeof body.title==='string'?body.title.trim():'';
  const content=typeof body.content==='string'?body.content.trim():'';
  const category=body.category;
  if (!title || title.length>120 || !content || content.length>20000 || !['notice','news','project'].includes(category)) throw new Error('INVALID_INPUT');
  return {title,content,category};
}
