import {getDb} from '../db.mjs';
import {setupResponse,configured,sessionToken,isAdmin} from '../board-server.mjs';
import {ensureLogSchema,validUuid,LOG_RETENTION_DAYS} from '../support-logs.mjs';

const validCursor=value=>/^[1-9][0-9]{0,18}$/.test(value)&&BigInt(value)<=9223372036854775807n;
export function createHandler({database=getDb,prepare=ensureLogSchema}={}){
 return async function handler(req,res){
  setupResponse(res);res.setHeader('Vary','Cookie');res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
  // Reject anonymous calls before even opening a database client.
  if(!configured()||!sessionToken(req))return res.status(401).json({error:'UNAUTHORIZED'});
  try{
   const sql=database();
   if(!await isAdmin(req,sql))return res.status(401).json({error:'UNAUTHORIZED'});
   const url=new URL(req.url,'https://remo.local'),id=url.searchParams.get('conversation');
   await prepare(sql);
   if(id!==null){
    const after=url.searchParams.get('after')||'0';
    if(!validUuid(id)||(after!=='0'&&!validCursor(after)))return res.status(400).json({error:'INVALID_INPUT'});
    const turns=await sql`SELECT id,question,answer,source_ids,response_mode,needs_human,created_at,expires_at
     FROM public.remo_support_turns WHERE conversation_id=${id}::uuid AND expires_at>now() AND id>${after}::bigint ORDER BY id ASC LIMIT 51`;
    return res.status(200).json({turns:turns.slice(0,50),next:turns.length>50?String(turns[49].id):null,retentionDays:LOG_RETENTION_DAYS});
   }
   const before=url.searchParams.get('before')||'9223372036854775807',query=(url.searchParams.get('q')||'').trim();
   if(!validCursor(before)||query.length>100)return res.status(400).json({error:'INVALID_INPUT'});
   const conversations=await sql`SELECT conversation_id,min(created_at) AS started_at,max(created_at) AS last_at,
    max(id) AS last_id,count(*)::integer AS turn_count,(array_agg(left(question,90) ORDER BY id))[1] AS preview
    FROM public.remo_support_turns WHERE expires_at>now()
    GROUP BY conversation_id HAVING max(id)<${before}::bigint AND
    (${query}='' OR bool_or(strpos(lower(question),lower(${query}))>0 OR strpos(lower(answer),lower(${query}))>0))
    ORDER BY max(id) DESC LIMIT 26`;
   return res.status(200).json({conversations:conversations.slice(0,25),next:conversations.length>25?String(conversations[24].last_id):null,retentionDays:LOG_RETENTION_DAYS});
  }catch{return res.status(503).json({error:'LOGS_UNAVAILABLE'});}
 };
}
export default createHandler();
