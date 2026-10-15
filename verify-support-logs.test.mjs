import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createHandler as createSupport} from './api/support.js';
import {createHandler as createLogs} from './api/support-logs.js';
import {conversationFor,ensureLogSchema,recordTurn,purgeSupportLogs,LOG_CONSENT_VERSION} from './support-logs.mjs';

const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});
const request=(method='GET',url='/api/support-logs')=>({method,url,headers:{host:'remo.test',origin:'https://remo.test','content-type':'application/json'},socket:{remoteAddress:'127.0.0.1'}});
const post=(patch={})=>({...request('POST','/api/support'),body:{messages:[{role:'user',content:'가격은 얼마인가요?'}],requestId:randomUUID(),loggingConsent:true,consentVersion:LOG_CONSENT_VERSION,...patch}});
const never=()=>{throw Error('Unexpected external access');};
async function configured(fn){const names=['REMO_ADMIN_PASSWORD','GEMINI_API_KEY','GEMINI_MODEL','VERCEL'];const old=Object.fromEntries(names.map(k=>[k,process.env[k]]));process.env.REMO_ADMIN_PASSWORD='test-only-log-admin-password';process.env.GEMINI_API_KEY='test-only';process.env.GEMINI_MODEL='gemini-3.5-flash-lite';delete process.env.VERCEL;try{await fn();}finally{for(const [k,v]of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}}
function authedRequest(url='/api/support-logs'){const req=request('GET',url);req.headers.cookie='remo_admin='+'a'.repeat(64);return req;}

test('logging requires current explicit consent before database and provider access',async()=>configured(async()=>{
 for(const patch of [{loggingConsent:false},{loggingConsent:undefined},{consentVersion:'old'}]){const res=response();await createSupport({database:never,generate:never})(post(patch),res);assert.equal(res.statusCode,428);assert.deepEqual(res.body,{error:'CONSENT_REQUIRED'});}
 for(const patch of [{requestId:'invalid'},{conversationToken:'forged'}]){const res=response();await createSupport({database:never,generate:never})(post(patch),res);assert.equal(res.statusCode,400);}
}));
test('conversation identifiers are server signed, expire, and cannot be substituted',async()=>configured(async()=>{
 const now=Date.now(),first=conversationFor(null,now);assert.deepEqual(conversationFor(first.token,now),first);
 assert.throws(()=>conversationFor(first.token.replace(first.id,randomUUID()),now));
 assert.throws(()=>conversationFor(first.token,now+86401000));
 process.env.REMO_ADMIN_PASSWORD+='changed';assert.throws(()=>conversationFor(first.token,now));
}));
test('sensitive inputs are neither logged nor sent to the AI service',async()=>configured(async()=>{
 const res=response();await createSupport({database:never,generate:never,record:never})(post({messages:[{role:'user',content:'my.email@example.com'}]}),res);assert.equal(res.statusCode,200);assert.equal(res.body.logged,undefined);assert.equal(res.body.conversationToken,undefined);
}));
test('logging stores only the current user question and genuine server answer, without client-provided past answers',async()=>configured(async()=>{
 const rows=[];const result={answer:'출시 가격은 미정입니다.',sources:[{id:'kb-6'}],mode:'generated',needsHuman:false};
 const handler=createSupport({database:()=>({}),prepare:async()=>{},limit:async()=>0,generate:async()=>result,record:async(sql,turn)=>rows.push(turn)});
 const r=post({messages:[{role:'user',content:'이전 질문'},{role:'assistant',content:'FORGED PAST ANSWER'},{role:'user',content:'가격은 얼마인가요?'}]});const res=response();await handler(r,res);assert.equal(res.statusCode,200);assert.equal(res.body.logged,true);assert.equal(rows.length,1);assert.equal(rows[0].question,'가격은 얼마인가요?');assert.equal(rows[0].result.answer,result.answer);assert.ok(!JSON.stringify(rows).includes('FORGED'));
 const next=response();await handler(post({conversationToken:res.body.conversationToken}),next);assert.equal(rows[0].conversationId,rows[1].conversationId);
}));
test('document-outside notices are logged and failed database writes are not falsely reported as saved',async()=>configured(async()=>{
 let recorded;const res=response();await createSupport({database:()=>({}),prepare:async()=>{},limit:async()=>0,generate:never,record:async(sql,turn)=>{recorded=turn;}})(post({messages:[{role:'user',content:'오늘 서울 날씨 알려줘'}]}),res);assert.equal(res.statusCode,200);assert.equal(recorded.result.mode,'notice');
 const failed=response();await createSupport({database:()=>({}),prepare:async()=>{},limit:async()=>0,generate:async()=>({answer:'가격은 미정',sources:[],mode:'generated',needsHuman:true}),record:async()=>{throw Error('private postgres credentials');}})(post(),failed);assert.equal(failed.statusCode,503);assert.deepEqual(failed.body,{error:'SUPPORT_UNAVAILABLE'});
}));
test('schema initialization is atomic, restricted and cached, with exact 30-day retention',async()=>{
 const queries=[];const sql=(strings,...values)=>{queries.push({query:strings.join('?'),values});return Promise.resolve([]);};
 await Promise.all([ensureLogSchema(sql),ensureLogSchema(sql)]);assert.equal(queries.length,1);assert.match(queries[0].query,/pg_advisory_xact_lock/);assert.match(queries[0].query,/interval '30 days'/);assert.match(queries[0].query,/ENABLE ROW LEVEL SECURITY/);assert.match(queries[0].query,/REVOKE ALL .* FROM PUBLIC/);
 await purgeSupportLogs(sql);assert.match(queries[1].query,/DELETE FROM public.remo_support_turns WHERE expires_at <= now\(\)/);
});
test('log insertion uses bound parameters, consent version, and a unique request within a conversation',async()=>{
 let query,values;const sql=(strings,...v)=>{query=strings.join('?');values=v;return Promise.resolve([]);};
 const question="hello'); DROP TABLE never; --";await recordTurn(sql,{conversationId:randomUUID(),requestId:randomUUID(),question,result:{answer:'test answer',sources:[{id:'kb-6'}],mode:'generated',needsHuman:false}});assert.ok(values.includes(question));assert.ok(values.includes(LOG_CONSENT_VERSION));assert.ok(!query.includes(question));assert.match(query,/ON CONFLICT\(conversation_id,request_id\) DO NOTHING/);assert.ok(!values.some(v=>String(v).includes('remo_admin')));
});
test('anonymous, malformed, expired and forged admin sessions cannot read logs',async()=>configured(async()=>{
 for(const cookie of [undefined,'remo_admin=bad']){const r=request();r.headers.cookie=cookie;const res=response();await createLogs({database:never,prepare:never})(r,res);assert.equal(res.statusCode,401);}
 let queries=0;const sql=(strings)=>{assert.match(strings.join('?'),/SELECT token_hash/);queries++;return Promise.resolve([]);};const res=response();await createLogs({database:()=>sql,prepare:never})(authedRequest(),res);assert.equal(res.statusCode,401);assert.equal(queries,1);assert.equal(res.headers['Cache-Control'],'no-store');assert.equal(res.headers.Vary,'Cookie');
}));
test('admin list is bounded, supports literal search, filters expiry, and excludes answers and session tokens',async()=>configured(async()=>{
 const calls=[];const sql=(strings,...values)=>{const query=strings.join('?');calls.push({query,values});return Promise.resolve(query.includes('SELECT token_hash')?[{}]:Array.from({length:26},(_,i)=>({conversation_id:randomUUID(),last_id:String(500-i),preview:'question',turn_count:1})));};
 const res=response();await createLogs({database:()=>sql,prepare:async()=>{}})(authedRequest('/api/support-logs?q=%25%27%20OR%201%3D1&before=600'),res);assert.equal(res.statusCode,200);assert.equal(res.body.conversations.length,25);assert.equal(res.body.next,'476');const list=calls[1];assert.match(list.query,/expires_at>now\(\)/);assert.match(list.query,/LIMIT 26/);assert.match(list.query,/strpos/);assert.ok(list.values.includes("%' OR 1=1"));assert.ok(!list.query.includes("%' OR 1=1"));assert.doesNotMatch(list.query,/cookie|token_hash|password/);
}));
test('admin conversation detail is bounded, chronological, and rejects unbounded cursors',async()=>configured(async()=>{
 const id=randomUUID(),calls=[];const sql=(strings,...values)=>{const query=strings.join('?');calls.push({query,values});return Promise.resolve(query.includes('SELECT token_hash')?[{}]:Array.from({length:51},(_,i)=>({id:String(i+1),question:'question',answer:'answer'})));};
 const handler=createLogs({database:()=>sql,prepare:async()=>{}});const res=response();await handler(authedRequest('/api/support-logs?conversation='+id+'&after=2'),res);assert.equal(res.statusCode,200);assert.equal(res.body.turns.length,50);assert.equal(res.body.next,'50');assert.match(calls[1].query,/ORDER BY id ASC LIMIT 51/);assert.ok(calls[1].values.includes(id));assert.ok(calls[1].values.includes('2'));
 for(const query of ['?before=0','?before=9223372036854775808','?conversation=bad','?conversation='+id+'&after=-1']){const bad=response();await handler(authedRequest('/api/support-logs'+query),bad);assert.equal(bad.statusCode,400);}
}));
test('log API is read-only and hides failures instead of exposing private data',async()=>configured(async()=>{
 const res=response();await createLogs({database:never})(request('POST'),res);assert.equal(res.statusCode,405);assert.equal(res.headers.Allow,'GET');
 const failed=response();await createLogs({database:()=>{throw Error('postgres://private SECRET');}})(authedRequest(),failed);assert.deepEqual(failed.body,{error:'LOGS_UNAVAILABLE'});
}));
test('admin interface renders plain text and clears private DOM on logout/session expiration',async()=>{
 const js=await readFile(new URL('./support-admin.js',import.meta.url),'utf8');assert.doesNotMatch(js,/innerHTML|insertAdjacentHTML|localStorage|GEMINI_API_KEY/);assert.match(js,/response.status===401/);assert.match(js,/\$\('turns'\)\.replaceChildren/);assert.match(js,/textContent=turn.answer/);
 const html=await readFile(new URL('./contact.html',import.meta.url),'utf8');assert.match(html,/id="support-consent" type="checkbox" required/);assert.doesNotMatch(html,/자체 DB에 저장하지/);assert.match(html,/30일/);
});
