import { normalizeServer } from './utils.js';

export function applyProxy(url, proxy) {
  const trimmedProxy = String(proxy || '').trim();

  if (!trimmedProxy) {
    return url;
  }

  if (trimmedProxy.includes('{url}')) {
    return trimmedProxy.replace('{url}', encodeURIComponent(url));
  }

  if (trimmedProxy.endsWith('=') || trimmedProxy.includes('?url=')) {
    return `${trimmedProxy}${encodeURIComponent(url)}`;
  }

  return `${trimmedProxy}${url}`;
}

export function buildApiUrl(account, action = '') {
  const server = normalizeServer(account.server || account.server || '');
  const username = encodeURIComponent(account.username || '');
  const password = encodeURIComponent(account.password || '');

  return `${server}/player_api.php?username=${username}&password=${password}${action ? `&action=${action}` : ''}`;
}

export async function fetchJson(url, proxy = '') {
  let response;

  const isHttpOnHttps = typeof window !== 'undefined' && window.location.protocol === 'https:' && /^http:\/\//i.test(url);
  const noProxyProvided = !proxy || !String(proxy).trim();
  let fetchUrl = isHttpOnHttps && noProxyProvided
    ? `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    : applyProxy(url, proxy);

  try {
    response = await fetch(fetchUrl, {
      headers: {
        Accept: 'application/json'
      }
    });
  } catch (err) {
    throw new Error('A conexão foi bloqueada pelo navegador ou o servidor não respondeu. Verifique a URL, HTTPS e CORS.');
  }

  if (!response.ok) {
    throw new Error(`O servidor respondeu com HTTP ${response.status}.`);
  }

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('A resposta da API Xtream Codes não veio em JSON válido.');
  }
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
