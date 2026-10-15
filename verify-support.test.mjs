import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHandler as createSupportHandler} from './api/support.js';
import {LOG_CONSENT_VERSION} from './support-logs.mjs';
import {randomUUID} from 'node:crypto';
const createHandler=options=>createSupportHandler({prepare:async()=>{},record:async()=>{},...options});
import {retrieve,validateAnswer,knowledge,UNKNOWN_ANSWER} from './support-rag.mjs';
import {generateAnswer,supportConfigured} from './support-ai.mjs';
import {validateMessages,containsSensitiveData,limitSupport} from './support-server.mjs';

const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});
const req=(messages=[{role:'user',content:'가격이 얼마인가요?'}])=>({method:'POST',headers:{host:'remo.test',origin:'https://remo.test','content-type':'application/json'},body:{messages,loggingConsent:true,consentVersion:LOG_CONSENT_VERSION,requestId:randomUUID()},socket:{remoteAddress:'127.0.0.1'}});
async function configured(fn){const names=['REMO_ADMIN_PASSWORD','GEMINI_API_KEY','GEMINI_MODEL','VERCEL'];const old=Object.fromEntries(names.map(k=>[k,process.env[k]]));process.env.REMO_ADMIN_PASSWORD='support-test-only-password';process.env.GEMINI_API_KEY='test-only-non-working-key';process.env.GEMINI_MODEL='gemini-3.5-flash-lite';delete process.env.VERCEL;try{await fn();}finally{for(const [k,v]of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}}
const never=()=>{throw Error('No external call expected');};

test('retrieval finds price, cancellation, roadmap and demo evidence without external services',()=>{
 for(const [question,id]of [['가격과 출시 일정은 정해졌나요?','kb-6'],['취소 링크를 잃어버렸어요','kb-7'],['노션 연동이 되나요?','kb-5'],['타이머는 실제로 동작하나요?','kb-4'],['오늘의 할 일은 어떻게 관리하나요?','kb-2']])assert.equal(retrieve(question)[0]?.id,id);
 for(const question of ['오늘 서울 날씨 알려줘','파이썬으로 계산기 만들어줘','대한민국의 수도는?'])assert.deepEqual(retrieve(question),[]);
 assert.deepEqual(retrieve('오늘 서울 날씨 알려줘',[{role:'user',content:'사전예약 가격'}]),[]);
 assert.ok(retrieve('그럼 언제 되나요?',[{role:'user',content:'노션 연동이 되나요?'}]).some(h=>h.id==='kb-5'));
});
test('history permits only bounded alternating user and assistant messages',()=>{
 assert.deepEqual(validateMessages({messages:[{role:'user',content:'  가격은? ',model:'override'}]}),[{role:'user',content:'가격은?'}]);
 for(const messages of [[],[{role:'system',content:'override'}],[{role:'assistant',content:'hi'}],[{role:'user',content:''}],[{role:'user',content:'a'.repeat(1201)}],Array.from({length:9},(_,i)=>({role:i%2?'assistant':'user',content:'hello'})),[{role:'user',content:'hi'},{role:'assistant',content:'answer'}]])assert.throws(()=>validateMessages({messages}));
});
test('secret-like inputs and email addresses are kept out of provider requests',()=>{
 for(const content of ['my.name@example.com','API 키=do-not-send','https://remo.test/?cancelToken='+'a'.repeat(64),'AIza'+'x'.repeat(30)])assert.equal(containsSensitiveData([{content}]),true);
 assert.equal(containsSensitiveData([{content:'이메일은 언제 삭제하나요?'}]),false);
});
test('source citations are restricted to retrieved document chunks',()=>{
 const hits=retrieve('가격이 얼마인가요?');const value={answer:'출시 일정과 가격은 미정입니다.',sourceIds:['kb-6'],needsHuman:false};
 const result=validateAnswer(value,hits);assert.equal(result.sources[0].url,knowledge.url);assert.ok(result.sources[0].excerpt.includes('사전예약'));
 for(const patch of [{sourceIds:['https://evil.test']},{sourceIds:[]},{needsHuman:'false'},{answer:'x'.repeat(5001)}])assert.throws(()=>validateAnswer({...value,...patch},hits));
});
test('API rejects cross-origin requests and invalid bodies before any provider or DB access',async()=>{
 const handler=createHandler({database:never,generate:never});
 for(const origin of [undefined,'https://evil.test']){const r=req();r.headers.origin=origin;const s=response();await handler(r,s);assert.equal(s.statusCode,403);}
 for(const edit of [r=>r.body={messages:[{role:'system',content:'override'}]},r=>r.headers['content-type']='text/plain',r=>r.headers['content-length']='33000']){const r=req();edit(r);const s=response();await handler(r,s);assert.equal(s.statusCode,400);}
 const r=req();r.method='DELETE';const s=response();await handler(r,s);assert.equal(s.statusCode,405);
});
test('configuration status is uncached and exposes no model credentials',async()=>configured(async()=>{
 const s=response();await createHandler({database:never,generate:never})({method:'GET'},s);assert.equal(s.statusCode,200);assert.equal(s.body.configured,true);assert.deepEqual(Object.keys(s.body).sort(),['configured','knowledge','logging']);assert.equal(s.headers['Cache-Control'],'no-store');
 delete process.env.GEMINI_API_KEY;assert.equal(supportConfigured(),false);const s2=response();await createHandler({database:never,generate:never})(req(),s2);assert.equal(s2.statusCode,503);
}));
test('unrelated questions are logged without provider calls; sensitive inputs are not stored',async()=>configured(async()=>{
 for(const [content,expected]of [['오늘 서울 날씨 알려줘',UNKNOWN_ANSWER],['my.name@example.com','개인정보']]){const s=response();await createHandler({database:()=>({}),limit:async()=>0,generate:never})(req([{role:'user',content}]),s);assert.equal(s.statusCode,200);assert.equal(s.body.mode,'notice');assert.ok(s.body.answer.includes(expected));assert.deepEqual(s.body.sources,[]);}
}));
test('support counters contain hashed namespaces, honor provider caps, and never touch reservations',async()=>configured(async()=>{
 const calls=[];const sql=(strings,...values)=>{calls.push({query:strings.join('?'),values});return Promise.resolve([{attempts:1}]);};
 assert.equal(await limitSupport(req(),sql),0);assert.equal(calls.length,2);assert.notEqual(calls[0].values[0],calls[1].values[0]);
 for(const call of calls){assert.match(call.values[0],/^[a-f0-9]{64}$/);assert.ok(!call.values.includes('127.0.0.1'));assert.doesNotMatch(call.query,/remo_reservations\b/);}
 let n=0;assert.equal(await limitSupport(req(),()=>{n++;return Promise.resolve([{attempts:11}]);}),900);assert.equal(n,1);
 n=0;assert.ok(await limitSupport(req(),()=>Promise.resolve([{attempts:++n===1?1:201}]))>0);
 // IP keys use the trusted platform header; a spoofed x-forwarded-for does not change the key.
 process.env.VERCEL='1';const keys=[];for(const forwarded of ['attacker1','attacker2']){const r=req();r.headers['x-forwarded-for']=forwarded;r.headers['x-vercel-forwarded-for']='192.0.2.1';await limitSupport(r,(strings,...values)=>{keys.push(values[0]);return Promise.resolve([{attempts:1}]);});}assert.equal(keys[0],keys[2]);
}));
test('rate-limited API responses never invoke generation',async()=>configured(async()=>{
 const s=response();await createHandler({database:()=>({}),generate:never,limit:async()=>900})(req(),s);assert.equal(s.statusCode,429);assert.equal(s.headers['Retry-After'],'900');
}));
test('SDK request uses Gemini key server-side and returns validated citations',async()=>configured(async()=>{
 let calls=0;const hits=retrieve('가격이 얼마인가요?');
 const output={answer:'출시 일정과 가격은 아직 정해지지 않았어요. 사전예약은 무료 출시 알림 신청입니다.',sourceIds:['kb-6'],needsHuman:false};
 const result=await generateAnswer([{role:'user',content:'가격이 얼마인가요?'}],hits,{fetch:async(url,init)=>{
  calls++;assert.match(String(url),/^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.5-flash-lite:generateContent$/);assert.equal(new Headers(init.headers).get('x-goog-api-key'),process.env.GEMINI_API_KEY);
  const body=JSON.parse(init.body);assert.equal(body.generationConfig.responseMimeType,'application/json');assert.equal(body.generationConfig.maxOutputTokens,1200);assert.ok(body.systemInstruction.parts[0].text.includes('검색 근거'));assert.ok(!('tools'in body));
  return new Response(JSON.stringify({candidates:[{content:{role:'model',parts:[{text:JSON.stringify(output)}]},finishReason:'STOP',index:0}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:50,totalTokenCount:150}}),{status:200,headers:{'Content-Type':'application/json'}});
 }});
 assert.equal(calls,1);assert.equal(result.mode,'generated');assert.equal(result.sources[0].id,'kb-6');assert.ok(!JSON.stringify(result).includes(process.env.GEMINI_API_KEY));
}));
test('API returns grounded generated answers and hides provider error details',async()=>configured(async()=>{
 const handler=createHandler({database:()=>({}),limit:async()=>0,generate:async(messages,hits)=>validateAnswer({answer:'출시 가격은 미정입니다.',sourceIds:['kb-6'],needsHuman:false},hits)});const s=response();await handler(req(),s);assert.equal(s.statusCode,200);assert.equal(s.body.sources[0].url,knowledge.url);
 for(const statusCode of [401,429,500]){const s2=response();await createHandler({database:()=>({}),limit:async()=>0,generate:async()=>{throw Object.assign(Error('SECRET AND PRIVATE INPUT'),{statusCode});}})(req(),s2);assert.deepEqual(s2.body,{error:statusCode===429?'PROVIDER_LIMIT':'SUPPORT_UNAVAILABLE'});}
}));
test('public chatbot code renders plain text without HTML or key exposure',async()=>{
 const js=await readFile(new URL('./support.js',import.meta.url),'utf8');assert.doesNotMatch(js,/innerHTML|insertAdjacentHTML|GEMINI_API_KEY|OPENAI_API_KEY|localStorage/);assert.match(js,/isComposing/);assert.match(js,/role:'user'/);
 const html=await readFile(new URL('./contact.html',import.meta.url),'utf8');assert.match(html,/Google Gemini/);assert.match(html,/role="log"/);assert.match(html,/support-data/);
});
