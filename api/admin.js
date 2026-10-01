import {getDb} from '../db.mjs';
import {setupResponse,sameOrigin,jsonBody,isAdmin,login,cookie,sessionToken,digest} from '../board-server.mjs';
export function createHandler(database=getDb) { return async function handler(req,res) {
  setupResponse(res);
  if (!['GET','POST','DELETE'].includes(req.method)) {res.setHeader('Allow','GET, POST, DELETE');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
  if (req.method!=='GET' && !sameOrigin(req)) return res.status(403).json({error:'FORBIDDEN'});
  try {
    if (req.method==='GET') return res.status(200).json({admin:await isAdmin(req,database())});
    if (req.method==='POST') {
      let body;try{body=jsonBody(req);}catch{return res.status(400).json({error:'INVALID_INPUT'});}
      return await login(req,res,body.password,database());
    }
    const token=sessionToken(req);
    if(token) {const sql=database();await sql`DELETE FROM public.remo_admin_sessions WHERE token_hash=${digest(token)}`;}
    cookie(res,'',0);return res.status(200).json({admin:false});
  } catch { return res.status(503).json({error:'SERVICE_UNAVAILABLE'}); }
}

}
export default createHandler();
