import { STORAGE_KEYS, safeParse, safeArray } from './utils.js';

export function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(partial) {
    const prev = state;
    state = { ...state, ...partial };
    listeners.forEach((fn) => fn(state, prev));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { getState, setState, subscribe };
}

export function createPersistenceMiddleware(store, storageKeys) {
  store.subscribe((state, prev) => {
    if (state.accounts !== prev.accounts) {
      persistObject(storageKeys.accounts, state.accounts);
    }
    if (state.activeAccountId !== prev.activeAccountId) {
      persistValue(storageKeys.activeAccount, state.activeAccountId || '');
    }
    if (state.favorites !== prev.favorites) {
      persistObject(storageKeys.favorites, state.favorites);
    }
    if (state.progress !== prev.progress) {
      persistObject(storageKeys.progress, state.progress);
    }
    if (state.recents !== prev.recents) {
      persistObject(storageKeys.recents, state.recents);
    }
    if (state.sidebarOpen !== prev.sidebarOpen) {
      persistValue(storageKeys.sidebarOpen, String(state.sidebarOpen));
    }
  });
}

export function persistValue(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function persistObject(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function persistLibraries(state, storageKeys) {
  const ok = persistObject(storageKeys.libraries, state.libraries);

  if (!ok) {
    const compact = Object.fromEntries(
      Object.entries(state.libraries).map(([id, library]) => [
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
    persistObject(storageKeys.libraries, compact);
  }
}

export function loadInitialState() {
  const sidebarOpenSaved = localStorage.getItem(STORAGE_KEYS.sidebarOpen);
  const sidebarOpen = sidebarOpenSaved === null ? true : sidebarOpenSaved === 'true';
  
  return {
    view: 'home',
    search: '',
    sidebarOpen,
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
}

export function removeLegacyDemoState(state) {
  let changed = false;

  if (state.libraries.demo) {
    delete state.libraries.demo;
    changed = true;
  }

  if (state.favorites.demo) {
    delete state.favorites.demo;
    changed = true;
  }

  const filteredRecents = state.recents.filter((item) => item.accountId !== 'demo');
  if (filteredRecents.length !== state.recents.length) {
    state.recents = filteredRecents;
    changed = true;
  }

  const filteredProgress = Object.fromEntries(
    Object.entries(state.progress).filter(([, value]) => value.accountId !== 'demo')
  );

  if (Object.keys(filteredProgress).length !== Object.keys(state.progress).length) {
    state.progress = filteredProgress;
    changed = true;
  }

  if (state.activeAccountId === 'demo') {
    state.activeAccountId = state.accounts[0]?.id || '';
    changed = true;
  }

  return { state, changed };
}