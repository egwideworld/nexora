import {
  STORAGE_KEYS,
  safeParse,
  escapeHtml,
  formatRuntime,
  formatUnixDate,
  makePoster,
  normalizeServer,
  safeArray,
  sortByAdded,
  makeAccountId
} from './assets/js/utils.js';

import {
  applyProxy as applyProxyFn,
  buildApiUrl as buildApiUrlFn,
  fetchJson as fetchJsonFn,
  buildMovieUrl as buildMovieUrlFn,
  buildLiveUrl as buildLiveUrlFn,
  buildEpisodeUrl as buildEpisodeUrlFn
} from './assets/js/api.js';

import {
  loadInitialState,
  removeLegacyDemoState,
  persistLibraries,
  persistObject,
  persistValue
} from './assets/js/store.js';

import { createViewRenderer } from './assets/js/views.js';
import { createPlayerController } from './assets/js/player.js';

class NexoraApp {
  constructor() {
    this.queuedAccount = this.loadQueuedAccount();

    const initialState = loadInitialState();
    const { state, changed } = removeLegacyDemoState(initialState);

    if (changed) {
      persistObject(STORAGE_KEYS.favorites, state.favorites);
      persistObject(STORAGE_KEYS.recents, state.recents);
      persistObject(STORAGE_KEYS.progress, state.progress);
      persistLibraries(state, STORAGE_KEYS);
      persistValue(STORAGE_KEYS.activeAccount, state.activeAccountId || '');
    }

    this.state = state;
    this.dom = this.collectDom();
    this.views = createViewRenderer({ dom: this.dom, getState: () => this.state });
    this.player = createPlayerController({ 
      dom: this.dom, 
      getState: () => this.state, 
      setState: (s) => Object.assign(this.state, s),
      closeModal: (id) => this.closeModal(id)
    });
    this.bindEvents();
    this.bootstrap();
  }

  loadQueuedAccount() {
    const queued = safeParse(localStorage.getItem('nexora.queuedAccount'), null);
    if (!queued || !queued.server || !queued.username || !queued.password) {
      localStorage.removeItem('nexora.queuedAccount');
      return null;
    }
    localStorage.removeItem('nexora.queuedAccount');
    return queued;
  }

  collectDom() {
    return {
      pageShell: document.querySelector('.page-shell'),
      contentShell: document.querySelector('.content-shell'),
      authGate: document.getElementById('authGate'),
      authForm: document.getElementById('authForm'),
      authFormContainer: document.getElementById('authFormContainer'),
      accountSelector: document.getElementById('accountSelector'),
      accountSelectorGrid: document.getElementById('accountSelectorGrid'),
      addNewAccountBtn: document.getElementById('addNewAccountBtn'),
      loaderOverlay: document.getElementById('loaderOverlay'),
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

  showAuthGate() {
    this.dom.authGate?.classList.remove('hidden');
    document.body.classList.add('app-locked');
    
    this.renderAccountSelector();
  }

  renderAccountSelector() {
    const accounts = this.state.accounts;
    
    if (!accounts.length) {
      this.showAuthForm();
      return;
    }
    
    this.dom.accountSelector?.classList.remove('hidden');
    this.dom.authFormContainer?.classList.add('hidden');
    
    if (this.dom.accountSelectorGrid) {
      this.dom.accountSelectorGrid.innerHTML = accounts.map(account => {
        const initial = account.name ? account.name.charAt(0).toUpperCase() : '?';
        const serverDisplay = account.server ? new URL(account.server).hostname : '';
        const statusLabel = account.status || 'offline';
        const expLabel = account.expDate ? new Date(account.expDate * 1000).toLocaleDateString('pt-BR') : 'não informado';
        
        return `
          <button class="account-select-card" data-select-account="${escapeHtml(account.id)}">
            <div class="account-select-avatar">${initial}</div>
            <div class="account-select-info">
              <strong>${escapeHtml(account.name)}</strong>
              <span class="account-select-server">${escapeHtml(serverDisplay)}</span>
              <div class="account-select-meta">
                <span class="account-badge ${statusLabel.toLowerCase()}">${escapeHtml(statusLabel)}</span>
                <span class="account-exp">Exp: ${escapeHtml(expLabel)}</span>
              </div>
            </div>
          </button>
        `;
      }).join('');
    }
    
    this.dom.addNewAccountBtn?.addEventListener('click', () => this.showAuthForm());
    
    this.dom.accountSelectorGrid?.querySelectorAll('[data-select-account]').forEach(btn => {
      btn.addEventListener('click', () => {
        const accountId = btn.dataset.selectAccount;
        this.switchAccount(accountId);
        this.hideAuthGate();
      });
    });
  }

  showAuthForm() {
    this.dom.accountSelector?.classList.add('hidden');
    this.dom.authFormContainer?.classList.remove('hidden');
  }

  hideAuthGate() {
    if (this.dom.authGate) {
      this.dom.authGate.classList.add('hidden');
    }
    document.body.classList.remove('app-locked');
  }

  bootstrap() {
    this.views.renderAccounts(this.state);

    if (this.queuedAccount && this.dom.connectForm) {
      const form = this.dom.connectForm;
      const nameInput = form.querySelector('[name="name"]');
      const serverInput = form.querySelector('[name="server"]');
      const usernameInput = form.querySelector('[name="username"]');
      const passwordInput = form.querySelector('[name="password"]');
      const proxyInput = form.querySelector('[name="proxy"]');

      if (nameInput) nameInput.value = this.queuedAccount.name || '';
      if (serverInput) serverInput.value = this.queuedAccount.server || '';
      if (usernameInput) usernameInput.value = this.queuedAccount.username || '';
      if (passwordInput) passwordInput.value = this.queuedAccount.password || '';
      if (proxyInput) proxyInput.value = this.queuedAccount.proxy || '';

      this.showAuthGate();
      this.openModal('connectModal');
      this.showToast('Parâmetros de conta carregados da URL. Clique em Entrar e sincronizar.');
      return;
    }

    if (!this.state.accounts.length) {
      this.state.activeAccountId = '';
      this.state.currentLibrary = null;
      persistValue(STORAGE_KEYS.activeAccount, '');
      this.showAuthGate();
      this.views.render(this.state);
      this.updateStatus('info', 'Conecte sua conta Xtream Codes para entrar no Nexora.');
      return;
    }

    if (!this.state.libraries[this.state.activeAccountId]) {
      this.state.activeAccountId = this.state.accounts[0]?.id || '';
    }

    this.state.currentLibrary = this.state.activeAccountId
      ? this.state.libraries[this.state.activeAccountId] || null
      : null;

    persistValue(STORAGE_KEYS.activeAccount, this.state.activeAccountId || '');
    
    this.showAuthGate();
    this.restoreSidebarState();
    this.views.render(this.state);
    this.updateStatusForCurrentAccount();
  }

  restoreSidebarState() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const sidebar = document.querySelector('.sidebar');
        const shell = document.querySelector('.page-shell');
        if (!sidebar) { return; }

        const isOpen = this.state.sidebarOpen;
        
        if (!isOpen) {
          sidebar.classList.add('hidden');
          shell?.classList.add('sidebar-hidden');
        }
      });
    });
  }

  bindEvents() {
    document.getElementById('openConnectBtn')?.addEventListener('click', () => this.openModal('connectModal'));
    this.dom.mobileMenuBtn?.addEventListener('click', () => this.toggleSidebar(true));
    this.dom.closeSidebarBtn?.addEventListener('click', () => this.toggleSidebar(false));
    this.dom.sidebarBackdrop?.addEventListener('click', () => this.toggleSidebar(false));
    this.dom.refreshAllAccountsBtn?.addEventListener('click', async () => { await this.refreshAllAccounts(); });
    this.dom.importAccountsBtn?.addEventListener('click', () => this.dom.importAccountsInput?.click());
    this.dom.exportAccountsBtn?.addEventListener('click', () => this.exportAccounts());
    this.dom.importAccountsInput?.addEventListener('change', async (event) => { await this.importAccounts(event); });
    this.dom.clearProgressBtn?.addEventListener('click', () => this.clearPlaybackData());

    this.dom.authForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.handleConnect(this.dom.authForm);
    });

    this.dom.searchInput.addEventListener('input', (event) => {
      this.state.search = event.target.value.trim();
      this.views.render(this.state);
    });

    this.dom.searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.state.search = event.target.value.trim();
        this.views.render(this.state);
        this.scrollContentTop();
      }
      if (event.key === 'Escape') {
        event.target.value = '';
        this.state.search = '';
        this.views.render(this.state);
      }
    });

    document.addEventListener('input', (event) => {
      if (event.target.matches('[data-category-search]')) {
        this.state.search = event.target.value.trim();
        this.views.render(this.state);
      }
    });

    document.addEventListener('click', (event) => {
      const keyboardKey = event.target.closest('.keyboard-key');
      if (keyboardKey) {
        const letter = keyboardKey.dataset.letter;
        const searchInput = document.querySelector('[data-category-search]');
        if (searchInput) {
          searchInput.value = letter;
          this.state.search = letter;
          this.views.render(this.state);
        }
      }
    });

    document.addEventListener('wheel', (event) => {
      if (event.shiftKey) {
        event.preventDefault();
        const container = this.dom.contentShell;
        if (container) {
          container.scrollBy({ left: event.deltaY, behavior: 'smooth' });
        }
      }
    }, { passive: false });

    window.addEventListener('resize', () => {
      // Only auto-close on resize if user previously had it open
      if (window.innerWidth > 1040 && this.state.sidebarOpen === true) {
        this.toggleSidebar(false);
      }
    });

    this.dom.connectForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.handleConnect(this.dom.connectForm);
    });

    this.dom.detailsPlayBtn.addEventListener('click', async () => {
      const itemId = this.dom.detailsModal.dataset.itemId;
      if (itemId) { await this.handlePlayItem(itemId); }
    });

    this.dom.detailsFavoriteBtn.addEventListener('click', () => {
      const itemId = this.dom.detailsModal.dataset.itemId;
      if (itemId) { this.toggleFavorite(itemId); }
    });

    this.player.bindPlayerEvents(this.dom);

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
        this.views.render(this.state);
        this.scrollContentTop();
        return;
      }

      const scrollBtn = event.target.closest('[data-scroll]');
      if (scrollBtn) {
        const rowId = scrollBtn.dataset.scroll;
        const dir = scrollBtn.dataset.dir;
        const container = document.getElementById(rowId)?.querySelector('.media-row');
        if (container) {
          const scrollAmount = container.offsetWidth * 0.7;
          if (dir === 'left') {
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
          } else {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
          }
        }
        return;
      }

      const seeMoreBtn = event.target.closest('[data-row-view]');
      if (seeMoreBtn) {
        this.state.view = seeMoreBtn.dataset.rowView;
        if (seeMoreBtn.dataset.category) {
          this.state.categoryFilter = seeMoreBtn.dataset.category;
        }
        this.views.render(this.state);
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
          this.player.closePlayer();
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
        this.player.closePlayer();
        return;
      }

      if (typing || this.dom.playerModal.classList.contains('hidden')) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        this.player.togglePlayback();
      } else if (event.key === 'ArrowLeft') {
        this.player.seekBy(-10);
      } else if (event.key === 'ArrowRight') {
        this.player.seekBy(10);
      } else if (event.key.toLowerCase() === 'm') {
        this.player.toggleMute();
      } else if (event.key.toLowerCase() === 'f') {
        this.player.toggleFullscreen();
      }
    });
  }

  updateStatus(type, text) {
    this.dom.statusPill.className = `status-pill ${type}`;
    this.dom.statusPill.textContent = { ready: 'Pronto', success: 'Conectado', syncing: 'Sincronizando', info: 'Aviso', error: 'Erro' }[type] || 'Status';
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

    if (this.dom.searchInput) { this.dom.searchInput.value = ''; }

    persistValue(STORAGE_KEYS.activeAccount, this.state.activeAccountId || '');
    this.views.renderAccounts(this.state);
    this.views.render(this.state);
    this.updateStatusForCurrentAccount();
    this.scrollContentTop();

    if (nextLibrary) {
      this.hideAuthGate();
    } else {
      this.showAuthGate();
    }
  }

  async handleConnect(formElement = this.dom.connectForm) {
    this.showLoader(true);

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
      this.showLoader(false);
      return;
    }

    const submitButton = formElement.querySelector('button[type="submit"]');
    if (submitButton) { submitButton.disabled = true; }

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

      persistObject(STORAGE_KEYS.accounts, this.state.accounts);
      persistValue(STORAGE_KEYS.activeAccount, account.id);
      persistLibraries(this.state, STORAGE_KEYS);

      this.hideAuthGate();
      this.views.renderAccounts(this.state);
      this.views.render(this.state);
      this.updateStatusForCurrentAccount();
      this.closeModal('connectModal');
      this.dom.connectForm.reset();
      this.dom.authForm?.reset();
      this.showToast('Conta sincronizada com sucesso.');
    } catch (error) {
      this.updateStatus('error', error.message || 'Não foi possível sincronizar a conta.');
      this.showToast('Falha ao conectar a conta Xtream Codes.');
    } finally {
      if (submitButton) { submitButton.disabled = false; }
      this.showLoader(false);
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
      persistObject(STORAGE_KEYS.accounts, this.state.accounts);
      persistLibraries(this.state, STORAGE_KEYS);

      if (this.state.activeAccountId === account.id) {
        this.state.currentLibrary = library;
        this.views.render(this.state);
        this.updateStatusForCurrentAccount();
      }

      this.views.renderAccounts(this.state);
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

    persistObject(STORAGE_KEYS.accounts, this.state.accounts);
    persistLibraries(this.state, STORAGE_KEYS);
    this.state.currentLibrary = this.state.libraries[this.state.activeAccountId] || this.state.libraries[this.state.accounts[0]?.id] || null;
    this.views.renderAccounts(this.state);
    this.views.render(this.state);

    if (failures.length) {
      this.updateStatus('info', `Atualização concluída com ${failures.length} aviso(s).`);
      this.showToast(`Algumas contas falharam na atualização (${failures.length}).`);
      return;
    }

    this.updateStatusForCurrentAccount();
    this.showToast('Todas as contas foram atualizadas.');
  }

  removeAccount(accountId) {
    if (!accountId) { return; }

    const account = this.getAccountById(accountId);
    const confirmed = window.confirm(`Remover a conta ${account?.name || accountId} do Nexora?`);
    if (!confirmed) { return; }

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

    persistObject(STORAGE_KEYS.accounts, this.state.accounts);
    persistObject(STORAGE_KEYS.favorites, this.state.favorites);
    persistObject(STORAGE_KEYS.recents, this.state.recents);
    persistObject(STORAGE_KEYS.progress, this.state.progress);
    persistValue(STORAGE_KEYS.activeAccount, this.state.activeAccountId || '');
    persistLibraries(this.state, STORAGE_KEYS);

    this.views.renderAccounts(this.state);
    this.views.render(this.state);

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
    if (!file) { return; }

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
      persistObject(STORAGE_KEYS.accounts, this.state.accounts);
      persistObject(STORAGE_KEYS.favorites, this.state.favorites);
      persistObject(STORAGE_KEYS.progress, this.state.progress);
      persistObject(STORAGE_KEYS.recents, this.state.recents);
      persistLibraries(this.state, STORAGE_KEYS);
      persistValue(STORAGE_KEYS.activeAccount, this.state.activeAccountId || '');
      this.hideAuthGate();
      this.views.renderAccounts(this.state);
      this.views.render(this.state);
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
    if (!confirmed) { return; }

    delete this.state.favorites[this.state.activeAccountId];
    this.state.recents = this.state.recents.filter((item) => item.accountId !== this.state.activeAccountId);
    this.state.progress = Object.fromEntries(
      Object.entries(this.state.progress).filter(([, value]) => value.accountId !== this.state.activeAccountId)
    );

    persistObject(STORAGE_KEYS.favorites, this.state.favorites);
    persistObject(STORAGE_KEYS.recents, this.state.recents);
    persistObject(STORAGE_KEYS.progress, this.state.progress);
    this.views.render(this.state);
    this.showToast('Dados locais da conta ativa foram limpos.');
  }

  applyProxy(url, proxy) { return applyProxyFn(url, proxy); }
  buildApiUrl(account, action = '') { return buildApiUrlFn(account, action); }
  async fetchJson(url, proxy = '') { return fetchJsonFn(url, proxy); }
  buildMovieUrl(account, item) { return buildMovieUrlFn(account, item); }
  buildLiveUrl(account, item, extension = 'm3u8') { return buildLiveUrlFn(account, item, extension); }
  buildEpisodeUrl(account, episode) { return buildEpisodeUrlFn(account, episode); }

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

    baseAccount.server = normalizeServer(baseAccount.server);

    const [profile, liveCategories, vodCategories, seriesCategories, liveStreams, vodStream, seriesList] = await Promise.all([
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

    const liveCategoryMap = Object.fromEntries(safeArray(liveCategories).map((item) => [String(item.category_id), item.category_name || 'Canais']));
    const vodCategoryMap = Object.fromEntries(safeArray(vodCategories).map((item) => [String(item.category_id), item.category_name || 'Filmes']));
    const seriesCategoryMap = Object.fromEntries(safeArray(seriesCategories).map((item) => [String(item.category_id), item.category_name || 'Séries']));

    const movies = sortByAdded(safeArray(vodStream).map((item) => this.mapMovieItem(account.id, account, item, vodCategoryMap)));
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

  findItemById(itemId) {
    const currentItems = this.views.getAllItems(this.state.currentLibrary);
    const current = currentItems.find((item) => item.id === itemId);

    if (current) { return current; }

    const recent = this.state.recents.find((item) => item.id === itemId);
    if (recent) { return recent; }

    return this.state.progress[itemId] || null;
  }

  toggleFavorite(itemId) {
    const item = this.findItemById(itemId);
    if (!item) { return; }

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
    persistObject(STORAGE_KEYS.favorites, this.state.favorites);
    this.views.render(this.state);

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
    if (!item) { return; }

    this.views.renderDetailsModal(item, this.state, async (seriesItem) => {
      await this.loadSeriesDetails(seriesItem);
    });
    this.openModal('detailsModal');
  }

  async loadSeriesDetails(item) {
    if (safeArray(item.episodes).length > 0 && item.episodes[0]?.url) {
      this.views.renderEpisodes(item);
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
      persistLibraries(this.state, STORAGE_KEYS);
      this.views.renderEpisodes(item);
    } catch (error) {
      this.dom.detailsEpisodes.innerHTML = `<div class="empty-state">${escapeHtml(error.message || 'Não foi possível carregar os episódios.')}</div>`;
    }
  }

  async handleEpisodePlay(parentItemId, episodeId) {
    const item = this.findItemById(parentItemId);
    if (!item) { return; }

    if (!safeArray(item.episodes).length) {
      await this.loadSeriesDetails(item);
    }

    const episode = safeArray(item.episodes).find((entry) => String(entry.id) === String(episodeId));
    if (!episode) {
      this.showToast('Episódio não encontrado.');
      return;
    }

    this.player.playItem(
      {
        ...item,
        id: `${item.id}::${episode.id}`,
        type: 'episode',
        title: `${item.title} · ${episode.title}`,
        poster: episode.poster || item.poster,
        plot: episode.plot || item.plot,
        url: episode.url,
        duration: episode.duration,
        progressLabel: 'Episódio'
      },
      () => this.clearFinishedProgress(),
      (progress) => persistObject(STORAGE_KEYS.progress, progress)
    );
  }

  async handlePlayItem(itemId) {
    const item = this.findItemById(itemId);
    if (!item) { return; }

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

    this.player.playItem(
      item,
      () => this.clearFinishedProgress(),
      (progress) => persistObject(STORAGE_KEYS.progress, progress)
    );

    this.markRecent(item);
  }

  markRecent(item) {
    const snapshot = {
      ...item,
      accountId: item.accountId || this.state.activeAccountId,
      updatedAt: Date.now()
    };
    this.state.recents = [snapshot, ...this.state.recents.filter((entry) => entry.id !== item.id)].slice(0, 30);
    persistObject(STORAGE_KEYS.recents, this.state.recents);
    this.views.render(this.state);
  }

  clearFinishedProgress() {
    const current = this.state.currentPlayback;
    if (!current) { return; }

    delete this.state.progress[current.id];
    persistObject(STORAGE_KEYS.progress, this.state.progress);
    this.views.render(this.state);
  }

  toggleSidebar(force) {
    const sidebar = document.querySelector('.sidebar');
    const shell = document.querySelector('.page-shell');
    if (!sidebar) { return; }

    const nextState = typeof force === 'boolean' ? force : !sidebar.classList.contains('hidden');
    sidebar.classList.toggle('hidden', !nextState);
    shell?.classList.toggle('sidebar-hidden', !nextState);
    
    this.state.sidebarOpen = nextState;
    persistValue(STORAGE_KEYS.sidebarOpen, String(nextState));
  }

  scrollContentTop() {
    this.dom.contentShell?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showLoader(show = true) {
    if (!this.dom.loaderOverlay) { return; }
    this.dom.loaderOverlay.classList.toggle('active', show);
  }

  async handleQuickAction(action) {
    if (!this.state.currentLibrary) {
      this.showToast('Conecte uma conta para usar os atalhos rápidos.');
      return;
    }

    if (action === 'resume') {
      const item = this.views.getResumeCandidate(this.state.progress, this.state.recents, this.state.activeAccountId);
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

      if (this.dom.searchInput) { this.dom.searchInput.value = ''; }

      this.views.render(this.state);
      this.scrollContentTop();
      this.playItem(liveItem);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new NexoraApp();

  document.getElementById('playerModal')?.addEventListener('click', (event) => {
    if (event.target.id === 'playerModal') {
      app.player.closePlayer();
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