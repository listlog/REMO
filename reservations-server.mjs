import { createHmac, timingSafeEqual } from 'node:crypto';
import { configured, digest } from './board-server.mjs';

export const CONSENT_VERSION = 'study-space-launch-2026-10-08';
export const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const acceptingReservations = () => process.env.REMO_RESERVATIONS_ENABLED === 'true' && configured() && (process.env.CRON_SECRET || '').length >= 32;
export function cronAuthorized(req) {
  const secret = process.env.CRON_SECRET || '';
  return secret.length >= 32 && timingSafeEqual(Buffer.from(digest(String(req.headers.authorization || ''))), Buffer.from(digest('Bearer ' + secret)));
}
export function validateReservation(body) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const parts = email.split('@');
  if (email.length > 254 || parts.length !== 2 || parts[0].length > 64 ||
      !/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) ||
      parts[0].startsWith('.') || parts[0].endsWith('.') || parts[0].includes('..') ||
      body.consent !== true || body.consentVersion !== CONSENT_VERSION || !validToken(body.cancelToken)) throw new Error('INVALID_INPUT');
  return { email, tokenHash: digest(body.cancelToken) };
}
export async function limitRequests(req, sql) {
  const secret = process.env.REMO_ADMIN_PASSWORD;
  if (!configured()) throw new Error('NOT_CONFIGURED');
  // Vercel overwrites this header; ignore the client-controlled x-forwarded-for header.
  const ip = String(process.env.VERCEL ? (req.headers['x-vercel-forwarded-for'] || 'unknown') : (req.socket?.remoteAddress || 'local')).split(',')[0].trim();
  const key = createHmac('sha256', secret).update('study-space-reservation:' + ip).digest('hex');
  const rows = await sql`INSERT INTO public.remo_reservation_limits (key,bucket,attempts,updated_at)
    VALUES (${key},floor(extract(epoch FROM now())/900)::bigint,1,now())
    ON CONFLICT (key) DO UPDATE SET attempts=CASE WHEN remo_reservation_limits.bucket=excluded.bucket THEN remo_reservation_limits.attempts+1 ELSE 1 END,
    bucket=excluded.bucket,updated_at=now() RETURNING attempts`;
  return Number(rows[0].attempts) <= 10;
}
export async function purgeExpired(sql) {
  await sql.transaction([
    sql`DELETE FROM public.remo_reservations WHERE expires_at <= now()`,
    sql`DELETE FROM public.remo_reservation_limits WHERE updated_at < now()-interval '1 day'`
  ]);
}
