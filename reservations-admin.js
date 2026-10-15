(() => {
  'use strict';
  const $ = id => document.getElementById('reservation-admin-' + id);
  let next = null, deleting = null, busy = false, generation = 0;
  function setAdmin(admin) {
    generation++;
    $('login').hidden = admin; $('content').hidden = !admin; $('logout').hidden = !admin;
    if (!admin) { $('list').replaceChildren(); next = null; $('delete-dialog').close(); deleting = null; }
  }
  async function request(url, options = {}) {
    const response = await fetch(url, {...options,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)});
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 && data.error === 'UNAUTHORIZED') setAdmin(false);
      throw new Error(data.error === 'INVALID_PASSWORD' ? '비밀번호를 확인해 주세요.' : data.error === 'UNAUTHORIZED' ? '관리자 로그인이 필요해요.' : data.error === 'TOO_MANY_ATTEMPTS' ? '로그인 시도가 많아요. 15분 후 다시 시도해 주세요.' : '연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
    return data;
  }
  const date = value => new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeZone:'Asia/Seoul'}).format(new Date(value));
  async function load(append = false) {
    if (busy) return;
    busy = true; const current = generation;
    $('more').disabled = true; $('refresh').disabled = true; $('message').textContent = '신청을 불러오고 있어요…';
    try {
      const data = await request('/api/reservations' + (append && next ? '?before=' + encodeURIComponent(next) : ''));
      if (current !== generation) return;
      if (!append) $('list').replaceChildren();
      for (const item of data.reservations) {
        const row = document.createElement('li'); row.className = 'board-row';
        const label = document.createElement('span'); label.className = 'board-badge'; label.textContent = '출시 알림';
        const detail = document.createElement('div'); detail.className = 'board-row-title'; detail.style.overflowWrap = 'anywhere';
        const email = document.createElement('p'); email.textContent = item.email;
        const time = document.createElement('small'); time.textContent = '신청 ' + date(item.created_at) + ' · 보관 기한 ' + date(item.expires_at);
        detail.append(email,time);
        const button = document.createElement('button'); button.type = 'button'; button.className = 'text-link'; button.textContent = '삭제';
        button.addEventListener('click', () => { deleting = item.id; $('delete-error').textContent = ''; $('delete-dialog').showModal(); });
        row.append(label,detail,button); $('list').append(row);
      }
      next = data.next; $('more').hidden = !next; $('empty').hidden = $('list').children.length > 0;
      $('message').textContent = '현재 불러온 신청 ' + $('list').children.length + '건';
    } catch (error) { $('message').textContent = error.message; }
    finally { busy = false; $('more').disabled = false; $('refresh').disabled = false; }
  }
  $('login-form').addEventListener('submit', async event => {
    event.preventDefault(); $('login-submit').disabled = true;
    try {
      await request('/api/admin', {method:'POST',body:JSON.stringify({password:$('password').value})});
      $('password').value = ''; setAdmin(true); await load();
    } catch (error) { $('message').textContent = error.message; }
    finally { $('login-submit').disabled = false; }
  });
  $('logout').addEventListener('click', async () => {
    try { await request('/api/admin', {method:'DELETE'}); setAdmin(false); $('message').textContent = '로그아웃했어요.'; }
    catch (error) { $('message').textContent = error.message; }
  });
  $('refresh').addEventListener('click', () => load());
  $('more').addEventListener('click', () => load(true));
  $('delete-cancel').addEventListener('click', () => $('delete-dialog').close());
  $('delete-confirm').addEventListener('click', async () => {
    if (!deleting) return;
    $('delete-confirm').disabled = true;
    try { await request('/api/reservations?id=' + encodeURIComponent(deleting), {method:'DELETE'}); $('delete-dialog').close(); deleting = null; await load(); }
    catch (error) { $('delete-error').textContent = error.message; }
    finally { $('delete-confirm').disabled = false; }
  });
  (async () => {
    try { const {admin} = await request('/api/admin'); setAdmin(admin); if (admin) await load(); }
    catch (error) { setAdmin(false); $('message').textContent = error.message; }
  })();
})();
