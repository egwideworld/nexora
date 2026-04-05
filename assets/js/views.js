import {
  escapeHtml,
  formatRuntime,
  formatUnixDate,
  makePoster,
  normalizeServer,
  safeArray,
  sortByAdded
} from './utils.js';

export function createViewRenderer({ dom, getState }) {
  function getViewLabel(view) {
    return {
      home: 'Início',
      movies: 'Filmes',
      series: 'Séries',
      channels: 'Canais ao vivo',
      favorites: 'Favoritos',
      recents: 'Recentes'
    }[view] || 'Início';
  }

  function getAccountById(accounts, accountId) {
    return accounts.find((account) => account.id === accountId) || null;
  }

  function getAllItems(library) {
    if (!library) {
      return [];
    }
    return [...safeArray(library.movies), ...safeArray(library.series), ...safeArray(library.channels)];
  }

  function findItemById(recents, progress, activeAccountId, itemId) {
    const currentItems = getAllItems(getState().currentLibrary);
    const current = currentItems.find((item) => item.id === itemId);

    if (current) {
      return current;
    }

    const recent = recents.find((item) => item.id === itemId);
    if (recent) {
      return recent;
    }

    return progress[itemId] || null;
  }

  function applySearch(items = [], term = '') {
    const searchTerm = term.trim().toLowerCase();

    if (!searchTerm) {
      return items;
    }

    return items.filter((item) => {
      const haystack = `${item.title} ${item.categoryName || ''} ${item.plot || ''}`.toLowerCase();
      return haystack.includes(searchTerm);
    });
  }

  function getFavoriteItems(library, favorites, activeAccountId) {
    const favoriteSet = new Set(favorites[activeAccountId] || []);
    return getAllItems(library).filter((item) => favoriteSet.has(item.id));
  }

  function getRecentItems(recents, activeAccountId) {
    return recents
      .filter((item) => item.accountId === activeAccountId)
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  }

  function getContinueWatchingItems(progress, activeAccountId) {
    return Object.values(progress)
      .filter((item) => item.accountId === activeAccountId && Number(item.currentTime || 0) > 5)
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  }

  function getResumeCandidate(progress, recents, activeAccountId) {
    const continueItems = Object.values(progress).filter(
      (item) => item.accountId === activeAccountId && Number(item.currentTime || 0) > 5
    );
    if (continueItems.length > 0) {
      return continueItems[0];
    }

    const recentItems = recents
      .filter((item) => item.accountId === activeAccountId)
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    return recentItems[0] || null;
  }

  function getLibraryStats(library) {
    return {
      moviesCount: safeArray(library?.movies).length,
      seriesCount: safeArray(library?.series).length,
      channelsCount: safeArray(library?.channels).length
    };
  }

  function formatSyncTime(timestamp) {
    return timestamp
      ? new Date(timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : 'aguardando login';
  }

  function createMediaCard(item, favorites, progress, activeAccountId) {
    const isFavorite = (favorites[activeAccountId] || []).includes(item.id);
    const itemProgress = progress[item.id];
    const progressPercent = itemProgress?.duration
      ? Math.max(3, Math.min(100, (itemProgress.currentTime / itemProgress.duration) * 100))
      : 0;
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

  function createRow(title, items, options = {}) {
    if (!items.length) {
      return '';
    }

    const rowId = 'row-' + Math.random().toString(36).substr(2, 9);
    const isHorizontal = !options.grid;

    return `
      <section class="row-section" id="${rowId}">
        <div class="row-header">
          <div class="row-header-left">
            <p class="eyebrow">${escapeHtml(options.kicker || 'Catálogo')}</p>
            <h2>${escapeHtml(title)}</h2>
          </div>
          ${isHorizontal ? `
          <div class="row-controls">
            <button class="row-scroll-btn" data-scroll="${rowId}" data-dir="left" aria-label="Esquerda">‹</button>
            <button class="see-more-btn" data-row-view="${escapeHtml(options.view || 'home')}">Ver mais</button>
            <button class="row-scroll-btn" data-scroll="${rowId}" data-dir="right" aria-label="Direita">›</button>
          </div>
          ` : ''}
        </div>
        <div class="${isHorizontal ? 'media-row' : 'media-grid'}">
          ${items.map((item) => createMediaCard(item, getState().favorites, getState().progress, getState().activeAccountId)).join('')}
        </div>
      </section>
    `;
  }

  function renderCategoryPage(state) {
    const library = state.currentLibrary;
    if (!library) {
      return '<div class="empty-state">Nenhuma conta conectada.</div>';
    }

    let items = [];
    let title = '';

    if (state.view === 'movies') {
      items = applySearch(safeArray(library.movies), state.search);
      title = 'Filmes';
    } else if (state.view === 'series') {
      items = applySearch(safeArray(library.series), state.search);
      title = 'Séries';
    } else if (state.view === 'channels') {
      items = applySearch(safeArray(library.channels), state.search);
      title = 'Canais';
    } else if (state.view === 'favorites') {
      items = applySearch(getFavoriteItems(library, state.favorites, state.activeAccountId), state.search);
      title = 'Favoritos';
    } else if (state.view === 'recents') {
      items = applySearch(getRecentItems(state.recents, state.activeAccountId), state.search);
      title = 'Recentes';
    }

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
    const keyboardHtml = `
      <div class="category-keyboard">
        ${letters.map(letter => `
          <button class="keyboard-key" data-letter="${letter}" aria-label="Filtrar por ${letter}">${letter}</button>
        `).join('')}
      </div>
    `;

    return `
      <div class="category-page">
        <div class="category-header">
          <h2>${title}</h2>
        </div>
        <div class="category-search">
          <span>🔍</span>
          <input type="text" placeholder="Buscar ${title.toLowerCase()}..." value="${escapeHtml(state.search || '')}" data-category-search />
        </div>
        ${keyboardHtml}
        <div class="category-results">
          ${items.length ? items.map(item => createMediaCard(item, getState().favorites, getState().progress, getState().activeAccountId)).join('') : '<div class="empty-state">Nenhum resultado encontrado.</div>'}
        </div>
      </div>
    `;
  }

  function renderDashboardStrip(state) {
    const library = state.currentLibrary;
    const activeAccount = getAccountById(state.accounts, state.activeAccountId);
    const stats = getLibraryStats(library);
    const favoritesCount = (state.favorites[state.activeAccountId] || []).length;
    const continueCount = getContinueWatchingItems(state.progress, state.activeAccountId).length;
    const recentsCount = getRecentItems(state.recents, state.activeAccountId).length;
    const resumeItem = getResumeCandidate(state.progress, state.recents, state.activeAccountId);
    const liveItem = safeArray(library?.channels)[0] || null;
    const totalAccounts = state.accounts.length;
    const accountName = library?.accountName || 'Nenhuma conta conectada';
    const syncText = formatSyncTime(library?.fetchedAt);
    const statusLabel = activeAccount?.status || 'offline';
    const expLabel = activeAccount?.expDate ? formatUnixDate(activeAccount.expDate) : 'não informado';

    if (dom.viewHeadline) {
      dom.viewHeadline.textContent = getViewLabel(state.view);
    }

    if (dom.activeAccountLabel) {
      dom.activeAccountLabel.textContent = activeAccount
        ? `Conta ativa · ${accountName}`
        : 'Nenhuma conta conectada';
    }

    if (dom.accountsCounter) {
      dom.accountsCounter.textContent = `${totalAccounts} ${totalAccounts === 1 ? 'perfil' : 'perfis'}`;
    }

    if (dom.refreshAllAccountsBtn) {
      dom.refreshAllAccountsBtn.disabled = totalAccounts === 0;
    }

    if (dom.profilePill) {
      dom.profilePill.textContent = '';
    }

    if (dom.sidebarOverviewCard) {
      dom.sidebarOverviewCard.innerHTML = activeAccount
        ? `
          <div class="sidebar-overview-head">
            <div>
              <p class="eyebrow">Biblioteca pronta</p>
              <h3 class="sidebar-account-name">${escapeHtml(accountName)}</h3>
              <p class="sidebar-muted-line">Atualizado em ${escapeHtml(syncText)}</p>
            </div>
            <span class="badge">${escapeHtml(statusLabel)}</span>
          </div>
          <div class="sidebar-chip-row">
            <span class="badge">${stats.moviesCount} filmes</span>
            <span class="badge">${stats.seriesCount} séries</span>
            <span class="badge">${stats.channelsCount} canais</span>
          </div>
        `
        : '<div class="empty-state sidebar-empty">Conecte uma conta para liberar o catálogo.</div>';
    }

    if (dom.accountSummaryCard) {
      dom.accountSummaryCard.innerHTML = activeAccount
        ? `
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
        `
        : '<div class="empty-state sidebar-empty">Conecte uma conta para ver expiração, conexões e status.</div>';
    }

    if (dom.quickStatsGrid) {
      const cards = [
        { label: 'Perfis', value: totalAccounts, hint: totalAccounts === 1 ? 'conectado' : 'conectados' },
        { label: 'Favoritos', value: favoritesCount, hint: favoritesCount ? 'na conta ativa' : 'vazio' },
        { label: 'Continuar', value: continueCount, hint: continueCount ? 'em andamento' : 'nada agora' },
        { label: 'Recentes', value: recentsCount, hint: recentsCount ? 'abertos há pouco' : 'sem histórico' }
      ];

      dom.quickStatsGrid.innerHTML = cards
        .map(
          (card) => `
          <article class="quick-stat-card glass-card">
            <span>${escapeHtml(card.label)}</span>
            <strong class="stat-value">${escapeHtml(String(card.value))}</strong>
            <small>${escapeHtml(card.hint)}</small>
          </article>
        `
        )
        .join('');
    }
  }

  function pickFeaturedItem(state) {
    const library = state.currentLibrary;
    if (!library) {
      return null;
    }

    const continueItems = getContinueWatchingItems(state.progress, state.activeAccountId);
    if (continueItems.length > 0) {
      return continueItems[0];
    }

    const favoriteItems = getFavoriteItems(library, state.favorites, state.activeAccountId);
    if (favoriteItems.length > 0) {
      return favoriteItems[0];
    }

    const featuredId = library.featuredItemId;
    const item = featuredId ? findItemById(state.recents, state.progress, state.activeAccountId, featuredId) : null;
    return item || getAllItems(library)[0] || null;
  }

  function getFeaturedItems(state, limit = 5) {
    const library = state.currentLibrary;
    if (!library) return [];

    const items = getAllItems(library);
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  }

  function renderHero(state) {
    const library = state.currentLibrary;
    const featuredItems = getFeaturedItems(state, 5);

    if (!featuredItems.length || !library) {
      dom.heroSection.innerHTML =
        '<div class="hero-content"><h2 class="hero-title">Conecte sua conta Xtream Codes</h2><p class="hero-description">Adicione uma conta para carregar filmes, séries e canais.</p><div class="hero-actions" style="margin-top: 16px;"><button class="primary-btn" id="heroConnectBtn">Adicionar conta</button></div></div>';
      document.getElementById('heroConnectBtn')?.addEventListener('click', () => dom.openModal?.('connectModal'));
      return;
    }

    const slidesHtml = featuredItems.map((item, index) => {
      const rating = item.rating ? `⭐ ${escapeHtml(item.rating)}` : escapeHtml(item.progressLabel || 'Streaming');
      const year = item.year ? `· ${escapeHtml(item.year)}` : '';
      const bgImage = item.backdrop || item.poster || makePoster(item.title);

      return `
        <div class="hero-slide${index === 0 ? ' active' : ''}" data-slide="${index}">
          <div class="hero-slide-bg" style="background-image: url('${bgImage}')"></div>
          <div class="hero-slide-content">
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
    }).join('');

    const dotsHtml = featuredItems.map((_, index) =>
      `<button class="hero-carousel-dot${index === 0 ? ' active' : ''}" data-slide="${index}" aria-label="Slide ${index + 1}"></button>`
    ).join('');

    dom.heroSection.innerHTML = `
      <div class="hero-carousel">
        ${slidesHtml}
        <div class="hero-carousel-nav">${dotsHtml}</div>
      </div>
    `;

    let currentSlide = 0;
    const slides = dom.heroSection.querySelectorAll('.hero-slide');
    const dots = dom.heroSection.querySelectorAll('.hero-carousel-dot');

    const goToSlide = (index) => {
      slides.forEach(s => s.classList.remove('active'));
      dots.forEach(d => d.classList.remove('active'));
      slides[index]?.classList.add('active');
      dots[index]?.classList.add('active');
      currentSlide = index;
    };

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        goToSlide(parseInt(dot.dataset.slide));
      });
    });

    setInterval(() => {
      const next = (currentSlide + 1) % slides.length;
      goToSlide(next);
    }, 6000);
  }

  function renderContinueSection(state) {
    const items = getContinueWatchingItems(state.progress, state.activeAccountId);

    if (!items.length) {
      dom.continueSection?.classList.add('hidden');
      dom.continueRow && (dom.continueRow.innerHTML = '');
      return;
    }

    dom.continueSection?.classList.remove('hidden');
    if (dom.continueRow) {
      dom.continueRow.innerHTML = items.slice(0, 12).map((item) =>
        createMediaCard(item, state.favorites, state.progress, state.activeAccountId)
      ).join('');
    }
  }

  function buildRowsForCurrentView(state) {
    const library = state.currentLibrary;
    if (!library) {
      return [];
    }

    const movies = applySearch(safeArray(library.movies), state.search);
    const series = applySearch(safeArray(library.series), state.search);
    const channels = applySearch(safeArray(library.channels), state.search);
    const favorites = applySearch(
      getFavoriteItems(library, state.favorites, state.activeAccountId),
      state.search
    );
    const recents = applySearch(getRecentItems(state.recents, state.activeAccountId), state.search);

    if (state.view === 'movies') {
      return [createRow('Todos os filmes', movies, { kicker: 'Filmes', grid: true })];
    }

    if (state.view === 'series') {
      return [createRow('Todas as séries', series, { kicker: 'Séries', grid: true })];
    }

    if (state.view === 'channels') {
      return [createRow('Canais ao vivo', channels, { kicker: 'Ao vivo', grid: true })];
    }

    if (state.view === 'favorites') {
      return [createRow('Seus favoritos', favorites, { kicker: 'Favoritos', grid: true })];
    }

    if (state.view === 'recents') {
      return [createRow('Abertos recentemente', recents, { kicker: 'Recentes', grid: true })];
    }

    return [
      createRow('Filmes em destaque', movies.slice(0, 18), { kicker: 'Curadoria' }),
      createRow('Séries para maratonar', series.slice(0, 18), { kicker: 'Séries' }),
      createRow('Canais ao vivo', channels.slice(0, 18), { kicker: 'Live' }),
      createRow('Favoritos rápidos', favorites.slice(0, 12), { kicker: 'Sua lista' }),
      createRow('Acessos recentes', recents.slice(0, 12), { kicker: 'Histórico' })
    ];
  }

  function renderAccounts(state) {
    const accountsHtml = state.accounts
      .map((account) => {
        const library = state.libraries[account.id];
        const totalItems = library
          ? safeArray(library.movies).length +
            safeArray(library.series).length +
            safeArray(library.channels).length
          : 0;
        const expLabel = account.expDate ? formatUnixDate(account.expDate) : 'sem data';
        const statusLabel = account.status || 'offline';
        const syncLabel = library?.fetchedAt
          ? new Date(library.fetchedAt).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'sem sync';

        return `
          <div class="account-item ${state.activeAccountId === account.id ? 'active' : ''}">
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
      })
      .join('');

    dom.accountsList.innerHTML = accountsHtml || '<div class="empty-state sidebar-empty">Nenhuma conta conectada ainda.</div>';
  }

  function renderNavState(state) {
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.classList.toggle('active', button.dataset.view === state.view);
    });
  }

  function render(state) {
    renderNavState(state);
    renderDashboardStrip(state);
    renderHero(state);
    renderContinueSection(state);

    const isCategoryView = ['movies', 'series', 'channels', 'favorites', 'recents'].includes(state.view);

    if (isCategoryView) {
      dom.rowsContainer.innerHTML = renderCategoryPage(state);
    } else {
      const rows = buildRowsForCurrentView(state).filter(Boolean);
      dom.rowsContainer.innerHTML = rows.length
        ? rows.join('')
        : '<div class="empty-state">Nenhum item encontrado para este filtro. Tente outra busca ou troque de conta.</div>';
    }
  }

  function renderDetailsModal(item, state, onLoadSeries) {
    dom.detailsModal.dataset.itemId = item.id;
    dom.detailsPoster.src = item.poster || makePoster(item.title);
    dom.detailsType.textContent = item.progressLabel || item.type;
    dom.detailsTitle.textContent = item.title;
    dom.detailsMeta.textContent = [item.categoryName, item.year, item.rating ? `⭐ ${item.rating}` : '']
      .filter(Boolean)
      .join(' · ');
    dom.detailsDescription.textContent = item.plot || 'Sem descrição disponível para este conteúdo.';
    dom.detailsBadges.innerHTML = [
      `<span class="badge">${escapeHtml(item.progressLabel || item.type)}</span>`,
      item.categoryName ? `<span class="badge">${escapeHtml(item.categoryName)}</span>` : '',
      item.year ? `<span class="badge">${escapeHtml(item.year)}</span>` : ''
    ].join('');

    const favorites = state.favorites[state.activeAccountId] || [];
    const isFavorite = favorites.includes(item.id);
    dom.detailsFavoriteBtn.textContent = isFavorite ? 'Remover favorito' : 'Favoritar';

    if (item.type === 'series') {
      dom.detailsEpisodesWrap.classList.remove('hidden');
      dom.detailsEpisodes.innerHTML = '<div class="empty-state">Carregando episódios...</div>';
      onLoadSeries?.(item);
    } else {
      dom.detailsEpisodesWrap.classList.add('hidden');
      dom.detailsEpisodes.innerHTML = '';
    }
  }

  function renderEpisodes(item) {
    if (!safeArray(item.episodes).length) {
      dom.detailsEpisodes.innerHTML = '<div class="empty-state">Esta série não retornou episódios pela API.</div>';
      return;
    }

    const episodesBySeason = {};
    item.episodes.forEach(ep => {
      const season = ep.season || 1;
      if (!episodesBySeason[season]) episodesBySeason[season] = [];
      episodesBySeason[season].push(ep);
    });

    const seasonsHtml = Object.entries(episodesBySeason)
      .sort(([a], [b]) => a - b)
      .map(([season, episodes]) => `
        <div class="season-group">
          <div class="season-header">
            <h3>Temporada ${season}</h3>
            <span>${episodes.length} episódios</span>
          </div>
          <div class="episodes-grid">
            ${episodes.map(episode => `
              <button class="episode-item" data-parent-item="${escapeHtml(item.id)}" data-play-episode="${escapeHtml(episode.id)}">
                <strong>${escapeHtml(episode.title || `Episódio ${episode.num}`)}</strong>
                <span>${formatRuntime(episode.duration)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `).join('');

    dom.detailsEpisodes.innerHTML = seasonsHtml;
  }

  return {
    render,
    renderAccounts,
    renderDetailsModal,
    renderEpisodes,
    getViewLabel,
    getAccountById,
    getAllItems,
    findItemById,
    getFavoriteItems,
    getRecentItems,
    getContinueWatchingItems,
    getResumeCandidate,
    pickFeaturedItem,
    buildRowsForCurrentView,
    createMediaCard,
    createRow
  };
}