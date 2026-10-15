import {createHmac} from 'node:crypto';
import {configured} from './board-server.mjs';

export function validateMessages(body){
 if(!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>7||body.messages.length%2!==1)throw Error('INVALID_INPUT');
 return body.messages.map((message,index)=>{
  if(!message||message.role!==(index%2===0?'user':'assistant')||typeof message.content!=='string'||!message.content.trim()||message.content.length>1200)throw Error('INVALID_INPUT');
  return {role:message.role,content:message.content.trim()};
 });
}
export const containsSensitiveData=messages=>messages.some(({content})=>/[A-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}|AIza[\w-]{20,}|sk-[\w-]{12,}|(?:cancelToken|cancel-token|cancel_token)[=\s:"']|[a-f0-9]{64}|(?:비밀번호|API\s*키)\s*[:=]/i.test(content));

export async function limitSupport(req,sql){
 if(!configured())throw Error('NOT_CONFIGURED');
 const ip=String(process.env.VERCEL?(req.headers['x-vercel-forwarded-for']||'unknown'):(req.socket?.remoteAddress||'local')).split(',')[0].trim();
 const key=label=>createHmac('sha256',process.env.REMO_ADMIN_PASSWORD).update('remo-support:'+label).digest('hex');
 // Reuse the existing expiring counter table; never store messages or plain IP addresses.
 const perIp=await sql`INSERT INTO public.remo_reservation_limits (key,bucket,attempts,updated_at)
  VALUES (${key('ip:'+ip)},floor(extract(epoch FROM now())/900)::bigint,1,now())
  ON CONFLICT (key) DO UPDATE SET attempts=CASE WHEN remo_reservation_limits.bucket=excluded.bucket THEN remo_reservation_limits.attempts+1 ELSE 1 END,
  bucket=excluded.bucket,updated_at=now() RETURNING attempts`;
 if(Number(perIp[0]?.attempts)>10)return 900;
 const daily=await sql`INSERT INTO public.remo_reservation_limits (key,bucket,attempts,updated_at)
  VALUES (${key('global-day')},floor(extract(epoch FROM now())/86400)::bigint,1,now())
  ON CONFLICT (key) DO UPDATE SET attempts=CASE WHEN remo_reservation_limits.bucket=excluded.bucket THEN remo_reservation_limits.attempts+1 ELSE 1 END,
  bucket=excluded.bucket,updated_at=now() RETURNING attempts`;
 if(Number(daily[0]?.attempts)>200)return 86400-Math.floor(Date.now()/1000)%86400;
 if(!perIp[0]||!daily[0])throw Error('COUNTER_UNAVAILABLE');
 return 0;
}
