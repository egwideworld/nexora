import { normalizeServer } from './utils.js';

const DEFAULT_CORS_PROXY = 'https://your-vps-proxy.example.com/?url='; // Replace with your own production proxy

function resolveProxy(proxy) {
  const trimmedProxy = String(proxy || '').trim();

  if (trimmedProxy) {
    return trimmedProxy;
  }

  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem('nexora.defaultProxy') || '';
    if (saved.trim()) {
      return saved.trim();
    }
  }

  return DEFAULT_CORS_PROXY;
}

export function applyProxy(url, proxy) {
  const effectiveProxy = resolveProxy(proxy);

  if (!effectiveProxy) {
    return url;
  }

  if (effectiveProxy.includes('{url}')) {
    return effectiveProxy.replace('{url}', encodeURIComponent(url));
  }

  if (effectiveProxy.endsWith('=') || effectiveProxy.includes('?url=')) {
    return `${effectiveProxy}${encodeURIComponent(url)}`;
  }

  return `${effectiveProxy}${url}`;
}

export function buildApiUrl(account, action = '') {
  const server = normalizeServer(account.server || account.server || '');
  const username = encodeURIComponent(account.username || '');
  const password = encodeURIComponent(account.password || '');

  return `${server}/player_api.php?username=${username}&password=${password}${action ? `&action=${action}` : ''}`;
}

export async function fetchJson(url, proxy = '') {
  const isHttpOnHttps = typeof window !== 'undefined' && window.location.protocol === 'https:' && /^http:\/\//i.test(url);

  const fallbackProxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://cors.sh/${encodeURIComponent(url)}`,
    `https://html-driven.appspot.com/https://${encodeURIComponent(url)}`,
    `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://cors-anywhere.herokuapp.com/${encodeURIComponent(url)}`,
    `https://cors.bridged.cc/?uri=${encodeURIComponent(url)}`,
    `https://whateverorigin.herokuapp.com/get?url=${encodeURIComponent(url)}`,
    `https://alloworigin.com/get?url=${encodeURIComponent(url)}`,
    `https://gobetween.herokuapp.com/${encodeURIComponent(url)}`,
    `https://cors.taskcluster.net/${encodeURIComponent(url)}`
  ];

  const requestUrls = [applyProxy(url, proxy)];

  if (isHttpOnHttps) {
    requestUrls.push(...fallbackProxies);
  }

  let lastError = null;

  for (const requestUrl of requestUrls) {
    try {
      const response = await fetch(requestUrl, {
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        lastError = new Error(`O servidor respondeu com HTTP ${response.status}.`);
        continue;
      }

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (parseError) {
        lastError = new Error('A resposta da API Xtream Codes não veio em JSON válido.');
        continue;
      }
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error('A conexão foi bloqueada pelo navegador ou o servidor não respondeu. Verifique a URL, HTTPS e CORS.');
}

export function buildMovieUrl(account, item) {
  const server = normalizeServer(account.server || '');
  return `${server}/movie/${encodeURIComponent(account.username)}/${encodeURIComponent(account.password)}/${item.streamId}.${item.extension || 'mp4'}`;
}

export function buildLiveUrl(account, item, extension = 'm3u8') {
  const server = normalizeServer(account.server || '');
  return `${server}/live/${encodeURIComponent(account.username)}/${encodeURIComponent(account.password)}/${item.streamId}.${extension}`;
}

export function buildEpisodeUrl(account, episode) {
  const server = normalizeServer(account.server || '');
  return `${server}/series/${encodeURIComponent(account.username)}/${encodeURIComponent(account.password)}/${episode.id}.${episode.extension || 'mp4'}`;
}
