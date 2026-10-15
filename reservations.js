(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const form = $('reservation-form');
  const submit = $('reservation-submit');
  const message = $('reservation-message');
  let pending = false, token = '', tokenEmail = '';
  const errors = {
    INVALID_INPUT:'이메일과 필수 동의를 확인해 주세요.',
    TOO_MANY_ATTEMPTS:'신청 시도가 많아요. 15분 후 다시 시도해 주세요.',
    REGISTRATION_PAUSED:'현재 신청 접수를 준비 중이에요.',
    FORBIDDEN:'페이지를 새로고침한 뒤 다시 시도해 주세요.'
  };
  async function request(url, options = {}) {
    const response = await fetch(url, {...options, credentials:'same-origin', cache:'no-store',
      headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(15000)});
    const data = await response.json();
    if (!response.ok) throw new Error(errors[data.error] || '연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
    return data;
  }
  async function availability() {
    $('reservation-retry').hidden = true;
    try {
      const data = await request('/api/reservations?action=status');
      submit.disabled = !data.accepting;
      message.textContent = data.accepting ? '출시 알림 신청을 받고 있어요.' : '신청 접수를 준비 중이에요. 아직 이메일은 저장되지 않습니다.';
      $('reservation-retry').hidden = data.accepting;
    } catch {
      submit.disabled = true;
      message.textContent = '접수 연결을 확인할 수 없어요. 잠시 후 다시 시도해 주세요.';
      $('reservation-retry').hidden = false;
    }
  }
  $('reservation-retry').addEventListener('click', availability);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || submit.disabled) return;
    pending = true; submit.disabled = true; message.textContent = '신청을 접수하고 있어요…';
    const email = $('reservation-email').value.trim().toLowerCase();
    if (!token || email !== tokenEmail) {
      token = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2,'0')).join('');
      tokenEmail = email;
    }
    try {
      await request('/api/reservations', {method:'POST', body:JSON.stringify({
        email, consent:$('reservation-consent').checked, consentVersion:'study-space-launch-2026-10-08',
        cancelToken:token, website:$('reservation-website').value
      })});
      $('reservation-receipt').hidden = false;
      $('reservation-cancel-link').value = location.origin + location.pathname + '#cancel=' + token;
      form.reset();
      message.textContent = '신청을 접수했어요. 이미 신청한 이메일은 중복 등록하지 않습니다.';
      $('reservation-receipt').focus();
      token = ''; tokenEmail = '';
    } catch (error) { message.textContent = error.message; }
    finally { pending = false; submit.disabled = false; }
  });
  $('reservation-copy').addEventListener('click', async () => {
    const input = $('reservation-cancel-link');
    try { await navigator.clipboard.writeText(input.value); $('reservation-copy-status').textContent = '취소 링크를 복사했어요.'; }
    catch { input.focus(); input.select(); $('reservation-copy-status').textContent = '선택된 링크를 직접 복사해 주세요.'; }
  });
  let cancelToken = /^#cancel=([a-f0-9]{64})$/.exec(location.hash)?.[1];
  if (cancelToken) {
    history.replaceState(null, '', location.pathname + location.search + '#reservation');
    $('reservation-cancel-panel').hidden = false;
    $('reservation-cancel-panel').focus();
  }
  $('reservation-cancel-confirm').addEventListener('click', async () => {
    if (!cancelToken) return;
    const button = $('reservation-cancel-confirm'); button.disabled = true;
    try {
      await request('/api/reservations?action=cancel', {method:'POST',body:JSON.stringify({cancelToken})});
      $('reservation-cancel-status').textContent = '취소 처리를 완료했어요. 이 링크에 연결된 신청이 있다면 이메일이 삭제됩니다.';
      cancelToken = '';
    } catch (error) { $('reservation-cancel-status').textContent = error.message; button.disabled = false; }
  });
  availability();
})();
