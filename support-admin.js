(() => {
 'use strict';
 const $=id=>document.getElementById('logs-'+id);
 let admin=false,authGeneration=0,listGeneration=0,detailGeneration=0,next=null,detailNext=null,selected=null,query='';
 const date=value=>new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(value));
 function setAdmin(value){admin=value;authGeneration++;$('login').hidden=value;$('content').hidden=!value;$('logout').hidden=!value;if(!value){$('list').replaceChildren();$('turns').replaceChildren();$('detail-meta').textContent='';$('detail-title').textContent='목록에서 대화를 선택해 주세요.';next=detailNext=selected=null;$('search').value='';query='';}}
 async function request(url,options={}){
  const response=await fetch(url,{...options,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(18000)}),data=await response.json();
  if(response.status===401){setAdmin(false);throw Error(data.error==='INVALID_PASSWORD'?'비밀번호를 확인해 주세요.':'관리자 로그인이 필요해요.');}
  if(!response.ok)throw Error(data.error==='TOO_MANY_ATTEMPTS'?'로그인 시도가 많아요. 15분 후 다시 시도해 주세요.':'기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
  return data;
 }
 async function load(append=false){
  const auth=authGeneration,version=++listGeneration;for(const id of ['more','refresh','search-submit','search'])$(id).disabled=true;$('list').setAttribute('aria-busy','true');$('message').textContent='대화를 불러오고 있어요…';
  try{
   const params=new URLSearchParams({q:query});if(append&&next)params.set('before',next);
   const data=await request('/api/support-logs?'+params);if(auth!==authGeneration||version!==listGeneration)return;
   if(!append)$('list').replaceChildren();
   for(const conversation of data.conversations){
    const li=document.createElement('li'),button=document.createElement('button'),preview=document.createElement('strong'),meta=document.createElement('small');button.type='button';button.dataset.conversation=conversation.conversation_id;button.setAttribute('aria-pressed',String(selected===conversation.conversation_id));preview.textContent=conversation.preview;meta.textContent=date(conversation.last_at)+' · 질문 '+conversation.turn_count+'개';button.append(preview,meta);button.addEventListener('click',()=>select(conversation));li.append(button);$('list').append(li);
   }
   next=data.next;$('more').hidden=!next;$('empty').hidden=$('list').children.length>0;$('message').textContent='현재 불러온 대화 '+$('list').children.length+'건 · 최근 30일';
  }catch(error){$('message').textContent=error.message;}
  finally{if(version===listGeneration){for(const id of ['more','refresh','search-submit','search'])$(id).disabled=false;$('list').setAttribute('aria-busy','false');}}
 }
 function select(conversation){selected=conversation.conversation_id;detailNext=null;$('detail-title').textContent='상담 대화 · '+selected.slice(0,8);$('detail-meta').textContent='시작 '+date(conversation.started_at)+' · 마지막 '+date(conversation.last_at);$('turns').replaceChildren();for(const button of $('list').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.conversation===selected));loadDetail();}
 async function loadDetail(append=false){
  const auth=authGeneration,version=++detailGeneration,id=selected;if(!id)return;$('detail-more').disabled=true;$('message').textContent='대화 내용을 불러오고 있어요…';
  try{
   const params=new URLSearchParams({conversation:id});if(append&&detailNext)params.set('after',detailNext);
   const data=await request('/api/support-logs?'+params);if(auth!==authGeneration||version!==detailGeneration||selected!==id)return;
   if(!append)$('turns').replaceChildren();
   for(const turn of data.turns){const article=document.createElement('article'),header=document.createElement('header'),time=document.createElement('time'),mode=document.createElement('span'),question=document.createElement('p'),answer=document.createElement('div'),label=document.createElement('b'),body=document.createElement('p');article.className='logs-turn';time.dateTime=turn.created_at;time.textContent=date(turn.created_at);mode.textContent=turn.response_mode==='notice'?'이용 안내':turn.needs_human?'추가 확인 필요':'AI 답변';header.append(time,mode);question.className='logs-question';question.textContent=turn.question;answer.className='logs-answer';label.textContent='Study Space 도우미';body.textContent=turn.answer;answer.append(label,body);article.append(header,question,answer);
    if(Array.isArray(turn.source_ids)&&turn.source_ids.length){const source=document.createElement('p'),link=document.createElement('a');source.className='logs-source';source.textContent='문서 근거: '+turn.source_ids.join(', ')+' · ';link.href='https://docs.google.com/document/d/1ziB0jEoLDLUYzDVObaUWxWMsjrjij9MEzRWnj0oRUos/edit?usp=sharing';link.target='_blank';link.rel='noopener noreferrer';link.textContent='안내 문서 보기 ↗';source.append(link);article.append(source);}$('turns').append(article);}
   detailNext=data.next;$('detail-more').hidden=!detailNext;$('message').textContent=data.turns.length?'대화 기록을 불러왔어요.':'보관 기간이 지난 대화이거나 표시할 기록이 없어요.';
  }catch(error){$('message').textContent=error.message;}
  finally{if(version===detailGeneration)$('detail-more').disabled=false;}
 }
 $('login-form').addEventListener('submit',async event=>{event.preventDefault();$('login-submit').disabled=true;try{await request('/api/admin',{method:'POST',body:JSON.stringify({password:$('password').value})});$('password').value='';setAdmin(true);await load();}catch(error){$('message').textContent=error.message;}finally{$('login-submit').disabled=false;}});
 $('logout').addEventListener('click',async()=>{try{await request('/api/admin',{method:'DELETE'});setAdmin(false);$('message').textContent='로그아웃했어요.';}catch(error){$('message').textContent=error.message;}});
 $('search-form').addEventListener('submit',event=>{event.preventDefault();query=$('search').value.trim();load();});$('refresh').addEventListener('click',()=>{load();if(selected)loadDetail();});$('more').addEventListener('click',()=>load(true));$('detail-more').addEventListener('click',()=>loadDetail(true));
 async function checkSession(){try{const result=await request('/api/admin');if(!result.admin){setAdmin(false);return;}if(!admin){setAdmin(true);await load();}}catch(error){setAdmin(false);$('message').textContent=error.message;}}
 window.addEventListener('pageshow',event=>{if(event.persisted){setAdmin(false);checkSession();}});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkSession();});checkSession();
})();
