(() => {
  'use strict';
  if (location.protocol === 'file:') return;
  const page = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
  const text = (node, value) => {
    if (!node) return;
    node.textContent = value || '';
    if (value) node.removeAttribute('aria-label');
  };
  const picture = (node, value, alt) => {
    if (!node || !value) return;
    let url;
    try { url = new URL(value, location.origin); } catch { return; }
    if (url.protocol !== 'https:' && !(url.origin === location.origin && url.protocol === 'http:')) return;
    const img = document.createElement('img');
    img.alt = alt || 'REMO 이미지';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('load', () => {
      node.replaceChildren(img);
      node.classList.add('has-image');
      node.removeAttribute('role');
      node.removeAttribute('aria-label');
    }, { once: true });
    img.src = url.href;
  };
  const badge = (node, status) => {
    if (!node) return;
    const labels = { active: '진행 중', completed: '완료', planned: '예정' };
    const safe = Object.hasOwn(labels, status) ? status : 'planned';
    node.className = 'status-badge ' + safe;
    node.textContent = labels[safe];
  };
  async function load() {
    try {
      const response = await fetch('/api/content', { signal: AbortSignal.timeout(15000), cache: 'no-store' });
      if (!response.ok) throw new Error('Unavailable');
      const data = await response.json();
      if (![data.members, data.projects, data.pages].every(Array.isArray)) throw new Error('Invalid content');
      document.querySelector('.team-grid')?.setAttribute('aria-label', 'REMO 팀원 ' + data.members.length + '명');
      document.querySelectorAll('.member-card').forEach((card, index) => {
        const member = data.members.find(row => row.id === index + 1);
        card.hidden = !member;
        if (!member) return;
        text(card.querySelector('.member-name'), [member.name, member.role].filter(Boolean).join(' · '));
        text(card.querySelector('.member-skills'), member.skills);
        text(card.querySelector('.member-contact'), member.public_contact);
        picture(card.querySelector('.member-image'), member.image_url, member.name ? member.name + ' 프로필 사진' : '팀원 프로필 사진');
      });
      document.querySelectorAll('.project-card').forEach((card, index) => {
        const project = data.projects.find(row => row.id === index + 1);
        card.dataset.published = String(Boolean(project));
        card.hidden = !project;
        if (!project) return;
        card.dataset.status = project.status;
        card.setAttribute('aria-label', project.title || '프로젝트 ' + project.id);
        text(card.querySelector('.project-title-space'), project.title);
        text(card.querySelector('.project-copy'), [project.period, project.description].filter(Boolean).join('\n'));
        badge(card.querySelector('.status-badge'), project.status);
        picture(card.querySelector('.project-image'), project.image_url, project.title);
      });
      document.querySelectorAll('.featured-card').forEach((card, index) => {
        const project = data.projects[index];
        card.hidden = !project;
        if (!project) return;
        const link = card.querySelector('a');
        link.href = 'project-' + project.id + '.html';
        link.setAttribute('aria-label', (project.title || '프로젝트 ' + project.id) + ' 보기');
        text(card.querySelector('.featured-copy'), [project.title, project.period, project.description].filter(Boolean).join('\n'));
        picture(card.querySelector('.featured-image'), project.image_url, project.title);
      });
      const detailId = /^project-([1-3])$/.exec(page);
      if (detailId) {
        const project = data.projects.find(row => row.id === Number(detailId[1]));
        if (project) {
          text(document.querySelector('.detail-name'), project.title);
          picture(document.querySelector('.detail-image'), project.image_url, project.title);
          badge(document.querySelector('.detail-heading .status-badge'), project.status);
          document.querySelectorAll('.metadata-value').forEach((node, i) => text(node, [project.period, project.participants][i]));
          document.querySelectorAll('.detail-copy').forEach((node, i) => text(node, [project.description, project.activities, project.process, project.results][i]));
        } else {
          document.querySelectorAll('.detail-name,.detail-image,.project-meta,.detail-section,.detail-heading .status-badge').forEach(node => { node.hidden = true; });
          text(document.querySelector('h1'), '공개된 프로젝트가 없습니다');
        }
      }
      data.pages.filter(row => row.page === page).forEach(row => {
        // Match fixed attributes instead of interpreting database content as selectors or HTML.
        document.querySelectorAll('[data-content-slot]').forEach(node => {
          if (node.dataset.contentSlot !== row.slot) return;
          if (node.classList.contains('image-placeholder')) picture(node, row.image_url, node.getAttribute('aria-label'));
          else text(node, row.content);
        });
      });
      document.querySelector('[data-filter][aria-pressed="true"]')?.click();
      document.documentElement.dataset.contentState = 'loaded';
    } catch {
      document.documentElement.dataset.contentState = 'error';
      const notice = document.createElement('p');
      notice.className = 'content-notice';
      notice.setAttribute('role', 'status');
      notice.textContent = '내용을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = '다시 시도';
      retry.addEventListener('click', () => { notice.remove(); load(); }, { once: true });
      notice.append(' ', retry);
      document.querySelector('main').prepend(notice);
    }
  }
  load();
})();
