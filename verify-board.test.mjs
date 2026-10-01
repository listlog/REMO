import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler as boardHandler} from './api/board.js';
import {createHandler as adminHandler} from './api/admin.js';
import {digest,sessionVersion,validPassword,validatePost,isAdmin} from './board-server.mjs';
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};}
function req(method='GET',body={},url='/api/board'){return {method,body,url,headers:{host:'remo.test',origin:'https://remo.test','content-type':'application/json'}};}
test('all write methods reject cross-origin requests before DB access',async()=>{
  for(const method of ['POST','PATCH','DELETE']){const r=req(method);r.headers.origin='https://attacker.test';const s=response();await boardHandler(()=>{throw Error('must not access DB');})(r,s);assert.equal(s.statusCode,403);}
});
test('anonymous visitors cannot create, edit, delete or see trash',async()=>{
  for(const [method,url] of [['POST','/api/board'],['PATCH','/api/board?id=1'],['DELETE','/api/board?id=1'],['GET','/api/board?archive=1']]){const s=response();await boardHandler(()=>()=>{throw Error('must not execute SQL');})(req(method,{},url),s);assert.equal(s.statusCode,401);}
});
test('post validation rejects empty, oversized and unknown categories',()=>{
  for(const data of [{title:' ',content:'text',category:'news'},{title:'a'.repeat(121),content:'text',category:'news'},{title:'test',content:'a'.repeat(20001),category:'news'},{title:'test',content:'text',category:'admin'}])assert.throws(()=>validatePost(data));
  assert.deepEqual(validatePost({title:' <img> ',content:'hello\nworld',category:'notice'}),{title:'<img>',content:'hello\nworld',category:'notice'});
});
test('list uses bound search parameters and bounded pages',async()=>{
  const needle="' OR 1=1 --";let bindings;
  const sql=async(strings,...values)=>{bindings=values;assert.match(strings.join('?'),/LIMIT 11/);return Array.from({length:11},(_,i)=>({id:String(30-i),title:'safe'}));};
  const s=response();await boardHandler(()=>sql)(req('GET',{},'/api/board?q='+encodeURIComponent(needle)),s);
  assert.equal(s.statusCode,200);assert.equal(s.body.posts.length,10);assert.equal(s.body.next,'21');assert.ok(bindings.includes('%'+needle+'%'));
});
test('database errors are sanitized and responses are uncached',async()=>{
  const s=response();await boardHandler(()=>{throw Error('postgres://secret');})(req(),s);assert.equal(s.statusCode,503);assert.deepEqual(s.body,{error:'SERVICE_UNAVAILABLE'});assert.equal(s.headers['Cache-Control'],'no-store');
});
test('password verification, login rate limit and session cookie',async()=>{
  const old=process.env.REMO_ADMIN_PASSWORD;process.env.REMO_ADMIN_PASSWORD='local-test-only-password';
  try{
    assert.equal(validPassword('wrong'),false);assert.equal(validPassword(process.env.REMO_ADMIN_PASSWORD),true);
    const calls=[];let attempts=1;
    const sql=async(strings,...values)=>{calls.push({query:strings.join('?'),values});return strings.join('').includes('remo_login_limits')?[{attempts}]:[];};
    let s=response();await adminHandler(()=>sql)(req('POST',{password:'wrong'},'/api/admin'),s);assert.equal(s.statusCode,401);
    s=response();await adminHandler(()=>sql)(req('POST',{password:process.env.REMO_ADMIN_PASSWORD},'/api/admin'),s);assert.equal(s.statusCode,200);assert.match(s.headers['Set-Cookie'],/HttpOnly; SameSite=Strict/);assert.match(s.headers['Set-Cookie'],/Max-Age=28800/);
    const token=s.headers['Set-Cookie'].match(/remo_admin=([a-f0-9]+)/)[1];assert.equal(calls.at(-1).values[0],digest(token));
    attempts=11;s=response();await adminHandler(()=>sql)(req('POST',{password:process.env.REMO_ADMIN_PASSWORD},'/api/admin'),s);assert.equal(s.statusCode,429);
    const r=req();r.headers.cookie='remo_admin='+token;let sessionParams;assert.equal(await isAdmin(r,async(strings,...values)=>{sessionParams=values;assert.match(strings.join('?'),/expires_at > now/);return [];}),false);assert.equal(sessionParams[1],sessionVersion(token));
  }finally{if(old===undefined)delete process.env.REMO_ADMIN_PASSWORD;else process.env.REMO_ADMIN_PASSWORD=old;}
});
test('authenticated post creation, archive and restore remain parameterized',async()=>{
  process.env.REMO_ADMIN_PASSWORD='local-test-only-password';
  try{
    const calls=[];const sql=async(strings,...values)=>{const query=strings.join('?');calls.push({query,values});return query.includes('SELECT token_hash')?[{token_hash:'test'}]:[{id:'7'}];};
    for(const [method,body,url] of [['POST',{title:'Hello',content:'World',category:'news'},'/api/board'],['DELETE',{},'/api/board?id=7'],['PATCH',{restore:true},'/api/board?id=7']]){
      const r=req(method,body,url);r.headers.cookie='remo_admin='+'a'.repeat(64);const s=response();await boardHandler(()=>sql)(r,s);assert.equal(s.statusCode,method==='POST'?201:200);
    }
    assert.ok(calls.some(c=>c.query.includes('INSERT INTO public.remo_posts')&&c.values[0]==='Hello'));
    assert.ok(calls.some(c=>c.query.includes('archived_at=CASE')&&c.values[0]===false));
    assert.ok(calls.some(c=>c.query.includes('archived_at=CASE')&&c.values[0]===true));
    assert.ok(calls.every(c=>!c.query.includes('DELETE FROM public.remo_posts')));
  }finally{delete process.env.REMO_ADMIN_PASSWORD;}
});
