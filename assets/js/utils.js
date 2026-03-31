export const STORAGE_KEYS = {
  accounts: 'nexora.accounts',
  activeAccount: 'nexora.activeAccount',
  favorites: 'nexora.favorites',
  progress: 'nexora.progress',
  recents: 'nexora.recents',
  libraries: 'nexora.libraries'
};

export function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

export function slugify(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatRuntime(value) {
  const total = Number(value || 0);

  if (!Number.isFinite(total) || total <= 0) {
    return 'Ao vivo';
  }

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours <= 0) {
    return `${minutes}min`;
  }

  return `${hours}h ${minutes}min`;
}

export function formatClock(value) {
  const total = Math.max(0, Math.floor(Number(value || 0)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatUnixDate(value) {
  const numeric = Number(value || 0);

  if (!numeric) {
    return 'não informado';
  }

  return new Date(numeric * 1000).toLocaleDateString('pt-BR');
}

export function makePoster(title, tone = '#2e2e2e') {
  const safeTitle = escapeHtml(title);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${tone}" />
          <stop offset="100%" stop-color="#0d0d0d" />
        </linearGradient>
      </defs>
      <rect width="600" height="900" fill="url(#g)" />
      <circle cx="470" cy="160" r="110" fill="rgba(255,255,255,.09)" />
      <circle cx="140" cy="720" r="120" fill="rgba(255,255,255,.06)" />
      <text x="52" y="700" fill="#ffffff" font-size="60" font-family="Arial, Helvetica, sans-serif" font-weight="700">${safeTitle}</text>
      <text x="52" y="760" fill="#d1d1d1" font-size="24" font-family="Arial, Helvetica, sans-serif">Nexora</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function normalizeServer(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');

  if (!raw) {
    return '';
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return `https://${raw}`;
}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function sortByAdded(items = []) {
  return [...items].sort((a, b) => Number(b.added || 0) - Number(a.added || 0));
}

export function makeAccountId(server, username) {
  return `acct-${slugify(`${server}-${username}`)}`;
}
