/* Shared studio chrome: fixed sidebar (brand / nav / user chip), session, helpers. */
export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s == null ? '' : s)
  .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

/* Small stroke icon set — 16px, inherits currentColor. */
export const icon = (name, size = 16) => {
  const paths = {
    pages: '<path d="M9 2H4.5A1.5 1.5 0 0 0 3 3.5v9A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V6z"/><path d="M9 2v4h4"/>',
    people: '<circle cx="6" cy="5.5" r="2.5"/><path d="M1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4"/><path d="M11 3.3a2.5 2.5 0 0 1 0 4.4M12 9.8c1.5.5 2.5 1.9 2.5 3.7"/>',
    out: '<path d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6"/><path d="M10.5 11 14 8l-3.5-3M14 8H6"/>',
    search: '<circle cx="7" cy="7" r="4.5"/><path d="m13.5 13.5-3.3-3.3"/>',
    open: '<path d="M5 11l6-6M6 5h5v5"/>',
    back: '<path d="m9.5 3.5-4.5 4.5 4.5 4.5"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor"
    stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
};

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

  const side = document.querySelector('.side');
  if (side) {
    side.innerHTML = `
      <a class="side-brand" href="/console"><img class="logo" src="/console-ui/assets/mu-mark-white.svg" alt="">MU Console</a>
      <div class="side-nav">
        <div class="side-grp">Content</div>
        <a href="/console" class="${active === 'pages' ? 'on' : ''}">${icon('pages')}Pages</a>
        ${u.role === 'admin' ? `<div class="side-grp">Settings</div>
        <a href="/console/people" class="${active === 'people' ? 'on' : ''}">${icon('people')}People &amp; roles</a>` : ''}
      </div>
      <div class="side-foot">
        <div class="avatar" title="${esc(u.email)}">${initials(u.name)}</div>
        <div class="me"><b>${esc(u.name)}</b><span>${esc(u.role)}</span></div>
        <button class="iconbtn" id="__out" title="Sign out">${icon('out')}</button>
      </div>`;
    document.getElementById('__out').addEventListener('click', async () => {
      await fetch('/api/account/logout', { method: 'POST' });
      location.href = '/console/login';
    });
  }
  return acct;
}
