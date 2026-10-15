import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {configured} from './board-server.mjs';

export const LOG_RETENTION_DAYS=30;
export const LOG_CONSENT_VERSION='support-logs-30-days-2026-10-15';
export const loggingInfo=Object.freeze({retentionDays:LOG_RETENTION_DAYS,consentVersion:LOG_CONSENT_VERSION});
export const validUuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
const signature=text=>createHmac('sha256',process.env.REMO_ADMIN_PASSWORD).update('remo-support-conversation:'+text).digest('hex');
export function conversationFor(token,now=Date.now()){
 if(!configured())throw Error('NOT_CONFIGURED');
 if(token===undefined||token===null){
  const id=randomUUID(),part=id+'.'+Math.floor(now/1000);return {id,token:part+'.'+signature(part)};
 }
 if(typeof token!=='string'||token.length>120)throw Error('INVALID_CONVERSATION');
 const [id,time,sig,...rest]=token.split('.');const age=Math.floor(now/1000)-Number(time);
 if(rest.length||!validUuid(id)||!/^\d{10}$/.test(time)||!/^[a-f0-9]{64}$/.test(sig)||age<0||age>86400)throw Error('INVALID_CONVERSATION');
 if(!timingSafeEqual(Buffer.from(sig),Buffer.from(signature(id+'.'+time))))throw Error('INVALID_CONVERSATION');
 return {id,token};
}

const initializing=new WeakMap();
export function ensureLogSchema(sql){
 if(!initializing.has(sql)){
  const job=(async()=>{
   // One atomic, idempotent migration; no credential-bearing migration endpoint is exposed.
   await sql`DO $remo_support_logs_v1$ BEGIN
    PERFORM pg_advisory_xact_lock(742621301);
    CREATE TABLE IF NOT EXISTS public.remo_support_turns (
     id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     conversation_id uuid NOT NULL,
     request_id uuid NOT NULL,
     question text NOT NULL CHECK(length(question) BETWEEN 1 AND 1200),
     answer text NOT NULL CHECK(length(answer) BETWEEN 1 AND 5000),
     source_ids jsonb NOT NULL CHECK(jsonb_typeof(source_ids)='array'),
     response_mode text NOT NULL CHECK(response_mode IN ('generated','notice')),
     needs_human boolean NOT NULL,
     consent_version text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now(),
     expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
     UNIQUE(conversation_id,request_id)
    );
    CREATE INDEX IF NOT EXISTS remo_support_turns_conversation ON public.remo_support_turns(conversation_id,id);
    CREATE INDEX IF NOT EXISTS remo_support_turns_expiry ON public.remo_support_turns(expires_at);
    ALTER TABLE public.remo_support_turns ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.remo_support_turns FROM PUBLIC;
   END; $remo_support_logs_v1$`;
  })().catch(error=>{initializing.delete(sql);throw error;});
  initializing.set(sql,job);
 }
 return initializing.get(sql);
}
export async function recordTurn(sql,{conversationId,requestId,question,result}){
 await sql`INSERT INTO public.remo_support_turns
  (conversation_id,request_id,question,answer,source_ids,response_mode,needs_human,consent_version)
  VALUES (${conversationId},${requestId},${question},${result.answer},${JSON.stringify(result.sources.map(source=>source.id))}::jsonb,${result.mode},${result.needsHuman},${LOG_CONSENT_VERSION})
  ON CONFLICT(conversation_id,request_id) DO NOTHING`;
}
export async function purgeSupportLogs(sql){
 await ensureLogSchema(sql);
 await sql`DELETE FROM public.remo_support_turns WHERE expires_at <= now()`;
}
