import { formatClock } from './utils.js';

export function createPlayerController({ dom, getState, setState, closeModal }) {
  let hls = null;
  let playerControlsTimer = null;
  let lastProgressSave = 0;

  function playItem(item, onEnded, onProgress) {
    const player = dom.videoPlayer;

    dom.playerTitle.textContent = item.title;
    dom.playerMeta.textContent = [item.categoryName, item.year, item.progressLabel].filter(Boolean).join(' · ');

    player.pause();
    player.controls = false;
    player.playbackRate = Number(dom.playerSpeedSelect?.value || 1);

    if (hls) {
      hls.destroy();
      hls = null;
    }

    player.removeAttribute('src');
    player.load();

    const progress = getState().progress[item.id];
    const shouldResume = item.type !== 'channel' && item.type !== 'live';

    if (window.Hls && window.Hls.isSupported() && /\.m3u8($|\?)/i.test(item.url || '')) {
      hls = new window.Hls();
      setState({ hls });
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
      syncPlayerChrome();
    };

    player.play().catch(() => {
      showToast(dom, 'A reprodução foi bloqueada até você interagir com o player.');
    });

    setState({ currentPlayback: item });
    dom.playerSurface?.classList.add('show-controls');
    syncPlayerChrome();
    schedulePlayerControlsHide(2600);
  }

  function closePlayer() {
    closeModal?.('playerModal');
    const player = dom.videoPlayer;
    player.pause();

    if (hls) {
      hls.destroy();
      hls = null;
      setState({ hls: null });
    }

    player.removeAttribute('src');
    player.load();
    player.currentTime = 0;
    player.playbackRate = 1;

    if (dom.playerSpeedSelect) {
      dom.playerSpeedSelect.value = '1';
    }

    setState({ currentPlayback: null });
    clearTimeout(playerControlsTimer);
    dom.playerSurface?.classList.add('show-controls');
    syncPlayerChrome();
  }

  function togglePlayback() {
    const player = dom.videoPlayer;

    if (!player.currentSrc && !player.src) {
      return;
    }

    if (player.paused) {
      player.play().catch(() => {
        showToast(dom, 'Clique novamente para liberar a reprodução.');
      });
    } else {
      player.pause();
    }

    pingPlayerControls();
  }

  function seekBy(seconds) {
    const player = dom.videoPlayer;

    if (getState().currentPlayback?.type === 'channel') {
      return;
    }

    if (!Number.isFinite(player.duration) || !player.duration) {
      return;
    }

    player.currentTime = Math.max(0, Math.min(player.duration, player.currentTime + seconds));
    syncPlayerChrome();
  }

  function toggleMute() {
    const player = dom.videoPlayer;
    player.muted = !player.muted;

    if (!player.muted && player.volume === 0) {
      player.volume = 0.85;
    }

    syncPlayerChrome();
  }

  async function togglePictureInPicture() {
    const player = dom.videoPlayer;

    if (!document.pictureInPictureEnabled || !player) {
      showToast(dom, 'Picture-in-Picture não está disponível neste navegador.');
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await player.requestPictureInPicture();
      }
    } catch {
      showToast(dom, 'Não foi possível alternar o modo Picture-in-Picture.');
    }
  }

  async function toggleFullscreen() {
    const container = dom.playerSurface || dom.videoPlayer;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
      pingPlayerControls();
    } catch {
      showToast(dom, 'Não foi possível alternar a tela cheia.');
    }
  }

  function pingPlayerControls() {
    dom.playerSurface?.classList.add('show-controls');
    schedulePlayerControlsHide();
  }

  function schedulePlayerControlsHide(delay = 2200) {
    clearTimeout(playerControlsTimer);

    if (dom.videoPlayer.paused) {
      dom.playerSurface?.classList.add('show-controls');
      return;
    }

    playerControlsTimer = setTimeout(() => {
      dom.playerSurface?.classList.remove('show-controls');
    }, delay);
  }

  function syncPlayerChrome() {
    const player = dom.videoPlayer;
    const currentItem = getState().currentPlayback;
    const isLive = currentItem?.type === 'channel';
    const duration = !isLive && Number.isFinite(player.duration) ? player.duration : 0;
    const current = !isLive && Number.isFinite(player.currentTime) ? player.currentTime : 0;
    const percent = isLive ? 100 : (duration > 0 ? (current / duration) * 100 : 0);

    if (dom.playerSeek) {
      dom.playerSeek.value = String(percent || 0);
      dom.playerSeek.disabled = isLive || duration <= 0;
      dom.playerSeek.classList.toggle('is-live-track', isLive);
    }

    if (dom.playerCurrentTime) {
      dom.playerCurrentTime.textContent = isLive ? 'Canal' : formatClock(current);
    }

    if (dom.playerDuration) {
      dom.playerDuration.textContent = isLive ? 'Agora' : (duration > 0 ? formatClock(duration) : '00:00');
    }

    if (dom.playerLiveBadge) {
      dom.playerLiveBadge.classList.toggle('hidden', !isLive);
    }

    dom.playerSurface?.classList.toggle('is-live', isLive);

    if (dom.playerPlayPauseBtn) {
      const isPaused = player.paused;
      dom.playerPlayPauseBtn.dataset.state = isPaused ? 'paused' : 'playing';
      dom.playerPlayPauseBtn.textContent = isPaused ? 'Play' : 'Pausar';
    }

    if (dom.playerMuteBtn) {
      const isMuted = player.muted || player.volume === 0;
      dom.playerMuteBtn.dataset.state = isMuted ? 'muted' : 'on';
    }

    if (dom.playerVolume) {
      const currentVolume = player.muted ? 0 : Number(player.volume || 0);
      dom.playerVolume.value = String(currentVolume);
    }

    if (dom.playerBackBtn) {
      dom.playerBackBtn.disabled = isLive;
    }

    if (dom.playerForwardBtn) {
      dom.playerForwardBtn.disabled = isLive;
    }

    if (dom.playerVolume) {
      dom.playerVolume.value = String(player.muted ? 0 : player.volume);
    }

    dom.playerSurface?.classList.toggle('is-live', isLive);
    dom.playerSurface?.classList.toggle('is-playing', !player.paused);

    if (dom.playerFullscreenBtn) {
      const isFullscreen = !!document.fullscreenElement;
      dom.playerFullscreenBtn.textContent = isFullscreen ? 'Sair' : 'Tela cheia';
    }

    if (player.paused) {
      dom.playerSurface?.classList.add('show-controls');
    }
  }

  function handlePlaybackProgress(onPersist) {
    const current = getState().currentPlayback;
    const player = dom.videoPlayer;
    syncPlayerChrome();

    if (!current || current.type === 'channel') {
      return;
    }

    const now = Date.now();
    if (now - lastProgressSave < 1500) {
      return;
    }

    if (!Number.isFinite(player.currentTime) || player.currentTime < 1) {
      return;
    }

    lastProgressSave = now;
    const state = getState();
    state.progress[current.id] = {
      ...current,
      accountId: current.accountId || state.activeAccountId,
      updatedAt: Date.now(),
      currentTime: player.currentTime,
      duration: Number.isFinite(player.duration) ? player.duration : current.duration || 0
    };

    setState({ progress: state.progress });
    onPersist?.(state.progress);
  }

  function clearFinishedProgress(onPersist) {
    const current = getState().currentPlayback;

    if (!current) {
      return;
    }

    const state = getState();
    delete state.progress[current.id];
    setState({ progress: state.progress });
    onPersist?.(state.progress);
  }

  function showToast(dom, message) {
    dom.toast.textContent = message;
    dom.toast.classList.remove('hidden');
    clearTimeout(dom.toastTimer);
    dom.toastTimer = window.setTimeout(() => dom.toast.classList.add('hidden'), 3200);
  }

  function bindPlayerEvents(dom) {
    dom.videoPlayer.addEventListener('timeupdate', () => handlePlaybackProgress());
    dom.videoPlayer.addEventListener('ended', () => clearFinishedProgress());
    dom.videoPlayer.addEventListener('play', () => syncPlayerChrome());
    dom.videoPlayer.addEventListener('pause', () => syncPlayerChrome());
    dom.videoPlayer.addEventListener('loadedmetadata', () => syncPlayerChrome());
    dom.videoPlayer.addEventListener('durationchange', () => syncPlayerChrome());
    dom.videoPlayer.addEventListener('volumechange', () => syncPlayerChrome());
    dom.videoPlayer.addEventListener('click', () => togglePlayback());

    dom.playerSurface?.addEventListener('mousemove', () => pingPlayerControls());
    dom.playerSurface?.addEventListener('touchstart', () => pingPlayerControls(), { passive: true });
    dom.playerSurface?.addEventListener('mouseleave', () => schedulePlayerControlsHide(600));

    dom.playerPlayPauseBtn?.addEventListener('click', () => togglePlayback());
    dom.playerBackBtn?.addEventListener('click', () => seekBy(-10));
    dom.playerForwardBtn?.addEventListener('click', () => seekBy(10));
    dom.playerMuteBtn?.addEventListener('click', () => toggleMute());
    dom.playerVolume?.addEventListener('input', (event) => {
      dom.videoPlayer.volume = Number(event.target.value || 0);
      dom.videoPlayer.muted = dom.videoPlayer.volume === 0;
      syncPlayerChrome();
    });
    dom.playerSeek?.addEventListener('input', (event) => {
      if (getState().currentPlayback?.type === 'channel') {
        syncPlayerChrome();
        return;
      }

      const duration = dom.videoPlayer.duration || 0;
      if (duration > 0) {
        dom.videoPlayer.currentTime = (Number(event.target.value || 0) / 100) * duration;
      }
      syncPlayerChrome();
    });
    dom.playerSpeedSelect?.addEventListener('change', (event) => {
      dom.videoPlayer.playbackRate = Number(event.target.value || 1);
      showToast(dom, `Velocidade ajustada para ${event.target.value}x.`);
    });
    dom.playerPipBtn?.addEventListener('click', () => togglePictureInPicture());
    dom.playerFullscreenBtn?.addEventListener('click', () => toggleFullscreen());

    document.addEventListener('fullscreenchange', () => {
      pingPlayerControls();
      syncPlayerChrome();
    });
  }

  return {
    playItem,
    closePlayer,
    togglePlayback,
    seekBy,
    toggleMute,
    togglePictureInPicture,
    toggleFullscreen,
    syncPlayerChrome,
    handlePlaybackProgress,
    clearFinishedProgress,
    bindPlayerEvents
  };
}