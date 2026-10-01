(() => {
  const $=id=>document.getElementById(id);
  const categories={notice:'공지',news:'팀 소식',project:'프로젝트'};
  let admin=false, post=null, next=null, archive=false, pending=false, listRequest=0;
  const errors={UNAUTHORIZED:'관리자 로그인이 필요해요.',INVALID_PASSWORD:'비밀번호를 확인해 주세요.',ADMIN_NOT_CONFIGURED:'관리자 계정 설정을 준비 중이에요.',TOO_MANY_ATTEMPTS:'로그인 시도가 많아요. 15분 후 다시 시도해 주세요.',INVALID_INPUT:'입력한 내용을 확인해 주세요.',NOT_FOUND:'게시글을 찾을 수 없어요.',FORBIDDEN:'페이지를 새로고침한 후 다시 시도해 주세요.'};
  async function request(url,options={}) {
    const response=await fetch(url,{...options,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)});
    const data=await response.json();
    if(!response.ok) {if(response.status===401 && data.error==='UNAUTHORIZED')setAdmin(false);throw new Error(errors[data.error]||'연결하지 못했어요. 잠시 후 다시 시도해 주세요.');}
    return data;
  }
  const date=value=>new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(value));
  function message(text) {$('board-message').textContent=text;}
  function setAdmin(value) {
    admin=value;
    document.querySelectorAll('[data-admin]').forEach(el=>el.hidden=!value);
    $('login-open').hidden=value;
    if(post){$('edit-post').hidden=!value;$('delete-post').hidden=!value;}
  }
  function screen(name) {
    for(const part of ['list','detail','editor']) $(part==='list'?'board-list-view':'board-'+part).hidden=part!==name;
    message('');
  }
  async function loadList(append=false) {
    const serial=++listRequest;
    screen('list');$('list-heading').textContent=archive?'휴지통':'전체 소식';$('load-more').disabled=true;$('board-list').setAttribute('aria-busy','true');
    const params=new URLSearchParams({q:$('board-search').value.trim(),archive:archive?'1':'0'});
    if(append && next)params.set('before',next);
    try {
      const data=await request('/api/board?'+params);
      if(serial!==listRequest)return;
      if(!append)$('board-list').replaceChildren();
      for(const item of data.posts){
        const row=document.createElement('li');row.className='board-row';
        const badge=document.createElement('span');badge.className='board-badge';badge.textContent=categories[item.category]||'소식';
        const title=document.createElement(archive?'span':'a');title.className='board-row-title';title.textContent=item.title;
        if(!archive)title.href='board.html?id='+encodeURIComponent(item.id);
        const time=document.createElement('time');time.dateTime=item.created_at;time.textContent=date(item.created_at);
        row.append(badge,title,time);
        if(archive){const restore=document.createElement('button');restore.type='button';restore.className='text-link';restore.textContent='복원';restore.addEventListener('click',async()=>{
          restore.disabled=true;try{await request('/api/board?id='+encodeURIComponent(item.id),{method:'PATCH',body:JSON.stringify({restore:true})});await loadList();message('게시글을 복원했어요.');}catch(error){message(error.message);restore.disabled=false;}
        });row.append(restore);}
        $('board-list').append(row);
      }
      next=data.next;$('load-more').hidden=!next;
      $('board-empty').hidden=$('board-list').children.length>0;
      $('empty-title').textContent=archive?'휴지통이 비어 있어요.':$('board-search').value.trim()?'검색 결과가 없어요.':'아직 등록된 소식이 없어요.';
      $('empty-copy').textContent=archive?'삭제한 게시글은 이곳에서 복원할 수 있어요.':$('board-search').value.trim()?'다른 검색어로 찾아보세요.':'REMO의 새로운 이야기가 이곳에 모입니다.';
      $('retry-list').hidden=true;
    } catch(error){if(serial===listRequest){message(error.message);$('retry-list').hidden=false;}}
    finally{if(serial===listRequest){$('load-more').disabled=false;$('board-list').setAttribute('aria-busy','false');}}
  }
  async function loadPost(id) {
    screen('detail');$('post-title').textContent='게시글을 불러오는 중…';
    try{const data=await request('/api/board?id='+encodeURIComponent(id));post=data.post;$('post-title').textContent=post.title;$('post-category').textContent=categories[post.category];$('post-date').textContent=date(post.created_at);$('post-content').textContent=post.content;$('edit-post').hidden=!admin;$('delete-post').hidden=!admin;}
    catch(error){$('post-title').textContent='게시글을 불러올 수 없어요.';message(error.message);$('edit-post').hidden=true;$('delete-post').hidden=true;}
  }
  function editor(edit=false) {
    if(!admin)return;
    screen('editor');$('editor-heading').textContent=edit?'게시글 수정':'새 소식 작성';
    $('post-form').dataset.id=edit?post.id:'';
    $('write-title').value=edit?post.title:'';$('write-content').value=edit?post.content:'';$('write-category').value=edit?post.category:'news';
    $('write-title').focus();
  }
  $('search-form').addEventListener('submit',event=>{event.preventDefault();loadList();});
  $('load-more').addEventListener('click',()=>loadList(true));
  $('retry-list').addEventListener('click',()=>loadList());
  $('write-open').addEventListener('click',()=>editor());
  $('edit-post').addEventListener('click',()=>editor(true));
  $('editor-cancel').addEventListener('click',()=>{if(post)loadPost(post.id);else loadList();});
  $('archive-toggle').addEventListener('click',()=>{archive=!archive;$('archive-toggle').textContent=archive?'게시판으로':'휴지통';loadList();});
  $('login-open').addEventListener('click',()=>{$('login-error').textContent='';$('login-dialog').showModal();$('admin-password').focus();});
  $('login-close').addEventListener('click',()=>{$('login-dialog').close();$('admin-password').value='';});
  $('login-dialog').addEventListener('close',()=>{$('admin-password').value='';});
  $('login-form').addEventListener('submit',async event=>{
    event.preventDefault();$('login-submit').disabled=true;$('login-error').textContent='';
    try{await request('/api/admin',{method:'POST',body:JSON.stringify({password:$('admin-password').value})});setAdmin(true);$('login-dialog').close();message('관리자로 로그인했어요.');}
    catch(error){$('login-error').textContent=error.message;}
    finally{$('login-submit').disabled=false;}
  });
  $('logout').addEventListener('click',async()=>{
    try{await request('/api/admin',{method:'DELETE'});setAdmin(false);archive=false;$('archive-toggle').textContent='휴지통';if(!$('board-editor').hidden||!post)await loadList();message('로그아웃했어요.');}catch(error){message(error.message);}
  });
  $('post-form').addEventListener('submit',async event=>{
    event.preventDefault();if(pending)return;pending=true;$('save-post').disabled=true;message('저장하고 있어요…');
    const id=$('post-form').dataset.id;
    try {const data=await request('/api/board'+(id?'?id='+encodeURIComponent(id):''),{method:id?'PATCH':'POST',body:JSON.stringify({title:$('write-title').value,content:$('write-content').value,category:$('write-category').value})});location.href='board.html?id='+encodeURIComponent(data.id);}
    catch(error){message(error.message);pending=false;$('save-post').disabled=false;}
  });
  $('delete-post').addEventListener('click',()=>{$('delete-dialog').showModal();});
  $('delete-cancel').addEventListener('click',()=>$('delete-dialog').close());
  $('delete-confirm').addEventListener('click',async()=>{
    $('delete-confirm').disabled=true;
    try{await request('/api/board?id='+encodeURIComponent(post.id),{method:'DELETE',body:'{}'});location.href='board.html';}
    catch(error){$('delete-dialog').close();message(error.message);$('delete-confirm').disabled=false;}
  });
  (async()=>{
    try{setAdmin((await request('/api/admin')).admin);}catch{setAdmin(false);}
    const id=new URLSearchParams(location.search).get('id');if(id)await loadPost(id);else await loadList();
  })();
})();
