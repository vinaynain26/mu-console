/* Shared studio chrome: top bar, sidebar, session, helpers. */
export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s == null ? '' : s)
  .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

export function ago(iso) {
  if (!iso) return 'never';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 2592000) return Math.floor(s / 86400) + 'd ago';
  return new Date(iso).toLocaleDateString();
}

export async function api(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: opts.body ? { 'Content-Type': 'application/json', ...(opts.headers || {}) } : opts.headers,
  });
  if (res.status === 401) { location.href = '/console/login?next=' + encodeURIComponent(location.pathname); throw new Error('signed out'); }
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || ('Request failed (' + res.status + ')'));
  return out;
}

export const ROLE_TONE = { admin: 'info', editor: 'ok', commenter: '', viewer: '' };

export async function chrome(active) {
  const acct = await api('/api/account');
  if (!acct.user) { location.href = '/console/login'; throw new Error('signed out'); }
  const u = acct.user;

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="topbar">
      <a class="brand" href="/console">MU Console <span>· Programme pages</span></a>
      <div class="spacer"></div>
      <div class="who">
        <span class="badge ${ROLE_TONE[u.role] || ''}">${esc(u.role)}</span>
        <div class="avatar" title="${esc(u.email)}">${initials(u.name)}</div>
        <button class="btn sm" id="__out">Sign out</button>
      </div>
    </div>`);

  const side = document.querySelector('.side');
  if (side) {
    side.innerHTML = `
      <div class="grp">Content</div>
      <a href="/console" class="${active === 'pages' ? 'on' : ''}">Pages</a>
      ${u.role === 'admin' ? `<div class="grp">Settings</div>
      <a href="/console/people" class="${active === 'people' ? 'on' : ''}">People &amp; roles</a>` : ''}`;
  }

  document.getElementById('__out').addEventListener('click', async () => {
    await fetch('/api/account/logout', { method: 'POST' });
    location.href = '/console/login';
  });
  return acct;
}
