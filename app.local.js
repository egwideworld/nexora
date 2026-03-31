// app.local.js - fallback for file:// running environments. Generated from utils, api and app.

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

  // preserve protocol; se vier http, mantém http para o caso do servidor não suportar https.
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
  const hasProxy = !!proxy && !!String(proxy).trim();

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

  const requestUrls = [];

  if (hasProxy) {
    requestUrls.push(applyProxy(url, proxy));
  }

  if (isHttpOnHttps) {
    requestUrls.push(...fallbackProxies);
  } else {
    requestUrls.push(applyProxy(url, proxy));
  }

  for (const fetchUrl of requestUrls) {
    try {
      response = await fetch(fetchUrl, {
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        continue;
      }

      const text = await response.text();

      try {
        return JSON.parse(text);
      } catch {
        continue;
      }
    } catch {
      continue;
    }
  }

  throw new Error('A conexão foi bloqueada pelo navegador ou o servidor não respondeu. Verifique a URL, HTTPS e CORS.');

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


  STORAGE_KEYS,
  safeParse,
  escapeHtml,
  formatRuntime,
  formatClock,
  formatUnixDate,
  makePoster,
  normalizeServer,
  safeArray,
  sortByAdded,
  makeAccountId
} from './assets/js/utils.js';

  applyProxy as applyProxyFn,
  buildApiUrl as buildApiUrlFn,
  fetchJson as fetchJsonFn,
  buildMovieUrl as buildMovieUrlFn,
  buildLiveUrl as buildLiveUrlFn,
  buildEpisodeUrl as buildEpisodeUrlFn
} from './assets/js/api.js';

class NexoraApp {
  constructor() {
    this.state = {
      view: 'home',
      search: '',
      accounts: safeParse(localStorage.getItem(STORAGE_KEYS.accounts), []),
      activeAccountId: localStorage.getItem(STORAGE_KEYS.activeAccount) || '',
      favorites: safeParse(localStorage.getItem(STORAGE_KEYS.favorites), {}),
      progress: safeParse(localStorage.getItem(STORAGE_KEYS.progress), {}),
      recents: safeParse(localStorage.getItem(STORAGE_KEYS.recents), []),
      libraries: safeParse(localStorage.getItem(STORAGE_KEYS.libraries), {}),
      currentLibrary: null,
      currentPlayback: null,
      hls: null,
      lastProgressSave: 0
    };

    this.removeLegacyDemoState();
    this.dom = this.collectDom();
    this.bindEvents();
    this.bootstrap();
  }

  collectDom() {
    return {
      pageShell: document.querySelector('.page-shell'),
      contentShell: document.querySelector('.content-shell'),
      authGate: document.getElementById('authGate'),
      authForm: document.getElementById('authForm'),
      heroSection: document.getElementById('heroSection'),
      rowsContainer: document.getElementById('rowsContainer'),
      continueSection: document.getElementById('continueSection'),
      continueRow: document.getElementById('continueRow'),
      statusPill: document.getElementById('statusPill'),
      statusText: document.getElementById('statusText'),
      searchInput: document.getElementById('searchInput'),
      accountsList: document.getElementById('accountsList'),
      accountsCounter: document.getElementById('accountsCounter'),
      activeAccountLabel: document.getElementById('activeAccountLabel'),
      sidebarOverviewCard: document.getElementById('sidebarOverviewCard'),
      accountHeroCard: document.getElementById('accountHeroCard'),
      accountSummaryCard: document.getElementById('accountSummaryCard'),
      quickStatsGrid: document.getElementById('quickStatsGrid'),
      viewHeadline: document.getElementById('viewHeadline'),
      profilePill: document.getElementById('profilePill'),
      mobileMenuBtn: document.getElementById('mobileMenuBtn'),
      closeSidebarBtn: document.getElementById('closeSidebarBtn'),
      sidebarBackdrop: document.getElementById('sidebarBackdrop'),
      refreshAllAccountsBtn: document.getElementById('refreshAllAccountsBtn'),
      importAccountsBtn: document.getElementById('importAccountsBtn'),
      exportAccountsBtn: document.getElementById('exportAccountsBtn'),
      importAccountsInput: document.getElementById('importAccountsInput'),
      clearProgressBtn: document.getElementById('clearProgressBtn'),
      connectModal: document.getElementById('connectModal'),
      connectForm: document.getElementById('connectForm'),
      detailsModal: document.getElementById('detailsModal'),
      detailsPoster: document.getElementById('detailsPoster'),
      detailsType: document.getElementById('detailsType'),
      detailsTitle: document.getElementById('detailsTitle'),
      detailsMeta: document.getElementById('detailsMeta'),
      detailsDescription: document.getElementById('detailsDescription'),
      detailsBadges: document.getElementById('detailsBadges'),
      detailsPlayBtn: document.getElementById('detailsPlayBtn'),
      detailsFavoriteBtn: document.getElementById('detailsFavoriteBtn'),
      detailsEpisodesWrap: document.getElementById('detailsEpisodesWrap'),
      detailsEpisodes: document.getElementById('detailsEpisodes'),
      playerModal: document.getElementById('playerModal'),
      playerSurface: document.getElementById('playerSurface'),
      playerControls: document.getElementById('playerControls'),
      playerTitle: document.getElementById('playerTitle'),
      playerMeta: document.getElementById('playerMeta'),
      videoPlayer: document.getElementById('videoPlayer'),
      playerSeek: document.getElementById('playerSeek'),
      playerCurrentTime: document.getElementById('playerCurrentTime'),
      playerDuration: document.getElementById('playerDuration'),
      playerLiveBadge: document.getElementById('playerLiveBadge'),
      playerPlayPauseBtn: document.getElementById('playerPlayPauseBtn'),
      playerBackBtn: document.getElementById('playerBackBtn'),
      playerForwardBtn: document.getElementById('playerForwardBtn'),
      playerMuteBtn: document.getElementById('playerMuteBtn'),
      playerVolume: document.getElementById('playerVolume'),
      playerSpeedSelect: document.getElementById('playerSpeedSelect'),
      playerPipBtn: document.getElementById('playerPipBtn'),
      playerFullscreenBtn: document.getElementById('playerFullscreenBtn'),
      toast: document.getElementById('toast')
    };
  }

  removeLegacyDemoState() {
    let changed = false;

    if (this.state.libraries.demo) {
      delete this.state.libraries.demo;
      changed = true;
    }

    if (this.state.favorites.demo) {
      delete this.state.favorites.demo;
      changed = true;
    }

    const filteredRecents = this.state.recents.filter((item) => item.accountId !== 'demo');
    if (filteredRecents.length !== this.state.recents.length) {
      this.state.recents = filteredRecents;
      changed = true;
    }

    const filteredProgress = Object.fromEntries(
      Object.entries(this.state.progress).filter(([, value]) => value.accountId !== 'demo')
    );

    if (Object.keys(filteredProgress).length !== Object.keys(this.state.progress).length) {
      this.state.progress = filteredProgress;
      changed = true;
    }

    if (this.state.activeAccountId === 'demo') {
      this.state.activeAccountId = this.state.accounts[0]?.id || '';
      changed = true;
    }

    if (changed) {
      this.persistObject(STORAGE_KEYS.favorites, this.state.favorites);
      this.persistObject(STORAGE_KEYS.recents, this.state.recents);
      this.persistObject(STORAGE_KEYS.progress, this.state.progress);
      this.persistLibraries();
      this.persistValue(STORAGE_KEYS.activeAccount, this.state.activeAccountId || '');
    }
  }

  showAuthGate() {
    this.dom.authGate?.classList.remove('hidden');
    document.body.classList.add('app-locked');
  }

  hideAuthGate() {
    this.dom.authGate?.classList.add('hidden');
    document.body.classList.remove('app-locked');
  }

  bootstrap() {
    this.renderAccounts();

    if (!this.state.accounts.length) {
      this.state.activeAccountId = '';
      this.state.currentLibrary = null;
      this.persistValue(STORAGE_KEYS.activeAccount, '');
      this.showAuthGate();
      this.render();
      this.updateStatus('info', 'Conecte sua conta Xtream Codes para entrar no Nexora.');
      return;
    }

    if (!this.state.libraries[this.state.activeAccountId]) {
      this.state.activeAccountId = this.state.accounts[0]?.id || '';
    }

    this.state.currentLibrary = this.state.activeAccountId
      ? this.state.libraries[this.state.activeAccountId] || null
      : null;

    this.persistValue(STORAGE_KEYS.activeAccount, this.state.activeAccountId || '');
    this.hideAuthGate();
    this.render();
    this.updateStatusForCurrentAccount();
  }

  bindEvents() {
    document.getElementById('openConnectBtn')?.addEventListener('click', () => this.openModal('connectModal'));
    this.dom.mobileMenuBtn?.addEventListener('click', () => this.toggleSidebar(true));
    this.dom.closeSidebarBtn?.addEventListener('click', () => this.toggleSidebar(false));
    this.dom.sidebarBackdrop?.addEventListener('click', () => this.toggleSidebar(false));
    this.dom.refreshAllAccountsBtn?.addEventListener('click', async () => {
      await this.refreshAllAccounts();
    });
    this.dom.importAccountsBtn?.addEventListener('click', () => this.dom.importAccountsInput?.click());
    this.dom.exportAccountsBtn?.addEventListener('click', () => this.exportAccounts());
    this.dom.importAccountsInput?.addEventListener('change', async (event) => {
      await this.importAccounts(event);
    });
    this.dom.clearProgressBtn?.addEventListener('click', () => this.clearPlaybackData());

    this.dom.authForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.handleConnect(this.dom.authForm);
    });

    this.dom.searchInput.addEventListener('input', (event) => {
      this.state.search = event.target.value.trim();
      this.render();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1040) {
        this.toggleSidebar(false);
      }
    });

    document.addEventListener('fullscreenchange', () => {
      this.pingPlayerControls();
      this.syncPlayerChrome();
    });

    this.dom.connectForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.handleConnect(this.dom.connectForm);
    });

    this.dom.detailsPlayBtn.addEventListener('click', async () => {
      const itemId = this.dom.detailsModal.dataset.itemId;
      if (itemId) {
        await this.handlePlayItem(itemId);
      }
    });

    this.dom.detailsFavoriteBtn.addEventListener('click', () => {
      const itemId = this.dom.detailsModal.dataset.itemId;
      if (itemId) {
        this.toggleFavorite(itemId);
      }
    });

    this.dom.videoPlayer.addEventListener('timeupdate', () => this.handlePlaybackProgress());
    this.dom.videoPlayer.addEventListener('ended', () => this.clearFinishedProgress());
    this.dom.videoPlayer.addEventListener('play', () => this.syncPlayerChrome());
    this.dom.videoPlayer.addEventListener('pause', () => this.syncPlayerChrome());
    this.dom.videoPlayer.addEventListener('loadedmetadata', () => this.syncPlayerChrome());
    this.dom.videoPlayer.addEventListener('durationchange', () => this.syncPlayerChrome());
    this.dom.videoPlayer.addEventListener('volumechange', () => this.syncPlayerChrome());
    this.dom.videoPlayer.addEventListener('click', () => this.togglePlayback());

    this.dom.playerSurface?.addEventListener('mousemove', () => this.pingPlayerControls());
    this.dom.playerSurface?.addEventListener('touchstart', () => this.pingPlayerControls(), { passive: true });
    this.dom.playerSurface?.addEventListener('mouseleave', () => this.schedulePlayerControlsHide(600));

    this.dom.playerPlayPauseBtn?.addEventListener('click', () => this.togglePlayback());
    this.dom.playerBackBtn?.addEventListener('click', () => this.seekBy(-10));
    this.dom.playerForwardBtn?.addEventListener('click', () => this.seekBy(10));
    this.dom.playerMuteBtn?.addEventListener('click', () => this.toggleMute());
    this.dom.playerVolume?.addEventListener('input', (event) => {
      this.dom.videoPlayer.volume = Number(event.target.value || 0);
      this.dom.videoPlayer.muted = this.dom.videoPlayer.volume === 0;
      this.syncPlayerChrome();
    });
    this.dom.playerSeek?.addEventListener('input', (event) => {
      if (this.state.currentPlayback?.type === 'channel') {
        this.syncPlayerChrome();
        return;
      }

      const duration = this.dom.videoPlayer.duration || 0;
      if (duration > 0) {
        this.dom.videoPlayer.currentTime = (Number(event.target.value || 0) / 100) * duration;
      }
      this.syncPlayerChrome();
    });
    this.dom.playerSpeedSelect?.addEventListener('change', (event) => {
      this.dom.videoPlayer.playbackRate = Number(event.target.value || 1);
      this.showToast(`Velocidade ajustada para ${event.target.value}x.`);
    });
    this.dom.playerPipBtn?.addEventListener('click', async () => {
      await this.togglePictureInPicture();
    });
    this.dom.playerFullscreenBtn?.addEventListener('click', async () => {
      await this.toggleFullscreen();
    });

    document.addEventListener('click', async (event) => {
      const favoriteButton = event.target.closest('[data-favorite-item]');
      if (favoriteButton) {
        this.toggleFavorite(favoriteButton.dataset.favoriteItem);
        return;
      }

      const playButton = event.target.closest('[data-play-item]');
      if (playButton) {
        await this.handlePlayItem(playButton.dataset.playItem);
        return;
      }

      const episodeButton = event.target.closest('[data-play-episode]');
      if (episodeButton) {
        await this.handleEpisodePlay(episodeButton.dataset.parentItem, episodeButton.dataset.playEpisode);
        return;
      }

      const quickAction = event.target.closest('[data-quick-action]');
      if (quickAction) {
        await this.handleQuickAction(quickAction.dataset.quickAction);
        return;
      }

      const card = event.target.closest('[data-open-item]');
      if (card) {
        await this.openDetails(card.dataset.openItem);
        return;
      }

      const nav = event.target.closest('[data-view]');
      if (nav) {
        this.state.view = nav.dataset.view;
        this.render();
        this.scrollContentTop();
        return;
      }

      const switchButton = event.target.closest('[data-switch-account]');
      if (switchButton) {
        this.switchAccount(switchButton.dataset.switchAccount);
        return;
      }

      const refreshButton = event.target.closest('[data-refresh-account]');
      if (refreshButton) {
        await this.refreshAccount(refreshButton.dataset.refreshAccount);
        return;
      }

      const removeButton = event.target.closest('[data-remove-account]');
      if (removeButton) {
        this.removeAccount(removeButton.dataset.removeAccount);
        return;
      }

      const closeButton = event.target.closest('[data-close-modal]');
      if (closeButton) {
        if (closeButton.dataset.closeModal === 'playerModal') {
          this.closePlayer();
        } else {
          this.closeModal(closeButton.dataset.closeModal);
        }
      }
    });

    document.addEventListener('keydown', (event) => {
      const activeTag = document.activeElement?.tagName;
      const typing = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable;

      if (event.key === 'Escape') {
        this.closeModal('connectModal');
        this.closeModal('detailsModal');
        this.closePlayer();
        return;
      }

      if (typing || this.dom.playerModal.classList.contains('hidden')) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        this.togglePlayback();
      } else if (event.key === 'ArrowLeft') {
        this.seekBy(-10);
      } else if (event.key === 'ArrowRight') {
        this.seekBy(10);
      } else if (event.key.toLowerCase() === 'm') {
        this.toggleMute();
      } else if (event.key.toLowerCase() === 'f') {
        this.toggleFullscreen();
      }
    });
  }

  persistValue(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  persistObject(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  persistLibraries() {
    const ok = this.persistObject(STORAGE_KEYS.libraries, this.state.libraries);

    if (!ok) {
      const compact = Object.fromEntries(
        Object.entries(this.state.libraries).map(([id, library]) => [
          id,
          {
            ...library,
            movies: safeArray(library.movies).slice(0, 120),
            series: safeArray(library.series).slice(0, 120),
            channels: safeArray(library.channels).slice(0, 120),
            compactCache: true
          }
        ])
      );

      this.persistObject(STORAGE_KEYS.libraries, compact);
    }
  }

  updateStatus(type, text) {
    this.dom.statusPill.className = `status-pill ${type}`;
    this.dom.statusPill.textContent = {
      ready: 'Pronto',
      success: 'Conectado',
      syncing: 'Sincronizando',
      info: 'Aviso',
      error: 'Erro'
    }[type] || 'Status';
    this.dom.statusText.textContent = text;
  }

  updateStatusForCurrentAccount() {
    const library = this.state.currentLibrary;

    if (!library || !this.state.activeAccountId) {
      this.updateStatus('info', 'Conecte sua conta Xtream Codes para carregar o catálogo real.');
      return;
    }

    const syncedAt = new Date(library.fetchedAt || Date.now()).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const extra = library.compactCache ? ' Cache local pronto.' : '';
    this.updateStatus('success', `${library.accountName} pronto para assistir · atualizado em ${syncedAt}.${extra}`);
  }

  openModal(id) {
    document.getElementById(id)?.classList.remove('hidden');
  }

  closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
  }

  showToast(message) {
    this.dom.toast.textContent = message;
    this.dom.toast.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.dom.toast.classList.add('hidden'), 3200);
  }

  getAccountById(accountId) {
    return this.state.accounts.find((account) => account.id === accountId) || null;
  }

  switchAccount(accountId) {
    const fallbackId = this.state.accounts[0]?.id || '';
    const nextAccountId = this.state.libraries[accountId] ? accountId : fallbackId;
    const nextLibrary = nextAccountId ? this.state.libraries[nextAccountId] || null : null;

    this.state.activeAccountId = nextAccountId;
    this.state.currentLibrary = nextLibrary;
    this.state.search = '';

    if (this.dom.searchInput) {
      this.dom.searchInput.value = '';
    }

    this.persistValue(STORAGE_KEYS.activeAccount, this.state.activeAccountId || '');
    this.renderAccounts();
    this.render();
    this.updateStatusForCurrentAccount();
    this.scrollContentTop();

    if (nextLibrary) {
      this.hideAuthGate();
    } else {
      this.showAuthGate();
    }

    this.toggleSidebar(false);
  }

  async handleConnect(formElement = this.dom.connectForm) {
    const formData = new FormData(formElement);
    const accountInput = {
      name: String(formData.get('name') || '').trim(),
      server: normalizeServer(formData.get('server')),
      username: String(formData.get('username') || '').trim(),
      password: String(formData.get('password') || '').trim(),
      proxy: String(formData.get('proxy') || '').trim()
    };

    if (!accountInput.server || !accountInput.username || !accountInput.password) {
      this.updateStatus('error', 'Preencha servidor, usuário e senha para continuar.');
      return;
    }

    const submitButton = formElement.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }

    this.updateStatus('syncing', 'Consultando a API Xtream Codes e montando o catálogo...');

    try {
      const { account, library } = await this.connectXtreamAccount(accountInput);
      const existingIndex = this.state.accounts.findIndex((item) => item.id === account.id);

      if (existingIndex >= 0) {
        this.state.accounts[existingIndex] = account;
      } else {
        this.state.accounts.unshift(account);
      }

      this.state.libraries[account.id] = library;
      this.state.currentLibrary = library;
      this.state.activeAccountId = account.id;

      this.persistObject(STORAGE_KEYS.accounts, this.state.accounts);
      this.persistValue(STORAGE_KEYS.activeAccount, account.id);
      this.persistLibraries();

      this.hideAuthGate();
      this.renderAccounts();
      this.render();
      this.updateStatusForCurrentAccount();
      this.closeModal('connectModal');
      this.dom.connectForm.reset();
      this.dom.authForm?.reset();
      this.showToast('Conta sincronizada com sucesso.');
    } catch (error) {
      this.updateStatus('error', error.message || 'Não foi possível sincronizar a conta.');
      this.showToast('Falha ao conectar a conta Xtream Codes.');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  }

  async refreshAccount(accountId) {
    const account = this.getAccountById(accountId);

    if (!account) {
      this.updateStatus('info', 'Cadastre uma conta Xtream Codes para atualizar o catálogo.');
      return;
    }

    this.updateStatus('syncing', `Atualizando o catálogo de ${account.name}...`);

    try {
      const { library } = await this.connectXtreamAccount(account, account.id);
      this.state.libraries[account.id] = library;
      account.lastSyncedAt = Date.now();
      this.persistObject(STORAGE_KEYS.accounts, this.state.accounts);
      this.persistLibraries();

      if (this.state.activeAccountId === account.id) {
        this.state.currentLibrary = library;
        this.render();
        this.updateStatusForCurrentAccount();
      }

      this.renderAccounts();
      this.showToast('Catálogo atualizado.');
    } catch (error) {
      this.updateStatus('error', error.message || 'Não foi possível atualizar esta conta.');
    }
  }

  async refreshAllAccounts() {
    const accounts = safeArray(this.state.accounts);

    if (!accounts.length) {
      this.showToast('Nenhuma conta real salva para atualizar.');
      return;
    }

    const failures = [];
    this.updateStatus('syncing', `Atualizando ${accounts.length} conta(s) salvas...`);

    for (const [index, account] of accounts.entries()) {
      try {
        const { library } = await this.connectXtreamAccount(account, account.id);
        this.state.libraries[account.id] = library;
        account.lastSyncedAt = Date.now();
        this.updateStatus('syncing', `Conta ${index + 1}/${accounts.length} atualizada: ${account.name}`);
      } catch (error) {
        failures.push(`${account.name}: ${error.message || 'falha ao atualizar'}`);
      }
    }

    this.persistObject(STORAGE_KEYS.accounts, this.state.accounts);
    this.persistLibraries();
    this.state.currentLibrary = this.state.libraries[this.state.activeAccountId] || this.state.libraries[this.state.accounts[0]?.id] || null;
    this.renderAccounts();
    this.render();

    if (failures.length) {
      this.updateStatus('info', `Atualização concluída com ${failures.length} aviso(s).`);
      this.showToast(`Algumas contas falharam na atualização (${failures.length}).`);
      return;
    }

    this.updateStatusForCurrentAccount();
    this.showToast('Todas as contas foram atualizadas.');
  }

  removeAccount(accountId) {
    if (!accountId) {
      return;
    }

    const account = this.getAccountById(accountId);
    const confirmed = window.confirm(`Remover a conta ${account?.name || accountId} do Nexora?`);

    if (!confirmed) {
      return;
    }

    this.state.accounts = this.state.accounts.filter((item) => item.id !== accountId);
    delete this.state.libraries[accountId];
    delete this.state.favorites[accountId];

    this.state.recents = this.state.recents.filter((item) => item.accountId !== accountId);
    this.state.progress = Object.fromEntries(
      Object.entries(this.state.progress).filter(([, value]) => value.accountId !== accountId)
    );

    if (this.state.activeAccountId === accountId) {
      this.state.activeAccountId = this.state.accounts[0]?.id || '';
    }

    this.state.currentLibrary = this.state.activeAccountId
      ? this.state.libraries[this.state.activeAccountId] || null
      : null;

    this.persistObject(STORAGE_KEYS.accounts, this.state.accounts);
    this.persistObject(STORAGE_KEYS.favorites, this.state.favorites);
    this.persistObject(STORAGE_KEYS.recents, this.state.recents);
    this.persistObject(STORAGE_KEYS.progress, this.state.progress);
    this.persistValue(STORAGE_KEYS.activeAccount, this.state.activeAccountId || '');
    this.persistLibraries();

    this.renderAccounts();
    this.render();

    if (this.state.currentLibrary) {
      this.hideAuthGate();
      this.updateStatusForCurrentAccount();
    } else {
      this.showAuthGate();
      this.updateStatus('info', 'Cadastre uma nova conta Xtream Codes para continuar.');
    }

    this.showToast('Conta removida do navegador.');
  }

  exportAccounts() {
    if (!this.state.accounts.length) {
      this.showToast('Nenhuma conta disponível para exportar.');
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'Nexora',
      accounts: this.state.accounts,
      libraries: this.state.libraries,
      favorites: this.state.favorites,
      progress: this.state.progress,
      recents: this.state.recents
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexora-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('Backup exportado com sucesso.');
  }

  async importAccounts(event) {
    const file = event.target?.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const importedAccounts = safeArray(data.accounts);

      if (!importedAccounts.length) {
        throw new Error('O arquivo não contém contas válidas.');
      }

      const mergedAccounts = [...this.state.accounts];
      importedAccounts.forEach((account) => {
        const existingIndex = mergedAccounts.findIndex((entry) => entry.id === account.id);
        if (existingIndex >= 0) {
          mergedAccounts[existingIndex] = { ...mergedAccounts[existingIndex], ...account };
        } else {
          mergedAccounts.push(account);
        }
      });

      this.state.accounts = mergedAccounts;
      this.state.libraries = { ...this.state.libraries, ...safeParse(JSON.stringify(data.libraries || {}), {}) };
      this.state.favorites = { ...this.state.favorites, ...safeParse(JSON.stringify(data.favorites || {}), {}) };
      this.state.progress = { ...this.state.progress, ...safeParse(JSON.stringify(data.progress || {}), {}) };
      this.state.recents = [...safeArray(data.recents), ...this.state.recents]
        .filter((item, index, arr) => index === arr.findIndex((entry) => entry.id === item.id))
        .slice(0, 40);

      if (!this.state.activeAccountId) {
        this.state.activeAccountId = this.state.accounts[0]?.id || '';
      }

      this.state.currentLibrary = this.state.libraries[this.state.activeAccountId] || null;
      this.persistObject(STORAGE_KEYS.accounts, this.state.accounts);
      this.persistObject(STORAGE_KEYS.favorites, this.state.favorites);
      this.persistObject(STORAGE_KEYS.progress, this.state.progress);
      this.persistObject(STORAGE_KEYS.recents, this.state.recents);
      this.persistLibraries();
      this.persistValue(STORAGE_KEYS.activeAccount, this.state.activeAccountId || '');
      this.hideAuthGate();
      this.renderAccounts();
      this.render();
      this.updateStatusForCurrentAccount();
      this.showToast('Contas importadas com sucesso.');
    } catch (error) {
      this.showToast(error.message || 'Falha ao importar o arquivo.');
    } finally {
      event.target.value = '';
    }
  }

  clearPlaybackData() {
    if (!this.state.activeAccountId) {
      this.showToast('Nenhuma conta ativa para limpar.');
      return;
    }

    const confirmed = window.confirm('Limpar progresso, recentes e favoritos da conta ativa?');
    if (!confirmed) {
      return;
    }

    delete this.state.favorites[this.state.activeAccountId];
    this.state.recents = this.state.recents.filter((item) => item.accountId !== this.state.activeAccountId);
    this.state.progress = Object.fromEntries(
      Object.entries(this.state.progress).filter(([, value]) => value.accountId !== this.state.activeAccountId)
    );

    this.persistObject(STORAGE_KEYS.favorites, this.state.favorites);
    this.persistObject(STORAGE_KEYS.recents, this.state.recents);
    this.persistObject(STORAGE_KEYS.progress, this.state.progress);
    this.render();
    this.showToast('Dados locais da conta ativa foram limpos.');
  }

  applyProxy(url, proxy) {
    return applyProxyFn(url, proxy);
  }

  buildApiUrl(account, action = '') {
    return buildApiUrlFn(account, action);
  }

  async fetchJson(url, proxy = '') {
    return fetchJsonFn(url, proxy);
  }

  buildMovieUrl(account, item) {
    return buildMovieUrlFn(account, item);
  }

  buildLiveUrl(account, item, extension = 'm3u8') {
    return buildLiveUrlFn(account, item, extension);
  }

  buildEpisodeUrl(account, episode) {
    return buildEpisodeUrlFn(account, episode);
  }

  mapMovieItem(accountId, account, item, categoryMap) {
    const streamId = String(item.stream_id || item.id || item.num || '0');
    const extension = item.container_extension || 'mp4';

    return {
      id: `${accountId}:movie:${streamId}`,
      accountId,
      type: 'movie',
      title: item.name || `Filme ${streamId}`,
      year: item.year || item.releasedate?.slice(0, 4) || '',
      rating: item.rating || item.rating_5based || '',
      added: Number(item.added || 0),
      categoryId: String(item.category_id || 'uncategorized'),
      categoryName: categoryMap[String(item.category_id || 'uncategorized')] || 'Filmes',
      plot: item.plot || item.overview || 'Sem descrição disponível para este filme.',
      poster: item.stream_icon || item.cover || makePoster(item.name || 'Filme', '#3d3d3d'),
      backdrop: item.stream_icon || item.cover || makePoster(item.name || 'Filme', '#444444'),
      streamId,
      extension,
      url: `${normalizeServer(account.server)}/movie/${encodeURIComponent(account.username)}/${encodeURIComponent(account.password)}/${streamId}.${extension}`,
      progressLabel: 'Filme'
    };
  }

  mapSeriesItem(accountId, item, categoryMap) {
    const seriesId = String(item.series_id || item.id || item.num || '0');

    return {
      id: `${accountId}:series:${seriesId}`,
      accountId,
      type: 'series',
      title: item.name || `Série ${seriesId}`,
      year: item.year || item.releaseDate?.slice(0, 4) || '',
      rating: item.rating || '',
      added: Number(item.last_modified || item.added || 0),
      categoryId: String(item.category_id || 'uncategorized'),
      categoryName: categoryMap[String(item.category_id || 'uncategorized')] || 'Séries',
      plot: item.plot || item.overview || 'Sem descrição disponível para esta série.',
      poster: item.cover || item.stream_icon || makePoster(item.name || 'Série', '#2f2f2f'),
      backdrop: item.cover || item.stream_icon || makePoster(item.name || 'Série', '#373737'),
      seriesId,
      progressLabel: 'Série',
      episodes: safeArray(item.episodes)
    };
  }

  mapChannelItem(accountId, account, item, categoryMap) {
    const streamId = String(item.stream_id || item.id || item.num || '0');

    return {
      id: `${accountId}:channel:${streamId}`,
      accountId,
      type: 'channel',
      title: item.name || `Canal ${streamId}`,
      added: Number(item.added || 0),
      categoryId: String(item.category_id || 'uncategorized'),
      categoryName: categoryMap[String(item.category_id || 'uncategorized')] || 'Canais',
      plot: item.epg_channel_id ? `EPG: ${item.epg_channel_id}` : 'Canal ao vivo disponível nesta conta.',
      poster: item.stream_icon || makePoster(item.name || 'Canal', '#1d1d1d'),
      backdrop: item.stream_icon || makePoster(item.name || 'Canal', '#2a2a2a'),
      streamId,
      url: `${normalizeServer(account.server)}/live/${encodeURIComponent(account.username)}/${encodeURIComponent(account.password)}/${streamId}.m3u8`,
      fallbackUrl: `${normalizeServer(account.server)}/live/${encodeURIComponent(account.username)}/${encodeURIComponent(account.password)}/${streamId}.ts`,
      progressLabel: 'Ao vivo'
    };
  }

  async connectXtreamAccount(inputAccount, forcedId = null) {
    const baseAccount = {
      ...inputAccount,
      id: forcedId || makeAccountId(inputAccount.server, inputAccount.username)
    };

    // Forçar HTTPS em todos os endereços de servidor ao conectar
    baseAccount.server = normalizeServer(baseAccount.server);

    const [profile, liveCategories, vodCategories, seriesCategories, liveStreams, vodStreams, seriesList] = await Promise.all([
      this.fetchJson(this.buildApiUrl(baseAccount), baseAccount.proxy),
      this.fetchJson(this.buildApiUrl(baseAccount, 'get_live_categories'), baseAccount.proxy),
      this.fetchJson(this.buildApiUrl(baseAccount, 'get_vod_categories'), baseAccount.proxy),
      this.fetchJson(this.buildApiUrl(baseAccount, 'get_series_categories'), baseAccount.proxy),
      this.fetchJson(this.buildApiUrl(baseAccount, 'get_live_streams'), baseAccount.proxy),
      this.fetchJson(this.buildApiUrl(baseAccount, 'get_vod_streams'), baseAccount.proxy),
      this.fetchJson(this.buildApiUrl(baseAccount, 'get_series'), baseAccount.proxy)
    ]);

    if (profile?.user_info && String(profile.user_info.auth) === '0') {
      throw new Error('Usuário ou senha rejeitados pela API Xtream Codes.');
    }

    const account = {
      id: baseAccount.id,
      name: baseAccount.name || profile?.user_info?.username || baseAccount.username,
      username: baseAccount.username,
      password: baseAccount.password,
      server: normalizeServer(baseAccount.server),
      proxy: baseAccount.proxy,
      status: profile?.user_info?.status || 'Active',
      expDate: Number(profile?.user_info?.exp_date || 0),
      createdAt: Number(profile?.user_info?.created_at || 0),
      activeConnections: Number(profile?.user_info?.active_cons || 0),
      maxConnections: Number(profile?.user_info?.max_connections || 0),
      timezone: profile?.server_info?.timezone || '',
      serverMessage: profile?.server_info?.url || baseAccount.server,
      lastSyncedAt: Date.now()
    };

    const liveCategoryMap = Object.fromEntries(safeArray(liveCategories).map((item) => [String(item.category_id), item.category_name || 'Canais'])) ;
    const vodCategoryMap = Object.fromEntries(safeArray(vodCategories).map((item) => [String(item.category_id), item.category_name || 'Filmes'])) ;
    const seriesCategoryMap = Object.fromEntries(safeArray(seriesCategories).map((item) => [String(item.category_id), item.category_name || 'Séries'])) ;

    const movies = sortByAdded(safeArray(vodStreams).map((item) => this.mapMovieItem(account.id, account, item, vodCategoryMap)));
    const series = sortByAdded(safeArray(seriesList).map((item) => this.mapSeriesItem(account.id, item, seriesCategoryMap)));
    const channels = sortByAdded(safeArray(liveStreams).map((item) => this.mapChannelItem(account.id, account, item, liveCategoryMap)));

    const featuredItemId = movies[0]?.id || series[0]?.id || channels[0]?.id || null;

    const library = {
      accountId: account.id,
      accountName: account.name,
      source: account.server,
      fetchedAt: Date.now(),
      featuredItemId,
      movieCategories: safeArray(vodCategories),
      seriesCategories: safeArray(seriesCategories),
      channelCategories: safeArray(liveCategories),
      movies,
      series,
      channels
    };

    return { account, library };
  }

  getAllItems(library = this.state.currentLibrary) {
    if (!library) {
      return [];
    }

    return [...safeArray(library.movies), ...safeArray(library.series), ...safeArray(library.channels)];
  }

  findItemById(itemId) {
    const currentItems = this.getAllItems();
    const current = currentItems.find((item) => item.id === itemId);

    if (current) {
      return current;
    }

    const recent = this.state.recents.find((item) => item.id === itemId);
    if (recent) {
      return recent;
    }

    return this.state.progress[itemId] || null;
  }

  applySearch(items = []) {
    const term = this.state.search.trim().toLowerCase();

    if (!term) {
      return items;
    }

    return items.filter((item) => {
      const haystack = `${item.title} ${item.categoryName || ''} ${item.plot || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }

  getFavoriteItems() {
    const favorites = new Set(this.state.favorites[this.state.activeAccountId] || []);
    return this.getAllItems().filter((item) => favorites.has(item.id));
  }

  getRecentItems() {
    return this.state.recents
      .filter((item) => item.accountId === this.state.activeAccountId)
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  }

  getContinueWatchingItems() {
    return Object.values(this.state.progress)
      .filter((item) => item.accountId === this.state.activeAccountId && Number(item.currentTime || 0) > 5)
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  }

  getViewLabel() {
    return {
      home: 'Início',
      movies: 'Filmes',
      series: 'Séries',
      channels: 'Canais ao vivo',
      favorites: 'Favoritos',
      recents: 'Recentes'
    }[this.state.view] || 'Início';
  }

  toggleSidebar(force) {
    const shell = this.dom.pageShell;

    if (!shell) {
      return;
    }

    const nextState = typeof force === 'boolean' ? force : !shell.classList.contains('sidebar-open');
    shell.classList.toggle('sidebar-open', nextState);
  }

  scrollContentTop() {
    this.dom.contentShell?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  getResumeCandidate() {
    return this.getContinueWatchingItems()[0] || this.getRecentItems()[0] || null;
  }

  async handleQuickAction(action) {
    if (!this.state.currentLibrary) {
      this.showToast('Conecte uma conta para usar os atalhos rápidos.');
      return;
    }

    if (action === 'resume') {
      const item = this.getResumeCandidate();

      if (!item) {
        this.showToast('Nada em andamento para retomar agora.');
        return;
      }

      this.playItem(item);
      return;
    }

    if (action === 'live') {
      const liveItem = safeArray(this.state.currentLibrary.channels)[0];

      if (!liveItem) {
        this.showToast('Nenhum canal ao vivo disponível nesta conta.');
        return;
      }

      this.state.view = 'channels';
      this.state.search = '';

      if (this.dom.searchInput) {
        this.dom.searchInput.value = '';
      }

      this.render();
      this.scrollContentTop();
      this.playItem(liveItem);
    }
  }

  renderDashboardStrip() {
    const library = this.state.currentLibrary;
    const activeAccount = this.getAccountById(this.state.activeAccountId);
    const moviesCount = safeArray(library?.movies).length;
    const seriesCount = safeArray(library?.series).length;
    const channelsCount = safeArray(library?.channels).length;
    const favoritesCount = (this.state.favorites[this.state.activeAccountId] || []).length;
    const continueCount = this.getContinueWatchingItems().length;
    const recentsCount = this.getRecentItems().length;
    const resumeItem = this.getResumeCandidate();
    const liveItem = safeArray(library?.channels)[0] || null;
    const totalAccounts = this.state.accounts.length;
    const accountName = library?.accountName || 'Nenhuma conta conectada';
    const syncText = library?.fetchedAt
      ? new Date(library.fetchedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : 'aguardando login';
    const statusLabel = activeAccount?.status || 'offline';
    const expLabel = activeAccount?.expDate ? formatUnixDate(activeAccount.expDate) : 'não informado';

    if (this.dom.viewHeadline) {
      this.dom.viewHeadline.textContent = this.getViewLabel();
    }

    if (this.dom.activeAccountLabel) {
      this.dom.activeAccountLabel.textContent = activeAccount ? `Conta ativa · ${accountName}` : 'Nenhuma conta conectada';
    }

    if (this.dom.accountsCounter) {
      this.dom.accountsCounter.textContent = `${totalAccounts} ${totalAccounts === 1 ? 'perfil' : 'perfis'}`;
    }

    if (this.dom.refreshAllAccountsBtn) {
      this.dom.refreshAllAccountsBtn.disabled = totalAccounts === 0;
    }

    if (this.dom.profilePill) {
      this.dom.profilePill.textContent = '';
    }

    if (this.dom.sidebarOverviewCard) {
      this.dom.sidebarOverviewCard.innerHTML = activeAccount ? `
        <div class="sidebar-overview-head">
          <div>
            <p class="eyebrow">Biblioteca pronta</p>
            <h3 class="sidebar-account-name">${escapeHtml(accountName)}</h3>
            <p class="sidebar-muted-line">Atualizado em ${escapeHtml(syncText)}</p>
          </div>
          <span class="badge">${escapeHtml(statusLabel)}</span>
        </div>
        <div class="sidebar-chip-row">
          <span class="badge">${moviesCount} filmes</span>
          <span class="badge">${seriesCount} séries</span>
          <span class="badge">${channelsCount} canais</span>
        </div>
      ` : '<div class="empty-state sidebar-empty">Conecte uma conta para liberar o catálogo.</div>';
    }

    if (this.dom.accountSummaryCard) {
      this.dom.accountSummaryCard.innerHTML = activeAccount ? `
        <div class="account-summary-grid">
          <div><span>Status</span><strong>${escapeHtml(statusLabel)}</strong></div>
          <div><span>Expira em</span><strong>${escapeHtml(expLabel)}</strong></div>
          <div><span>Conexões</span><strong>${escapeHtml(String(activeAccount.activeConnections || 0))}/${escapeHtml(String(activeAccount.maxConnections || 0))}</strong></div>
          <div><span>Timezone</span><strong>${escapeHtml(activeAccount.timezone || 'padrão')}</strong></div>
        </div>
        <div class="account-summary-actions">
          <button class="ghost-btn summary-action-btn" data-quick-action="resume" ${resumeItem ? '' : 'disabled'}>Retomar</button>
          <button class="ghost-btn summary-action-btn" data-quick-action="live" ${liveItem ? '' : 'disabled'}>Ao vivo</button>
        </div>
      ` : '<div class="empty-state sidebar-empty">Conecte uma conta para ver expiração, conexões e status.</div>';
    }

    if (this.dom.quickStatsGrid) {
      const cards = [
        {
          label: 'Perfis',
          value: totalAccounts,
          hint: totalAccounts === 1 ? 'conectado' : 'conectados'
        },
        {
          label: 'Favoritos',
          value: favoritesCount,
          hint: favoritesCount ? 'na conta ativa' : 'vazio'
        },
        {
          label: 'Continuar',
          value: continueCount,
          hint: continueCount ? 'em andamento' : 'nada agora'
        },
        {
          label: 'Recentes',
          value: recentsCount,
          hint: recentsCount ? 'abertos há pouco' : 'sem histórico'
        }
      ];

      this.dom.quickStatsGrid.innerHTML = cards.map((card) => `
        <article class="quick-stat-card glass-card">
          <span>${escapeHtml(card.label)}</span>
          <strong class="stat-value">${escapeHtml(String(card.value))}</strong>
          <small>${escapeHtml(card.hint)}</small>
        </article>
      `).join('');
    }
  }

  pickFeaturedItem() {
    const library = this.state.currentLibrary;
    if (!library) {
      return null;
    }

    const continueItems = this.getContinueWatchingItems();
    if (continueItems.length > 0) {
      return continueItems[0];
    }

    const favoriteItems = this.getFavoriteItems();
    if (favoriteItems.length > 0) {
      return favoriteItems[0];
    }

    const itemFromLibrary = this.findItemById(library.featuredItemId);
    return itemFromLibrary || this.getAllItems(library)[0] || null;
  }

  renderHero() {
    const item = this.pickFeaturedItem();
    const library = this.state.currentLibrary;

    if (!item || !library) {
      this.dom.heroSection.innerHTML = '<div class="hero-content"><h2 class="hero-title">Conecte sua conta Xtream Codes</h2><p class="hero-description">Adicione uma conta para carregar filmes, séries e canais.</p><div class="hero-actions" style="margin-top: 16px;"><button class="primary-btn" id="heroConnectBtn">Adicionar conta</button></div></div>';
      document.getElementById('heroConnectBtn')?.addEventListener('click', () => this.openModal('connectModal'));
      return;
    }

    const rating = item.rating ? `⭐ ${escapeHtml(item.rating)}` : escapeHtml(item.progressLabel || 'Streaming');
    const year = item.year ? `· ${escapeHtml(item.year)}` : '';
    this.dom.heroSection.style.setProperty('--hero-image', `url("${item.backdrop || item.poster || makePoster(item.title)}")`);
    this.dom.heroSection.innerHTML = `
      <div class="hero-layout simple-hero-layout">
        <div class="hero-content">
          <h2 class="hero-title">${escapeHtml(item.title)}</h2>
          <p class="hero-description">${escapeHtml(item.plot || 'Sem descrição disponível.')}</p>
          <div class="badges">
            <span class="badge">${rating}${year}</span>
            ${item.categoryName ? `<span class="badge">${escapeHtml(item.categoryName)}</span>` : ''}
          </div>
          <div class="hero-actions" style="margin-top: 16px;">
            <button class="primary-btn" data-play-item="${escapeHtml(item.id)}">Assistir</button>
            <button class="ghost-btn" data-open-item="${escapeHtml(item.id)}">Detalhes</button>
          </div>
        </div>
      </div>
    `;
  }

  createMediaCard(item) {
    const isFavorite = (this.state.favorites[this.state.activeAccountId] || []).includes(item.id);
    const progress = this.state.progress[item.id];
    const progressPercent = progress?.duration ? Math.max(3, Math.min(100, (progress.currentTime / progress.duration) * 100)) : 0;
    const label = item.type === 'channel' ? 'AO VIVO' : item.type === 'series' ? 'SÉRIE' : 'FILME';

    return `
      <article class="media-card" data-open-item="${escapeHtml(item.id)}">
        <div class="media-thumb">
          <img loading="lazy" src="${item.poster || makePoster(item.title)}" alt="${escapeHtml(item.title)}" />
          <div class="media-scrim"></div>
          <div class="card-topbar">
            <span class="${item.type === 'channel' ? 'live-pill' : 'badge'}">${label}</span>
            <button class="ghost-btn text-chip" data-favorite-item="${escapeHtml(item.id)}" aria-label="Favoritar">
              ${isFavorite ? 'Salvo' : 'Salvar'}
            </button>
          </div>
          <div class="card-bottombar">
            <button class="play-chip" data-play-item="${escapeHtml(item.id)}" aria-label="Assistir ${escapeHtml(item.title)}">Abrir</button>
          </div>
        </div>
        <div class="media-meta">
          <h3 class="media-title">${escapeHtml(item.title)}</h3>
          <p class="media-subtitle">${escapeHtml(item.categoryName || item.progressLabel || 'Catálogo')}</p>
          ${progressPercent ? `<div class="progress-track"><span style="width:${progressPercent}%"></span></div>` : ''}
        </div>
      </article>
    `;
  }

  createRow(title, items, options = {}) {
    if (!items.length) {
      return '';
    }

    const modeClass = options.grid ? 'grid-mode' : '';

    return `
      <section class="row-section">
        <div class="row-header">
          <div>
            <p class="eyebrow">${escapeHtml(options.kicker || 'Catálogo')}</p>
            <h2>${escapeHtml(title)}</h2>
          </div>
        </div>
        <div class="media-row ${modeClass}">
          ${items.map((item) => this.createMediaCard(item)).join('')}
        </div>
      </section>
    `;
  }

  renderContinueSection() {
    const items = this.getContinueWatchingItems();

    if (!items.length) {
      this.dom.continueSection.classList.add('hidden');
      this.dom.continueRow.innerHTML = '';
      return;
    }

    this.dom.continueSection.classList.remove('hidden');
    this.dom.continueRow.innerHTML = items.slice(0, 12).map((item) => this.createMediaCard(item)).join('');
  }

  buildRowsForCurrentView() {
    const library = this.state.currentLibrary;
    if (!library) {
      return [];
    }

    const movies = this.applySearch(safeArray(library.movies));
    const series = this.applySearch(safeArray(library.series));
    const channels = this.applySearch(safeArray(library.channels));
    const favorites = this.applySearch(this.getFavoriteItems());
    const recents = this.applySearch(this.getRecentItems());

    if (this.state.view === 'movies') {
      return [
        this.createRow('Todos os filmes', movies, { kicker: 'Filmes', grid: true })
      ];
    }

    if (this.state.view === 'series') {
      return [
        this.createRow('Todas as séries', series, { kicker: 'Séries', grid: true })
      ];
    }

    if (this.state.view === 'channels') {
      return [
        this.createRow('Canais ao vivo', channels, { kicker: 'Ao vivo', grid: true })
      ];
    }

    if (this.state.view === 'favorites') {
      return [
        this.createRow('Seus favoritos', favorites, { kicker: 'Favoritos', grid: true })
      ];
    }

    if (this.state.view === 'recents') {
      return [
        this.createRow('Abertos recentemente', recents, { kicker: 'Recentes', grid: true })
      ];
    }

    return [
      this.createRow('Filmes em destaque', movies.slice(0, 18), { kicker: 'Curadoria' }),
      this.createRow('Séries para maratonar', series.slice(0, 18), { kicker: 'Séries' }),
      this.createRow('Canais ao vivo', channels.slice(0, 18), { kicker: 'Live' }),
      this.createRow('Favoritos rápidos', favorites.slice(0, 12), { kicker: 'Sua lista' }),
      this.createRow('Acessos recentes', recents.slice(0, 12), { kicker: 'Histórico' })
    ];
  }

  renderAccounts() {
    const accountsHtml = this.state.accounts.map((account) => {
      const library = this.state.libraries[account.id];
      const totalItems = library
        ? safeArray(library.movies).length + safeArray(library.series).length + safeArray(library.channels).length
        : 0;
      const expLabel = account.expDate ? formatUnixDate(account.expDate) : 'sem data';
      const statusLabel = account.status || 'offline';
      const syncLabel = library?.fetchedAt
        ? new Date(library.fetchedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : 'sem sync';

      return `
        <div class="account-item ${this.state.activeAccountId === account.id ? 'active' : ''}">
          <button class="account-main" data-switch-account="${escapeHtml(account.id)}">
            <strong>${escapeHtml(account.name)}</strong>
            <span>${escapeHtml(account.server)}</span>
            <div class="account-meta-line">
              <small>${escapeHtml(String(totalItems))} itens</small>
              <small>${escapeHtml(syncLabel)}</small>
            </div>
            <div class="account-badges">
              <span class="badge">${escapeHtml(statusLabel)}</span>
              <span class="badge">exp ${escapeHtml(expLabel)}</span>
            </div>
          </button>
          <div class="account-actions">
            <button class="ghost-btn text-action-btn" data-refresh-account="${escapeHtml(account.id)}" title="Atualizar">Atualizar</button>
            <button class="ghost-btn text-action-btn" data-remove-account="${escapeHtml(account.id)}" title="Remover">Remover</button>
          </div>
        </div>
      `;
    }).join('');

    this.dom.accountsList.innerHTML = accountsHtml || '<div class="empty-state sidebar-empty">Nenhuma conta conectada ainda.</div>';
  }

  renderNavState() {
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.classList.toggle('active', button.dataset.view === this.state.view);
    });
  }

  render() {
    this.renderNavState();
    this.renderDashboardStrip();
    this.renderHero();
    this.renderContinueSection();

    const rows = this.buildRowsForCurrentView().filter(Boolean);
    this.dom.rowsContainer.innerHTML = rows.length
      ? rows.join('')
      : '<div class="empty-state">Nenhum item encontrado para este filtro. Tente outra busca ou troque de conta.</div>';
  }

  createSnapshot(item) {
    return {
      ...item,
      accountId: item.accountId || this.state.activeAccountId,
      updatedAt: Date.now()
    };
  }

  toggleFavorite(itemId) {
    const item = this.findItemById(itemId);
    if (!item) {
      return;
    }

    const accountKey = item.accountId || this.state.activeAccountId;
    const current = new Set(this.state.favorites[accountKey] || []);

    if (current.has(item.id)) {
      current.delete(item.id);
      this.showToast('Removido dos favoritos.');
    } else {
      current.add(item.id);
      this.showToast('Adicionado aos favoritos.');
    }

    this.state.favorites[accountKey] = [...current];
    this.persistObject(STORAGE_KEYS.favorites, this.state.favorites);
    this.render();

    if (this.dom.detailsModal.dataset.itemId === item.id) {
      this.updateDetailsFavoriteState(item.id);
    }
  }

  updateDetailsFavoriteState(itemId) {
    const favorites = this.state.favorites[this.state.activeAccountId] || [];
    const isFavorite = favorites.includes(itemId);
    this.dom.detailsFavoriteBtn.textContent = isFavorite ? 'Remover favorito' : 'Favoritar';
  }

  async openDetails(itemId) {
    const item = this.findItemById(itemId);
    if (!item) {
      return;
    }

    this.dom.detailsModal.dataset.itemId = item.id;
    this.dom.detailsPoster.src = item.poster || makePoster(item.title);
    this.dom.detailsType.textContent = item.progressLabel || item.type;
    this.dom.detailsTitle.textContent = item.title;
    this.dom.detailsMeta.textContent = [item.categoryName, item.year, item.rating ? `⭐ ${item.rating}` : ''].filter(Boolean).join(' · ');
    this.dom.detailsDescription.textContent = item.plot || 'Sem descrição disponível para este conteúdo.';
    this.dom.detailsBadges.innerHTML = [
      `<span class="badge">${escapeHtml(item.progressLabel || item.type)}</span>`,
      item.categoryName ? `<span class="badge">${escapeHtml(item.categoryName)}</span>` : '',
      item.year ? `<span class="badge">${escapeHtml(item.year)}</span>` : ''
    ].join('');

    this.updateDetailsFavoriteState(item.id);
    this.openModal('detailsModal');

    if (item.type === 'series') {
      this.dom.detailsEpisodesWrap.classList.remove('hidden');
      this.dom.detailsEpisodes.innerHTML = '<div class="empty-state">Carregando episódios...</div>';
      await this.loadSeriesDetails(item);
    } else {
      this.dom.detailsEpisodesWrap.classList.add('hidden');
      this.dom.detailsEpisodes.innerHTML = '';
    }
  }

  async loadSeriesDetails(item) {
    if (safeArray(item.episodes).length > 0 && item.episodes[0]?.url) {
      this.renderEpisodes(item);
      return;
    }

    const account = this.getAccountById(item.accountId);

    if (!account) {
      this.dom.detailsEpisodes.innerHTML = '<div class="empty-state">Conta não encontrada para carregar os episódios.</div>';
      return;
    }

    try {
      const response = await this.fetchJson(
        this.buildApiUrl(account, `get_series_info&series_id=${encodeURIComponent(item.seriesId)}`),
        account.proxy
      );

      const episodes = [];
      Object.entries(response.episodes || {}).forEach(([seasonKey, seasonEpisodes]) => {
        safeArray(seasonEpisodes).forEach((episode) => {
          episodes.push({
            id: String(episode.id || episode.stream_id),
            title: episode.title || episode.name || `Episódio ${episode.episode_num || ''}`,
            season: Number(episode.season || seasonKey || 1),
            episodeNum: Number(episode.episode_num || 0),
            duration: Number(episode.info?.duration_secs || 0),
            plot: episode.info?.plot || '',
            poster: episode.info?.movie_image || item.poster,
            extension: episode.container_extension || 'mp4',
            url: this.buildEpisodeUrl(account, {
              id: String(episode.id || episode.stream_id),
              extension: episode.container_extension || 'mp4'
            })
          });
        });
      });

      item.plot = response.info?.plot || item.plot;
      item.backdrop = response.info?.cover || item.backdrop;
      item.poster = response.info?.cover || item.poster;
      item.episodes = episodes;
      this.persistLibraries();
      this.renderEpisodes(item);
    } catch (error) {
      this.dom.detailsEpisodes.innerHTML = `<div class="empty-state">${escapeHtml(error.message || 'Não foi possível carregar os episódios.')}</div>`;
    }
  }

  renderEpisodes(item) {
    if (!safeArray(item.episodes).length) {
      this.dom.detailsEpisodes.innerHTML = '<div class="empty-state">Esta série não retornou episódios pela API.</div>';
      return;
    }

    this.dom.detailsEpisodes.innerHTML = item.episodes.map((episode) => `
      <button class="episode-item" data-parent-item="${escapeHtml(item.id)}" data-play-episode="${escapeHtml(episode.id)}">
        <strong>${escapeHtml(episode.title)}</strong>
        <span>Temporada ${episode.season || 1} · ${formatRuntime(episode.duration)}</span>
      </button>
    `).join('');
  }

  async handleEpisodePlay(parentItemId, episodeId) {
    const item = this.findItemById(parentItemId);
    if (!item) {
      return;
    }

    if (!safeArray(item.episodes).length) {
      await this.loadSeriesDetails(item);
    }

    const episode = safeArray(item.episodes).find((entry) => String(entry.id) === String(episodeId));
    if (!episode) {
      this.showToast('Episódio não encontrado.');
      return;
    }

    this.playItem({
      ...item,
      id: `${item.id}::${episode.id}`,
      type: 'episode',
      title: `${item.title} · ${episode.title}`,
      poster: episode.poster || item.poster,
      plot: episode.plot || item.plot,
      url: episode.url,
      duration: episode.duration,
      progressLabel: 'Episódio'
    });
  }

  async handlePlayItem(itemId) {
    const item = this.findItemById(itemId);
    if (!item) {
      return;
    }

    if (item.type === 'series') {
      await this.loadSeriesDetails(item);
      const firstEpisode = safeArray(item.episodes)[0];

      if (!firstEpisode) {
        this.showToast('Esta série não possui episódios disponíveis.');
        return;
      }

      await this.handleEpisodePlay(item.id, firstEpisode.id);
      return;
    }

    this.playItem(item);
  }

  playItem(item) {
    this.closeModal('detailsModal');
    this.openModal('playerModal');

    this.dom.playerTitle.textContent = item.title;
    this.dom.playerMeta.textContent = [item.categoryName, item.year, item.progressLabel].filter(Boolean).join(' · ');

    const player = this.dom.videoPlayer;
    player.pause();
    player.controls = false;
    player.playbackRate = Number(this.dom.playerSpeedSelect?.value || 1);

    if (this.state.hls) {
      this.state.hls.destroy();
      this.state.hls = null;
    }

    player.removeAttribute('src');
    player.load();

    const progress = this.state.progress[item.id];
    const shouldResume = item.type !== 'channel' && item.type !== 'live';

    if (window.Hls && window.Hls.isSupported() && /\.m3u8($|\?)/i.test(item.url || '')) {
      const hls = new window.Hls();
      this.state.hls = hls;
      hls.loadSource(item.url);
      hls.attachMedia(player);
      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data?.fatal && item.fallbackUrl) {
          player.src = item.fallbackUrl;
          player.play().catch(() => undefined);
        }
      });
    } else {
      player.src = item.url;
    }

    player.onloadedmetadata = () => {
      if (shouldResume && progress?.currentTime && progress.currentTime < (player.duration || Number.MAX_SAFE_INTEGER) - 8) {
        player.currentTime = progress.currentTime;
      }
      this.syncPlayerChrome();
    };

    player.play().catch(() => {
      this.showToast('A reprodução foi bloqueada até você interagir com o player.');
    });

    this.markRecent(item);
    this.state.currentPlayback = item;
    this.dom.playerSurface?.classList.add('show-controls');
    this.syncPlayerChrome();
    this.schedulePlayerControlsHide(2600);
  }

  markRecent(item) {
    const snapshot = this.createSnapshot(item);
    this.state.recents = [snapshot, ...this.state.recents.filter((entry) => entry.id !== item.id)].slice(0, 30);
    this.persistObject(STORAGE_KEYS.recents, this.state.recents);
    this.render();
  }

  togglePlayback() {
    const player = this.dom.videoPlayer;

    if (!player.currentSrc && !player.src) {
      return;
    }

    if (player.paused) {
      player.play().catch(() => {
        this.showToast('Clique novamente para liberar a reprodução.');
      });
    } else {
      player.pause();
    }

    this.pingPlayerControls();
  }

  seekBy(seconds) {
    const player = this.dom.videoPlayer;

    if (this.state.currentPlayback?.type === 'channel') {
      return;
    }

    if (!Number.isFinite(player.duration) || !player.duration) {
      return;
    }

    player.currentTime = Math.max(0, Math.min(player.duration, player.currentTime + seconds));
    this.syncPlayerChrome();
  }

  toggleMute() {
    const player = this.dom.videoPlayer;
    player.muted = !player.muted;

    if (!player.muted && player.volume === 0) {
      player.volume = 0.85;
    }

    this.syncPlayerChrome();
  }

  async togglePictureInPicture() {
    const player = this.dom.videoPlayer;

    if (!document.pictureInPictureEnabled || !player) {
      this.showToast('Picture-in-Picture não está disponível neste navegador.');
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await player.requestPictureInPicture();
      }
    } catch {
      this.showToast('Não foi possível alternar o modo Picture-in-Picture.');
    }
  }

  async toggleFullscreen() {
    const container = this.dom.playerSurface || this.dom.videoPlayer;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
      this.pingPlayerControls();
    } catch {
      this.showToast('Não foi possível alternar a tela cheia.');
    }
  }

  pingPlayerControls() {
    this.dom.playerSurface?.classList.add('show-controls');
    this.schedulePlayerControlsHide();
  }

  schedulePlayerControlsHide(delay = 2200) {
    window.clearTimeout(this.playerControlsTimer);

    if (this.dom.videoPlayer.paused) {
      this.dom.playerSurface?.classList.add('show-controls');
      return;
    }

    this.playerControlsTimer = window.setTimeout(() => {
      this.dom.playerSurface?.classList.remove('show-controls');
    }, delay);
  }

  syncPlayerChrome() {
    const player = this.dom.videoPlayer;
    const currentItem = this.state.currentPlayback;
    const isLive = currentItem?.type === 'channel';
    const duration = !isLive && Number.isFinite(player.duration) ? player.duration : 0;
    const current = !isLive && Number.isFinite(player.currentTime) ? player.currentTime : 0;
    const percent = isLive ? 100 : (duration > 0 ? (current / duration) * 100 : 0);

    if (this.dom.playerSeek) {
      this.dom.playerSeek.value = String(percent || 0);
      this.dom.playerSeek.disabled = isLive || duration <= 0;
      this.dom.playerSeek.classList.toggle('is-live-track', isLive);
    }

    if (this.dom.playerCurrentTime) {
      this.dom.playerCurrentTime.textContent = isLive ? 'Canal' : formatClock(current);
    }

    if (this.dom.playerDuration) {
      this.dom.playerDuration.textContent = isLive ? 'Agora' : (duration > 0 ? formatClock(duration) : '00:00');
    }

    if (this.dom.playerLiveBadge) {
      this.dom.playerLiveBadge.classList.toggle('hidden', !isLive);
    }

    this.dom.playerSurface?.classList.toggle('is-live', isLive);

    if (this.dom.playerPlayPauseBtn) {
      const isPaused = player.paused;
      this.dom.playerPlayPauseBtn.dataset.state = isPaused ? 'paused' : 'playing';
      this.dom.playerPlayPauseBtn.textContent = isPaused ? 'Play' : 'Pausar';
    }

    if (this.dom.playerMuteBtn) {
      const isMuted = player.muted || player.volume === 0;
      this.dom.playerMuteBtn.dataset.state = isMuted ? 'muted' : 'on';
      this.dom.playerMuteBtn.textContent = isMuted ? 'Mudo' : 'Som';
    }

    if (this.dom.playerVolume) {
      const currentVolume = player.muted ? 0 : Number(player.volume || 0);
      this.dom.playerVolume.value = String(currentVolume);
    }

    if (this.dom.playerBackBtn) {
      this.dom.playerBackBtn.disabled = isLive;
    }

    if (this.dom.playerForwardBtn) {
      this.dom.playerForwardBtn.disabled = isLive;
    }

    if (this.dom.playerVolume) {
      this.dom.playerVolume.value = String(player.muted ? 0 : player.volume);
    }

    this.dom.playerSurface?.classList.toggle('is-live', isLive);
    this.dom.playerSurface?.classList.toggle('is-playing', !player.paused);

    if (player.paused) {
      this.dom.playerSurface?.classList.add('show-controls');
    }
  }

  handlePlaybackProgress() {
    const current = this.state.currentPlayback;
    const player = this.dom.videoPlayer;
    this.syncPlayerChrome();

    if (!current || current.type === 'channel') {
      return;
    }

    const now = Date.now();
    if (now - this.state.lastProgressSave < 1500) {
      return;
    }

    if (!Number.isFinite(player.currentTime) || player.currentTime < 1) {
      return;
    }

    this.state.lastProgressSave = now;
    this.state.progress[current.id] = {
      ...this.createSnapshot(current),
      currentTime: player.currentTime,
      duration: Number.isFinite(player.duration) ? player.duration : current.duration || 0
    };

    this.persistObject(STORAGE_KEYS.progress, this.state.progress);
  }

  clearFinishedProgress() {
    const current = this.state.currentPlayback;

    if (!current) {
      return;
    }

    delete this.state.progress[current.id];
    this.persistObject(STORAGE_KEYS.progress, this.state.progress);
    this.render();
  }

  closePlayer() {
    this.closeModal('playerModal');
    const player = this.dom.videoPlayer;
    player.pause();

    if (this.state.hls) {
      this.state.hls.destroy();
      this.state.hls = null;
    }

    player.removeAttribute('src');
    player.load();
    player.currentTime = 0;
    player.playbackRate = 1;
    if (this.dom.playerSpeedSelect) {
      this.dom.playerSpeedSelect.value = '1';
    }
    this.state.currentPlayback = null;
    window.clearTimeout(this.playerControlsTimer);
    this.dom.playerSurface?.classList.add('show-controls');
    this.syncPlayerChrome();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new NexoraApp();
  document.getElementById('playerModal')?.addEventListener('click', (event) => {
    if (event.target.id === 'playerModal') {
      app.closePlayer();
    }
  });

  ['connectModal', 'detailsModal'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', (event) => {
      if (event.target.id === id) {
        app.closeModal(id);
      }
    });
  });
});
