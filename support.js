(() => {
 'use strict';
 const form=document.getElementById('support-form'),input=document.getElementById('support-question'),send=document.getElementById('support-send');
 const list=document.getElementById('support-messages'),status=document.getElementById('support-status'),notice=document.getElementById('support-notice');
 const reset=document.getElementById('support-reset'),reconnect=document.getElementById('support-reconnect'),count=document.getElementById('support-count');
 const suggestions=[...document.querySelectorAll('[data-question]')],welcome=list.firstElementChild.cloneNode(true);
 let available=false,busy=false,history=[];
 const errors={SUPPORT_NOT_CONFIGURED:'상담 연결을 준비 중이에요. 잠시 후 다시 확인해 주세요.',TOO_MANY_REQUESTS:'이용 가능한 상담 횟수를 초과했어요. 잠시 후 다시 이용해 주세요.',PROVIDER_LIMIT:'현재 AI 서비스의 사용 한도에 도달했어요. 잠시 후 다시 시도해 주세요.',INVALID_INPUT:'질문을 1,200자 이내로 입력해 주세요.',SUPPORT_UNAVAILABLE:'답변을 가져오지 못했어요. 질문은 입력창에 남겨 두었으니 다시 전송해 주세요.'};
 function controls(){input.disabled=!available||busy;send.disabled=!available||busy||!input.value.trim();reset.disabled=busy||list.children.length<=1;suggestions.forEach(button=>{button.disabled=!available||busy;});form.setAttribute('aria-busy',String(busy));count.textContent=input.value.length.toLocaleString('ko-KR')+' / 1,200';}
 function showNotice(text=''){notice.textContent=text;notice.hidden=!text;}
 function scroll(){list.scrollTop=list.scrollHeight;}
 function addMessage(role,text,{sources=[],mode='generated',needsHuman=false}={}){
  const article=document.createElement('article');article.className='support-message support-'+role;
  const label=document.createElement('p');label.className='support-message-label';label.textContent=role==='user'?'나':'Study Space 도우미';
  const bubble=document.createElement('div');bubble.className='support-bubble';bubble.textContent=text;article.append(label,bubble);
  if(sources.length){const citations=document.createElement('div');citations.className='support-citations';
   for(const source of sources.slice(0,3)){
    // Only the configured reference document is linkable; never render model HTML or arbitrary URLs.
    if(source.url!=='https://docs.google.com/document/d/1ziB0jEoLDLUYzDVObaUWxWMsjrjij9MEzRWnj0oRUos/edit?usp=sharing')continue;
    const details=document.createElement('details'),summary=document.createElement('summary'),quote=document.createElement('blockquote'),link=document.createElement('a'),date=document.createElement('small');
    summary.textContent='문서 근거 · '+source.title;quote.textContent=source.excerpt;link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='원문에서 확인 ↗';date.textContent='참고 문서 반영일 '+source.updatedAt;details.append(summary,quote,link,date);citations.append(details);
   }article.append(citations);
  }
  if(role==='assistant'&&(mode==='notice'||needsHuman)){const hint=document.createElement('p');hint.className='support-message-note';hint.textContent=mode==='notice'?'상담 이용 안내':'문서에서 확인되지 않은 사항은 추가 확인이 필요해요.';article.append(hint);}
  list.append(article);scroll();return article;
 }
 async function connect(){
  available=false;reconnect.hidden=true;controls();status.textContent='상담 연결을 확인하고 있어요…';delete status.dataset.ready;showNotice();
  try{
   const response=await fetch('/api/support',{cache:'no-store',signal:AbortSignal.timeout(12000)}),data=await response.json();
   if(!response.ok||!data.configured)throw Error('SUPPORT_NOT_CONFIGURED');
   available=true;status.textContent='AI 안내 · 질문을 보내 주세요';status.dataset.ready='true';
   document.getElementById('support-knowledge').textContent='참고 문서: '+data.knowledge.title+' · 반영일 '+data.knowledge.updatedAt;
  }catch{status.textContent='상담 연결을 준비 중이에요';showNotice(errors.SUPPORT_NOT_CONFIGURED);reconnect.hidden=false;}
  controls();
 }
 async function submit(event){
  event.preventDefault();const question=input.value.trim();if(!available||busy||!question)return;
  if(question.length>1200){showNotice(errors.INVALID_INPUT);return;}
  busy=true;showNotice();controls();const user=addMessage('user',question),pending=addMessage('assistant','관련 안내 문서를 살펴보고 있어요');pending.classList.add('support-pending');
  try{
   const messages=[...history.slice(-6).map(message=>({...message,content:message.content.slice(0,1200)})),{role:'user',content:question}];
   const response=await fetch('/api/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages}),signal:AbortSignal.timeout(35000)});
   const data=await response.json();if(!response.ok)throw Error(data.error||'SUPPORT_UNAVAILABLE');
   if(typeof data.answer!=='string'||!Array.isArray(data.sources))throw Error('SUPPORT_UNAVAILABLE');
   pending.remove();addMessage('assistant',data.answer,data);
   // Sensitive-input notices are deliberately excluded from subsequent provider requests.
   if(data.mode!=='notice')history.push({role:'user',content:question},{role:'assistant',content:data.answer});
   history=history.slice(-6);input.value='';
  }catch(error){pending.remove();user.remove();showNotice(errors[error.message]||errors.SUPPORT_UNAVAILABLE);}
  finally{busy=false;controls();input.focus();}
 }
 form.addEventListener('submit',submit);input.addEventListener('input',controls);
 input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();form.requestSubmit();}});
 suggestions.forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.question;controls();form.requestSubmit();}));
 reset.addEventListener('click',()=>{history=[];input.value='';list.replaceChildren(welcome.cloneNode(true));showNotice();controls();input.focus();});
 reconnect.addEventListener('click',connect);connect();
})();
