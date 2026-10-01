import {getDb} from '../db.mjs';
import {setupResponse,sameOrigin,jsonBody,isAdmin,validatePost} from '../board-server.mjs';
export function createHandler(database=getDb) { return async function handler(req,res) {
  setupResponse(res);
  if (!['GET','POST','PATCH','DELETE'].includes(req.method)) {res.setHeader('Allow','GET, POST, PATCH, DELETE');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
  if(req.method!=='GET' && !sameOrigin(req)) return res.status(403).json({error:'FORBIDDEN'});
  try {
    const sql=database();
    const url=new URL(req.url,'https://remo.local');
    const id=url.searchParams.get('id');
    if(id && !/^[1-9][0-9]{0,15}$/.test(id)) return res.status(400).json({error:'INVALID_INPUT'});
    if(req.method==='GET') {
      if(id) {
        const posts=await sql`SELECT id,title,content,category,created_at,updated_at FROM public.remo_posts WHERE id=${id} AND archived_at IS NULL`;
        return posts.length?res.status(200).json({post:posts[0]}):res.status(404).json({error:'NOT_FOUND'});
      }
      const archive=url.searchParams.get('archive')==='1';
      if(archive && !await isAdmin(req,sql)) return res.status(401).json({error:'UNAUTHORIZED'});
      const q=(url.searchParams.get('q')||'').trim().slice(0,100);
      const before=url.searchParams.get('before') || '9223372036854775807';
      if(!/^[1-9][0-9]{0,18}$/.test(before) || BigInt(before)>9223372036854775807n) return res.status(400).json({error:'INVALID_INPUT'});
      const posts=await sql`SELECT id,title,category,created_at,updated_at FROM public.remo_posts WHERE (archived_at IS NOT NULL)=${archive} AND id < ${before} AND (title ILIKE ${'%'+q+'%'} OR content ILIKE ${'%'+q+'%'}) ORDER BY id DESC LIMIT 11`;
      return res.status(200).json({posts:posts.slice(0,10),next:posts.length>10?String(posts[9].id):null});
    }
    if(!await isAdmin(req,sql)) return res.status(401).json({error:'UNAUTHORIZED'});
    let body;try{body=jsonBody(req);}catch{return res.status(400).json({error:'INVALID_INPUT'});}
    if(req.method==='DELETE' || (req.method==='PATCH' && body.restore===true)) {
      if(!id) return res.status(400).json({error:'INVALID_INPUT'});
      const restore=body.restore===true && req.method==='PATCH';
      const rows=await sql`UPDATE public.remo_posts SET archived_at=CASE WHEN ${restore} THEN NULL ELSE now() END, updated_at=now() WHERE id=${id} RETURNING id`;
      return rows.length?res.status(200).json({id:rows[0].id}):res.status(404).json({error:'NOT_FOUND'});
    }
    let data;try{data=validatePost(body);}catch{return res.status(400).json({error:'INVALID_INPUT'});}
    if(req.method==='POST') {
      const rows=await sql`INSERT INTO public.remo_posts (title,content,category) VALUES (${data.title},${data.content},${data.category}) RETURNING id`;
      return res.status(201).json({id:rows[0].id});
    }
    if(!id) return res.status(400).json({error:'INVALID_INPUT'});
    const rows=await sql`UPDATE public.remo_posts SET title=${data.title},content=${data.content},category=${data.category},updated_at=now() WHERE id=${id} AND archived_at IS NULL RETURNING id`;
    return rows.length?res.status(200).json({id:rows[0].id}):res.status(404).json({error:'NOT_FOUND'});
  } catch { return res.status(503).json({error:'SERVICE_UNAVAILABLE'}); }
}

}
export default createHandler();
