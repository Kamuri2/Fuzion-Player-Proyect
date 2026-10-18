import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Video,
  SkipBack,
  SkipForward,
  RefreshCw,
  WifiOff,
  ListVideo,
  Check,
  X,
  ArrowLeft,
  Play,
  Pause,
  ExternalLink
} from 'lucide-react';
import { Song } from '../types';

interface VideoResult {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: string;
  channel?: string;
}

interface IntegratedVideoPlayerProps {
  song: Song;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  colors: {
    primary: string;
    text: string;
  };
}

// ---------------------------------------------------------------------------
// Configuración del <webview> de YouTube
// ---------------------------------------------------------------------------

// Debe coincidir con YT_PARTITION en src/main/index.ts
const YT_PARTITION = 'persist:youtube';

// User-Agent de Chrome limpio, derivado del Chromium real de Electron (sin "Electron/" ni el nombre de la app)
const WEBVIEW_USER_AGENT = navigator.userAgent
  .replace(/\s*Electron\/\S+/i, '')
  .replace(/\s*(fuzion-player|Fuzion ?Player)\/\S+/i, '');

// Atributos extra del <webview> (se pasan con spread para no depender de los tipos JSX del tag)
const WEBVIEW_EXTRA_PROPS = {
  partition: YT_PARTITION,
  webpreferences: 'autoplayPolicy=no-user-gesture-required'
};

// Marcadores que el script inyectado envía por console.log
const MSG_PLAY = '__FUZION_VIDEO_PLAY__';
const MSG_PAUSE = '__FUZION_VIDEO_PAUSE__';
const MSG_ENDED = '__FUZION_VIDEO_ENDED__';
const MSG_ERROR = '__FUZION_VIDEO_ERROR__';

// CSS que deja SOLO el reproductor a pantalla completa y oculta el resto de la página de YouTube.
// Si YouTube cambia su HTML y el layout se ve raro, comenta este CSS: la página normal sigue reproduciendo.
const HIDE_YOUTUBE_UI_CSS = `
  html, body { overflow: hidden !important; background: #000 !important; }

  ytd-masthead, #masthead-container, #secondary, #below, #comments, #related,
  tp-yt-app-drawer, ytd-mini-guide-renderer, ytd-miniplayer { display: none !important; }

  ytd-watch-flexy, ytd-page-manager, #page-manager, #columns, #primary, #primary-inner {
    contain: none !important;
    transform: none !important;
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  #player, #player-container-outer, #player-container-inner, #player-container,
  #ytd-player, #movie_player {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    max-height: none !important;
    background: #000 !important;
    z-index: 2147483000 !important;
  }

  .html5-video-container { width: 100% !important; height: 100% !important; }
  video.html5-main-video {
    width: 100% !important;
    height: 100% !important;
    left: 0 !important;
    top: 0 !important;
    object-fit: contain !important;
  }

  /* Sube la barra de controles nativa para que no quede debajo de la barra flotante de Fuzion Player */
  .ytp-chrome-bottom { bottom: 84px !important; }
`;

// Script que se ejecuta DENTRO de la página de YouTube: engancha el <video> y avisa por console.log
const PAGE_SCRIPT = `
(() => {
  if (window.__fuzionInit) return;
  window.__fuzionInit = true;
  const log = (m) => console.log(m);

  const hook = () => {
    const v = document.querySelector('video.html5-main-video') || document.querySelector('video');
    if (!v || v.__fuzionHooked) return;
    v.__fuzionHooked = true;
    v.addEventListener('play', () => log('${MSG_PLAY}'));
    v.addEventListener('pause', () => log('${MSG_PAUSE}'));
    v.addEventListener('ended', () => {
      const player = document.querySelector('.html5-video-player');
      // Ignora el fin de un anuncio
      if (player && player.classList.contains('ad-showing')) return;
      log('${MSG_ENDED}');
    });
    v.play().catch(() => {});
  };

  setInterval(() => {
    hook();
    if (document.querySelector('.ytp-error') && !window.__fuzionErr) {
      window.__fuzionErr = true;
      log('${MSG_ERROR}');
    }
  }, 700);
})();
`;

export default function IntegratedVideoPlayer({
  song,
  onClose,
  onNext,
  onPrevious,
  hasNext = true,
  hasPrevious = true,
  colors
}: IntegratedVideoPlayerProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null);
  const [showVideoSelector, setShowVideoSelector] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [playbackFailed, setPlaybackFailed] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Monitor connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Search video when song changes or when connectivity is restored
  useEffect(() => {
    if (!song) return;

    if (!isOnline) {
      setError(t('player.videoOffline', 'Se requiere conexión a internet para ver el video'));
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSelectedVideo(null);
    setVideos([]);
    setPlaybackFailed(false);

    const cleanTitle = (song.title || song.filename || '').replace(/\.[^/.]+$/, '');
    const cleanArtist = song.artist && song.artist !== 'Desconocido' ? song.artist : '';
    const query = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;

    const performSearch = async () => {
      try {
        const results = await window.api.searchYouTube(query);
        if (!isMounted) return;

        if (results && results.length > 0) {
          setVideos(results);
          setSelectedVideo(results[0]);
          setError(null);
        } else {
          // Fallback query with "official video"
          const fallbackResults = await window.api.searchYouTube(`${query} official music video`);
          if (!isMounted) return;

          if (fallbackResults && fallbackResults.length > 0) {
            setVideos(fallbackResults);
            setSelectedVideo(fallbackResults[0]);
            setError(null);
          } else {
            setError(t('player.videoSearchError', 'No se encontró ningún video para esta canción'));
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching YouTube video:', err);
        setError(t('player.videoSearchError', 'No se encontró ningún video para esta canción'));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    performSearch();

    return () => {
      isMounted = false;
    };
  }, [song.id, isOnline]);

  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const webviewRef = useRef<any>(null);

  // Refs con los valores más recientes, para usarlos dentro de los listeners del webview
  const onNextRef = useRef(onNext);
  const hasNextRef = useRef(hasNext);
  const videosRef = useRef<VideoResult[]>(videos);
  const selectedRef = useRef<VideoResult | null>(selectedVideo);

  useEffect(() => {
    onNextRef.current = onNext;
    hasNextRef.current = hasNext;
    videosRef.current = videos;
    selectedRef.current = selectedVideo;
  }, [onNext, hasNext, videos, selectedVideo]);

  useEffect(() => {
    setIsVideoPlaying(true);
    setPlaybackFailed(false);
  }, [selectedVideo?.id]);

  // Si un video falla, prueba el siguiente resultado de la búsqueda; si no quedan, muestra el aviso
  const tryNextCandidate = () => {
    const list = videosRef.current;
    const idx = list.findIndex((v) => v.id === selectedRef.current?.id);
    const next = idx >= 0 ? list[idx + 1] : undefined;
    if (next) {
      setSelectedVideo(next);
    } else {
      setPlaybackFailed(true);
    }
  };

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const handleDomReady = () => {
      wv.insertCSS?.(HIDE_YOUTUBE_UI_CSS)?.catch(() => { });
      wv.executeJavaScript?.(PAGE_SCRIPT)?.catch(() => { });
    };

    const handleConsoleMessage = (e: any) => {
      const msg: string = e.message ?? '';
      if (msg === MSG_PLAY) {
        setIsVideoPlaying(true);
      } else if (msg === MSG_PAUSE) {
        setIsVideoPlaying(false);
      } else if (msg === MSG_ENDED) {
        // Al terminar el video, pasa a la siguiente canción
        if (hasNextRef.current) onNextRef.current?.();
      } else if (msg === MSG_ERROR) {
        tryNextCandidate();
      }
    };

    const handleFailLoad = (e: any) => {
      // -3 = carga abortada (normal al cambiar de video); ignora errores de subframes
      if (e.errorCode === -3 || e.isMainFrame === false) return;
      tryNextCandidate();
    };

    wv.addEventListener('dom-ready', handleDomReady);
    wv.addEventListener('console-message', handleConsoleMessage);
    wv.addEventListener('did-fail-load', handleFailLoad);

    return () => {
      wv.removeEventListener('dom-ready', handleDomReady);
      wv.removeEventListener('console-message', handleConsoleMessage);
      wv.removeEventListener('did-fail-load', handleFailLoad);
    };
  }, [selectedVideo?.id, error]);

  const toggleVideoPlayback = () => {
    if (webviewRef.current) {
      const wv = webviewRef.current;
      const code = `
        (() => {
          const v = document.querySelector('video.html5-main-video') || document.querySelector('video');
          if (v) {
            if (v.paused) { v.play(); } else { v.pause(); }
            return !v.paused;
          }
          return false;
        })()
      `;
      wv.executeJavaScript?.(code)
        .then((isPlaying: boolean) => {
          setIsVideoPlaying(isPlaying);
        })
        .catch(() => {
          setIsVideoPlaying(!isVideoPlaying);
        });
    }
  };

  // Escape key to return to music
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-black select-none"
    >
      {/* Ambient background glow from video thumbnail or cover */}
      <div
        className="absolute inset-0 z-0 opacity-25 blur-3xl scale-125 pointer-events-none transition-all duration-1000"
        style={{
          backgroundImage: selectedVideo?.thumbnail
            ? `url(${selectedVideo.thumbnail})`
            : song.cover
              ? `url(${song.cover})`
              : 'none',
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      />

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <div className="relative flex items-center justify-center mb-6">
              <div
                className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: `${colors.primary} transparent transparent transparent` }}
              />
              <Video size={28} className="absolute text-white animate-pulse" />
            </div>
            <p className="text-lg font-bold text-white mb-2">
              {t('player.searchingVideo', 'Buscando video...')}
            </p>
            <p className="text-xs text-white/50 max-w-sm text-center px-4">
              {t('player.searchingVideoDesc', 'Buscando la mejor coincidencia en YouTube...')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error / Offline State */}
      <AnimatePresence>
        {!loading && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 bg-black/90 backdrop-blur-xl text-center"
          >
            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
              <WifiOff size={40} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {error}
            </h3>
            <p className="text-sm text-white/60 mb-6 max-w-md">
              {!isOnline
                ? t('player.videoOffline', 'Se requiere conexión a internet para ver el video')
                : t('player.videoSearchError', 'No se encontró ningún video para esta canción')}
            </p>
            <div className="flex flex-row items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all cursor-pointer"
              >
                <ArrowLeft size={18} />
                <span>{t('player.back', 'Volver')}</span>
              </button>
              {isOnline && (
                <button
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    window.api.searchYouTube(`${song.artist || ''} ${song.title || song.filename}`)
                      .then((res) => {
                        if (res && res.length > 0) {
                          setVideos(res);
                          setSelectedVideo(res[0]);
                          setError(null);
                        } else {
                          setError(t('player.videoSearchError', 'No se encontró ningún video para esta canción'));
                        }
                      })
                      .catch(() => setError(t('player.videoSearchError', 'No se encontró ningún video para esta canción')))
                      .finally(() => setLoading(false));
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-black font-bold text-sm transition-all shadow-lg hover:brightness-110 cursor-pointer"
                  style={{ backgroundColor: colors.primary }}
                >
                  <RefreshCw size={18} />
                  <span>{t('settings.reset', 'Reintentar')}</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Integrated Video Player via Webview (página oficial de YouTube, UI oculta con CSS) */}
      {selectedVideo && !error && (
        <div className="absolute inset-0 z-10 w-full h-full flex items-center justify-center overflow-hidden bg-black">
          <webview
            ref={webviewRef}
            key={selectedVideo.id}
            src={`https://www.youtube.com/watch?v=${selectedVideo.id}`}
            allowpopups={true}
            httpreferrer="https://www.youtube.com/"
            useragent={WEBVIEW_USER_AGENT}
            className="w-full h-full border-none pointer-events-auto"
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              outline: 'none'
            }}
            {...(WEBVIEW_EXTRA_PROPS as any)}
          />
        </div>
      )}

      {/* Aviso cuando ningún video de la búsqueda se pudo reproducir */}
      <AnimatePresence>
        {playbackFailed && !error && selectedVideo && (
          <motion.div
            key="playback-failed"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-black/85 border border-white/15 backdrop-blur-xl text-center max-w-sm"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <p className="text-sm font-semibold text-white">
              {t('player.videoPlaybackFailed', 'No se pudo reproducir este video aquí')}
            </p>
            <div className="flex flex-row items-center gap-2">
              <button
                onClick={() => window.api.openExternal(`https://www.youtube.com/watch?v=${selectedVideo.id}`)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-black font-bold text-xs hover:brightness-110 cursor-pointer"
                style={{ backgroundColor: colors.primary }}
              >
                <ExternalLink size={14} />
                <span>{t('player.openInYouTube', 'Abrir en YouTube')}</span>
              </button>
              {videos.length > 1 && (
                <button
                  onClick={() => setShowVideoSelector(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-xs cursor-pointer"
                >
                  <ListVideo size={14} />
                  <span>{t('player.availableVideos', 'Videos disponibles')}</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seamless Integrated Floating Top Bar - Always accessible with no-drag */}
      <div
        className="absolute top-0 left-0 right-0 z-40 p-4 md:p-6 flex flex-row items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-auto"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {/* Left: Back button, Video Tag & Song Info */}
        <div className="flex items-center gap-3 min-w-0 pr-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className="p-2.5 rounded-full bg-black/60 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            title={t('player.back', 'Volver')}
          >
            <ArrowLeft size={20} />
          </button>
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-lg shrink-0"
            style={{ backgroundColor: `${colors.primary}25`, color: colors.primary, border: `1px solid ${colors.primary}50` }}
          >
            <Video size={14} />
            <span>{t('player.videoMode', 'Modo Video')}</span>
          </div>
          <div className="flex flex-col truncate">
            <span className="text-white font-bold text-sm truncate">
              {selectedVideo?.title || song.title || song.filename}
            </span>
            <span className="text-white/60 text-xs truncate">
              {selectedVideo?.channel || song.artist || ''}
            </span>
          </div>
        </div>

        {/* Right: External Link & Available Videos selector */}
        <div className="flex items-center gap-2 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {selectedVideo && (
            <button
              onClick={() => {
                window.api.openExternal(`https://www.youtube.com/watch?v=${selectedVideo.id}`);
              }}
              style={{ WebkitAppRegion: 'no-drag' } as any}
              className="p-2 rounded-full bg-black/60 hover:bg-white/20 text-white/80 hover:text-white backdrop-blur-md border border-white/10 transition-all shadow-md cursor-pointer"
              title={t('player.openInYouTube', 'Abrir en YouTube')}
            >
              <ExternalLink size={16} />
            </button>
          )}

          {videos.length > 1 && (
            <button
              onClick={() => setShowVideoSelector(!showVideoSelector)}
              style={{ WebkitAppRegion: 'no-drag' } as any}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-md cursor-pointer ${showVideoSelector
                  ? 'bg-white text-black'
                  : 'bg-black/60 text-white/80 hover:text-white hover:bg-white/20 border border-white/10'
                }`}
              title={t('player.availableVideos', 'Videos disponibles')}
            >
              <ListVideo size={16} />
              <span className="hidden sm:inline">{t('player.availableVideos', 'Videos')}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {videos.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Seamless Integrated Floating Bottom Navigation Bar (Prev / Play-Pause / Next) */}
      <div
        className="absolute bottom-0 left-0 right-0 z-40 p-4 md:p-6 flex flex-row items-center justify-center gap-6 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-auto"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {onPrevious && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrevious();
            }}
            disabled={!hasPrevious}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className="p-3 rounded-full bg-black/70 hover:bg-white/20 text-white disabled:opacity-30 disabled:pointer-events-none backdrop-blur-md border border-white/10 transition-all active:scale-95 shadow-lg cursor-pointer"
            title="Canción anterior"
          >
            <SkipBack size={24} fill="currentColor" />
          </button>
        )}

        {/* Central Play/Pause button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleVideoPlayback();
          }}
          style={{
            WebkitAppRegion: 'no-drag',
            backgroundColor: colors.primary,
            color: '#000000'
          } as any}
          className="p-4 rounded-full hover:scale-105 active:scale-95 shadow-2xl transition-all cursor-pointer flex items-center justify-center hover:brightness-110"
          title={isVideoPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isVideoPlaying ? (
            <Pause size={28} fill="currentColor" />
          ) : (
            <Play size={28} fill="currentColor" className="ml-1" />
          )}
        </button>

        {onNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            disabled={!hasNext}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className="p-3 rounded-full bg-black/70 hover:bg-white/20 text-white disabled:opacity-30 disabled:pointer-events-none backdrop-blur-md border border-white/10 transition-all active:scale-95 shadow-lg cursor-pointer"
            title="Siguiente canción"
          >
            <SkipForward size={24} fill="currentColor" />
          </button>
        )}
      </div>

      {/* Alternative Videos Selector Modal / Flyout */}
      <AnimatePresence>
        {showVideoSelector && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute top-20 right-4 md:right-8 z-50 w-80 md:w-96 max-h-[70vh] flex flex-col bg-[#18181b]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListVideo size={18} style={{ color: colors.primary }} />
                <h4 className="font-bold text-white text-sm">
                  {t('player.availableVideos', 'Videos disponibles')}
                </h4>
              </div>
              <button
                onClick={() => setShowVideoSelector(false)}
                className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-2 flex flex-col gap-2 max-h-[55vh]">
              {videos.map((vid) => {
                const isCurrent = vid.id === selectedVideo?.id;
                return (
                  <button
                    key={vid.id}
                    onClick={() => {
                      setSelectedVideo(vid);
                      setShowVideoSelector(false);
                    }}
                    className={`flex flex-row items-center gap-3 p-2.5 rounded-xl text-left transition-all ${isCurrent
                        ? 'bg-white/15 border border-white/20 shadow-md'
                        : 'hover:bg-white/10 border border-transparent'
                      }`}
                  >
                    <div className="relative w-20 h-12 rounded-lg overflow-hidden shrink-0 bg-black/50">
                      {vid.thumbnail ? (
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30">
                          <Video size={16} />
                        </div>
                      )}
                      {vid.duration && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-1 rounded font-mono">
                          {vid.duration}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold line-clamp-2 ${isCurrent ? 'text-white' : 'text-white/80'}`}>
                        {vid.title}
                      </p>
                      {vid.channel && (
                        <p className="text-[11px] text-white/50 truncate mt-0.5">
                          {vid.channel}
                        </p>
                      )}
                    </div>

                    {isCurrent && (
                      <div className="shrink-0 p-1 rounded-full" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>
                        <Check size={16} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}