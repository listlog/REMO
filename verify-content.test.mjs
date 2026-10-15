import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import handler from './api/content.js';
function response() { return { headers:{}, setHeader(k,v){this.headers[k]=v;}, status(s){this.statusCode=s;return this;}, json(body){this.body=body;return this;} }; }
test('public endpoint rejects writes before connecting to DB',async()=>{
 for(const method of ['POST','PUT','DELETE','PATCH']) { const res=response();await handler({method},res);assert.equal(res.statusCode,405);assert.equal(res.headers.Allow,'GET'); }
});
test('missing credentials return a generic uncached error',async()=>{
 const previous=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
 try {const res=response();await handler({method:'GET'},res);assert.equal(res.statusCode,503);assert.deepEqual(res.body,{error:'CONTENT_UNAVAILABLE'});assert.equal(res.headers['Cache-Control'],'no-store');}
 finally{if(previous!==undefined)process.env.DATABASE_URL=previous;}
});
test('published output contains only intended public files',async()=>{
 const files=await readdir(new URL('./dist/',import.meta.url));assert.equal(files.length,34);
 for(const file of files){if (!["support-admin.html","support-admin.css","support-admin.js","support.js","support.css","reservations.js","reservations-admin.html","reservations-admin.js","study-space.html","study-space.css","study-space.js","study-space-hero.png","study-space-plan.png","study-space-learn.png","study-space-manage.png","study-space-review.png","study-space-hand.ttf","study-space-font-license.txt"].includes(file)) assert.match(file,/^(index|about|team|projects|contact|board|terms|privacy|project-[123])\.html$|^(styles\.css|app\.js|content\.js|board\.js|board\.css)$/);assert.deepEqual(await readFile(new URL('./dist/'+file,import.meta.url)),await readFile(new URL('./'+file,import.meta.url)));}
});
