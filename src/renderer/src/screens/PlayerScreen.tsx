import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, ListMusic, Mic2, Heart, Plus, ThumbsDown, FolderOpen, Disc3, Mic2 as Mic2Icon, Menu } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import CoverImage from '../components/CoverImage';
import QueuePanel from '../components/QueuePanel';
import LyricsView from '../components/LyricsView';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import PlaylistCreateModal from '../components/PlaylistCreateModal';

const MarqueeText = ({ text, className }: { text: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.offsetWidth > containerRef.current.clientWidth);
      }
    };
    checkOverflow();
    const t = setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  if (!isOverflowing) {
    return (
      <div ref={containerRef} className={`overflow-hidden whitespace-nowrap w-full ${className}`}>
        <span ref={textRef} className="inline-block">{text}</span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden whitespace-nowrap flex flex-row w-full ${className}`} style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent)' }}>
      <div className="flex animate-marquee-text shrink-0">
        <span className="pr-16">{text}</span>
      </div>
      <div className="flex animate-marquee-text shrink-0">
        <span className="pr-16">{text}</span>
      </div>
    </div>
  );
};

const LazyMiniListItem = ({ item, type, onClick, isPlayingThis }: any) => {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setInView(entries[0].isIntersecting);
      },
      { rootMargin: '300px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  const isArtist = type === 'artist';
  const isFolder = type === 'folder';
  const isSong = type === 'song';

  return (
    <div 
      ref={ref} 
      onClick={onClick} 
      className={`flex flex-row items-center gap-3 p-2 rounded-lg cursor-pointer ${isPlayingThis ? 'bg-white/20' : 'hover:bg-white/10'}`}
    >
      <div className={`${isSong ? 'w-8 h-8' : 'w-10 h-10'} overflow-hidden shrink-0 flex items-center justify-center ${isFolder ? 'bg-white/10' : ''} ${isArtist ? 'rounded-full bg-white/10' : 'rounded'}`}>
        {inView ? (
          isFolder ? (
            <FolderOpen size={20} className="text-white/70" />
          ) : (
            <CoverImage coverUrl={item.cover} audioPath={item.audioPath} hq={true} className="w-full h-full object-cover" iconSize={isSong ? 16 : 20} />
          )
        ) : null}
      </div>
      <div className="flex flex-col truncate">
        <span className={`text-sm font-bold truncate ${isPlayingThis ? 'text-green-400' : 'text-white'} ${isSong ? 'text-xs' : ''}`}>{item.title}</span>
        <span className={`${isSong ? 'text-[10px]' : 'text-xs'} text-white/50 truncate`}>{item.subtitle}</span>
      </div>
    </div>
  );
};

let hasRunInitialLeftPanelTimer = false;
let savedLeftPanelState = true;
let savedActiveMiniTab: 'playlists' | 'folders' | 'albums' | 'artists' = 'playlists';
let savedMiniDetail: {type: 'playlist'|'folder'|'album'|'artist', id: string, name: string} | null = null;

export default function PlayerScreen() {
  const { colors, isFullMode } = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(savedLeftPanelState);
  
  // Guardar estado cada vez que cambie
  useEffect(() => {
    savedLeftPanelState = isLeftPanelOpen;
  }, [isLeftPanelOpen]);
  const [isIdle, setIsIdle] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [activeMiniTab, setActiveMiniTab] = useState<'playlists' | 'folders' | 'albums' | 'artists'>(savedActiveMiniTab);
  const [miniDetail, setMiniDetail] = useState<{type: 'playlist'|'folder'|'album'|'artist', id: string, name: string} | null>(savedMiniDetail);

  useEffect(() => {
    savedActiveMiniTab = activeMiniTab;
  }, [activeMiniTab]);

  useEffect(() => {
    savedMiniDetail = miniDetail;
  }, [miniDetail]);
  const {
    currentSong,
    metadata,
    isPlaying,
    pauseOrResumeSound,
    playNext,
    playPrevious,
    progress,
    duration,
    seekTo,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeatMode,
    setIsPlayerOpen,
    currentContextId,
    playlists,
    folders,
    albums,
    artists,
    songs,
    showLyrics,
    setShowLyrics,
    queue,
    queuePosition,
    playSound,
    toggleFavorite,
    isFavorite
  } = useAudio();

  const leftPanelTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startLeftPanelTimer = () => {
    if (leftPanelTimerRef.current) clearTimeout(leftPanelTimerRef.current);
    leftPanelTimerRef.current = setTimeout(() => {
      setIsLeftPanelOpen(false);
    }, 4000);
  };

  const cancelLeftPanelTimer = () => {
    if (leftPanelTimerRef.current) clearTimeout(leftPanelTimerRef.current);
  };

  // Auto-hide left panel in Full Mode solo la primera vez y manejado por inactividad
  useEffect(() => {
    if (isFullMode && !hasRunInitialLeftPanelTimer) {
      hasRunInitialLeftPanelTimer = true;
      setIsLeftPanelOpen(true);
      startLeftPanelTimer();
    }
    return () => cancelLeftPanelTimer();
  }, [isFullMode]);

  // Efecto de inactividad: la portada central crece después de 2 segundos si está reproduciendo
  useEffect(() => {
    setIsIdle(false);
    
    if (isPlaying && currentSong) {
      const timer = setTimeout(() => {
        setIsIdle(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [currentSong?.id, isPlaying]);

  if (!currentSong) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl font-bold" style={{ color: colors.text }}>{t('home.noResults')}</p>
        <button
          onClick={() => setIsPlayerOpen(false)}
          className="mt-4 px-6 py-2 rounded-full font-bold"
          style={{ backgroundColor: colors.primary, color: '#000' }}
        >
          {t('player.back', 'Volver')}
        </button>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(Number(e.target.value));
  };

  const renderMiniPanelList = () => {
    if (miniDetail) {
      // Render detail view
      let detailSongs: any[] = [];
      let headerTitle = miniDetail.name;
      let contextPrefix = '';
      let headerCover: string | null | undefined = undefined;

      if (miniDetail.type === 'playlist') {
        const p = playlists.find(pl => pl.id === miniDetail.id);
        if (p) {
          detailSongs = songs.filter(s => p.songIds.includes(s.id));
          headerTitle = p.name;
          contextPrefix = 'playlist:';
          headerCover = p.cover;
        }
      } else if (miniDetail.type === 'folder') {
        const f = folders[miniDetail.id];
        if (f) {
          detailSongs = f.songs || [];
          headerTitle = f.name;
          contextPrefix = 'folder:';
        }
      } else if (miniDetail.type === 'album') {
        const a = albums[miniDetail.id];
        if (a) {
          detailSongs = a.songs || [];
          headerTitle = a.name;
          contextPrefix = 'album:';
          headerCover = a.cover;
        }
      } else if (miniDetail.type === 'artist') {
        const a = artists[miniDetail.id];
        if (a) {
          detailSongs = a.songs || [];
          headerTitle = a.name;
          contextPrefix = 'artist:';
          headerCover = a.cover;
        }
      }

      if (!headerCover && detailSongs.length > 0) {
        headerCover = detailSongs[0].cover;
      }

      return (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="relative flex flex-col mb-2 w-full shrink-0">
            <div className="absolute inset-0 z-0 overflow-hidden bg-black/40">
              <CoverImage coverUrl={headerCover} audioPath={detailSongs[0]?.path} hq={true} className="w-full h-full object-cover opacity-60 blur-lg scale-110" iconSize={20} />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90" />
            </div>
            
            <div className="relative z-10 flex flex-col p-4 pt-6">
              <div className="flex flex-row items-center mb-3 cursor-pointer text-white/70 hover:text-white w-fit" onClick={() => setMiniDetail(null)}>
                <ArrowLeft size={16} className="mr-2" />
                <span className="text-xs font-bold uppercase tracking-widest">{t('player.back', 'Volver')}</span>
              </div>
              <div className="flex flex-row items-end gap-3 mt-2">
                <div className="w-24 h-24 rounded-md shadow-2xl overflow-hidden shrink-0 bg-black/40">
                  <CoverImage coverUrl={headerCover} audioPath={detailSongs[0]?.path} hq={true} className="w-full h-full object-cover" iconSize={32} />
                </div>
                <div className="flex flex-col overflow-hidden pb-1">
                  <span className="text-[10px] uppercase font-black text-white/70 tracking-widest mb-1">{miniDetail.type}</span>
                  <span className="text-2xl font-black text-white truncate leading-none">{headerTitle}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto w-full px-2 pb-24">
            {detailSongs.map((s) => {
              const isPlayingThis = currentSong?.id === s.id;
              return (
                <LazyMiniListItem
                  key={s.id}
                  onClick={() => playSound(s, `${contextPrefix}${miniDetail.id}`, detailSongs)}
                  type="song"
                  isPlayingThis={isPlayingThis}
                  item={{
                    cover: s.cover,
                    audioPath: s.path,
                    title: s.title,
                    subtitle: s.artist
                  }}
                  t={t}
                />
              );
            })}
          </div>
        </div>
      );
    }

    if (activeMiniTab === 'playlists') {
      return (
        <div className="flex flex-col gap-2 overflow-y-auto w-full pr-2 pb-24">
          {playlists.map((p) => (
            <LazyMiniListItem
              key={p.id}
              onClick={() => setMiniDetail({type: 'playlist', id: p.id, name: p.name})}
              type="playlist"
              item={{
                cover: p.cover,
                audioPath: undefined,
                title: p.name,
                subtitle: `${p.songIds.length} ${t('detail.songs')}`
              }}
              t={t}
            />
          ))}
        </div>
      );
    }
    if (activeMiniTab === 'folders') {
      return (
        <div className="flex flex-col gap-2 overflow-y-auto w-full pr-2 pb-24">
          {Object.values(folders || {}).map((f: any) => (
            <LazyMiniListItem
              key={f.name}
              onClick={() => setMiniDetail({type: 'folder', id: f.name, name: f.name})}
              type="folder"
              item={{
                title: f.name,
                subtitle: `${f.songs?.length || 0} ${t('detail.songs')}`
              }}
              t={t}
            />
          ))}
        </div>
      );
    }
    if (activeMiniTab === 'albums') {
      return (
        <div className="flex flex-col gap-2 overflow-y-auto w-full pr-2 pb-24">
          {Object.values(albums || {}).map((a: any) => (
            <LazyMiniListItem
              key={a.name}
              onClick={() => setMiniDetail({type: 'album', id: a.name, name: a.name})}
              type="album"
              item={{
                cover: a.cover,
                audioPath: a.songs?.[0]?.path,
                title: a.name,
                subtitle: a.artist
              }}
              t={t}
            />
          ))}
        </div>
      );
    }
    if (activeMiniTab === 'artists') {
      return (
        <div className="flex flex-col gap-2 overflow-y-auto w-full pr-2 pb-24">
          {Object.values(artists || {}).map((a: any) => (
            <LazyMiniListItem
              key={a.name}
              onClick={() => setMiniDetail({type: 'artist', id: a.name, name: a.name})}
              type="artist"
              item={{
                cover: a.cover,
                audioPath: a.songs?.[0]?.path,
                title: a.name,
                subtitle: `${a.songs?.length || 0} ${t('detail.songs')}`
              }}
              t={t}
            />
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-screen relative overflow-hidden bg-[#121212] select-none">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <CoverImage
          coverUrl={currentSong?.cover}
          audioPath={currentSong?.path}
          hq={true}
          className="w-full h-full object-cover opacity-80 blur-[80px] animate-gradient-move origin-center scale-110"
        />
        {/* Totalmente transparente a petición del usuario */}
        <div className="absolute inset-0 bg-transparent" />
      </div>

      <div className="flex-1 flex flex-row relative z-10 min-h-0 w-full">
        {/* Floating Top Left Controls */}
        <div className="absolute top-0 left-0 p-6 z-40 group flex flex-row gap-4 items-center h-20">
            {/* The back button appears only on hover or if not full mode */}
            {(!isFullMode || !isLeftPanelOpen) && (
              <button onClick={() => setIsPlayerOpen(false)} style={{ WebkitAppRegion: 'no-drag' } as any} className={`p-3 rounded-full bg-black/50 hover:bg-white/10 text-white transition-all shadow-xl ${isFullMode ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                <ArrowLeft size={28} />
              </button>
            )}
            {/* Menu button to open the left panel */}
            {isFullMode && !isLeftPanelOpen && (
              <button onClick={() => { setIsLeftPanelOpen(true); startLeftPanelTimer(); }} style={{ WebkitAppRegion: 'no-drag' } as any} className="p-3 rounded-full bg-black/50 hover:bg-white/10 text-white transition-all shadow-xl">
                <Menu size={28} />
              </button>
            )}
        </div>

        {/* Left Navigation Pane (Triptych Left Column) */}
        {isFullMode && (
          <div 
            onMouseEnter={cancelLeftPanelTimer}
            onMouseLeave={startLeftPanelTimer}
            className={`absolute top-0 bottom-0 left-0 z-30 transition-all duration-500 ease-in-out border-r border-white/5 backdrop-blur-md overflow-hidden bg-black/40 ${isLeftPanelOpen ? 'translate-x-0 w-[340px] opacity-100' : '-translate-x-full w-0 opacity-0'}`}
          >
            <div className="w-[340px] h-full flex flex-col pt-6">
              <div className="flex flex-row items-center justify-between mb-4 pb-4 px-4 border-b border-white/10 shrink-0">
                <button onClick={() => { setActiveMiniTab('playlists'); setMiniDetail(null); }} className={`p-2 rounded-lg ${activeMiniTab === 'playlists' ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/70 hover:text-white'}`} title={t('sidebar.playlists')}>
                  <ListMusic size={20} />
                </button>
                <button onClick={() => { setActiveMiniTab('folders'); setMiniDetail(null); }} className={`p-2 rounded-lg ${activeMiniTab === 'folders' ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/70 hover:text-white'}`} title={t('sidebar.folders')}>
                  <FolderOpen size={20} />
                </button>
                <button onClick={() => { setActiveMiniTab('albums'); setMiniDetail(null); }} className={`p-2 rounded-lg ${activeMiniTab === 'albums' ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/70 hover:text-white'}`} title={t('sidebar.albums')}>
                  <Disc3 size={20} />
                </button>
                <button onClick={() => { setActiveMiniTab('artists'); setMiniDetail(null); }} className={`p-2 rounded-lg ${activeMiniTab === 'artists' ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/70 hover:text-white'}`} title={t('sidebar.artists')}>
                  <Mic2Icon size={20} />
                </button>
              </div>
              {renderMiniPanelList()}
            </div>
          </div>
        )}

        {/* Main Content Area (100% width, inherently perfectly centered) */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          {/* Header */}
          <div className="relative z-10 flex flex-row items-center justify-between px-8 py-6 shrink-0 h-20 pointer-events-auto">
            <div className="text-center w-full flex-1">
              <p className="text-xs font-bold text-white/50 tracking-widest uppercase">
                {t('player.playingFrom', 'Reproduciendo desde')} {(() => {
                  if (!currentContextId || currentContextId === 'all') return t('sidebar.home', 'tu música');
                  if (currentContextId === 'queue') return 'Queue';
                  if (currentContextId === 'favorites') return t('sidebar.favorites', 'tus favoritos');
                  if (currentContextId.startsWith('album:')) return `${t('albums.title', 'Álbum')} • ${currentContextId.split('album:')[1]}`;
                  if (currentContextId.startsWith('artist:')) return `${t('artists.title', 'Artista')} • ${currentContextId.split('artist:')[1]}`;
                  if (currentContextId.startsWith('folder:')) return `${t('folders.title', 'Carpeta')} • ${currentContextId.split('folder:')[1]}`;
                  if (currentContextId.startsWith('playlist:')) {
                    const pId = currentContextId.split('playlist:')[1];
                    const p = playlists.find(pl => pl.id === pId);
                    return `${t('playlists.title', 'Playlist')} • ${p ? p.name : 'Unknown'}`;
                  }
                  return t('sidebar.home', 'tu música');
                })()}
              </p>
            </div>
          </div>

          {/* Main Split Area (Flex-1) */}
          <div className={`relative z-10 flex-1 min-h-0 flex flex-row items-center justify-center px-8 w-full mx-auto transition-all duration-500 ease-in-out pointer-events-auto ${isFullMode ? 'gap-8' : 'gap-0'}`}>

            {/* Cover Art Area (Cover Flow / Center) */}
            <div
          className={`flex flex-col items-center justify-center transition-all duration-500 ease-in-out h-full overflow-visible ${
            isFullMode 
              ? (showLyrics ? 'hidden' : 'flex-1') // In Full Mode, completely hide cover if lyrics are shown
              : (showLyrics && isQueueOpen ? 'w-0 opacity-0 scale-90 hidden' : showLyrics || isQueueOpen ? 'w-[45%] opacity-100 scale-100 flex-none' : 'w-full opacity-100 scale-100')
            }`}
          style={{ perspective: 1200 }}
        >
          <div className="relative w-full h-full flex items-center justify-center perspective-[1200px]">
            <AnimatePresence mode="popLayout" initial={false}>
              {(() => {
                if (isFullMode) {
                  // In Full Mode, NO CAROUSEL. Just show current cover in the center.
                  return (
                    <motion.div
                      key={currentSong.id}
                      className="absolute h-[75%] md:h-[90%] max-h-[800px] aspect-square rounded-2xl"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: isIdle ? 1.05 : 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "tween", ease: "easeInOut", duration: 0.35 }}
                    >
                      <CoverImage
                        coverUrl={currentSong.cover}
                        audioPath={currentSong.path}
                        hq={true}
                        className="w-full h-full object-cover rounded-2xl shadow-2xl"
                        iconSize={64}
                      />
                    </motion.div>
                  );
                }

                // Normal Mode (Carousel)
                const currentIndex = queuePosition - 1;
                const items: { song: any; offset: number }[] = [];
                const showOnlyCenter = showLyrics || isQueueOpen;
                const minOffset = showOnlyCenter ? 0 : -2;
                const maxOffset = showOnlyCenter ? 0 : 2;

                for (let offset = minOffset; offset <= maxOffset; offset++) {
                  let index = currentIndex + offset;
                  if (repeatMode === 'queue' && queue.length > 0) {
                    index = (index % queue.length + queue.length) % queue.length;
                  }
                  if (index >= 0 && index < queue.length) {
                    items.push({ song: queue[index], offset });
                  }
                }

                return items.map(({ song, offset }) => {
                  const isCenter = offset === 0;
                  const absOffset = Math.abs(offset);
                  const zIndex = 10 - absOffset;
                  
                  // Escala visual y desplazamiento (aquí ajustas la separación)
                  const scale = isCenter ? (isIdle ? 1.15 : 1) : 1 - (absOffset * 0.15);
                  const translateX = offset * 40; // Menor separación para centrar más las portadas
                  const rotateY = offset === 0 ? 0 : offset < 0 ? 55 : -55; // Ángulo de inclinación 3D suavizado
                  const opacity = isCenter ? 1 : 1 - (absOffset * 0.3);

                  return (
                    <motion.div
                      key={song.id}
                      // Forzamos el tamaño máximo basado en la altura disponible para evitar recortes verticales
                      className={`absolute ${isFullMode ? 'h-[75%] md:h-[90%] max-h-[800px]' : 'h-[75%] md:h-[85%] max-h-[640px]'} aspect-square rounded-2xl cursor-pointer ${isCenter ? '' : 'pointer-events-auto'}`}
                      initial={{ opacity: 0, x: `${translateX + (offset > 0 ? 20 : -20)}%`, scale: isCenter ? 1 : scale * 0.9, rotateY: rotateY * 1.5 }}
                      animate={{
                        opacity,
                        x: `${translateX}%`,
                        scale,
                        rotateY,
                        zIndex
                      }}
                      exit={{ opacity: 0, scale: scale * 0.9 }}
                      transition={{ type: "tween", ease: "easeInOut", duration: 0.35 }}
                      style={{
                        zIndex,
                        transformStyle: 'preserve-3d'
                      }}
                      onClick={() => {
                        if (!isCenter) playSound(song, currentContextId, undefined, undefined, false);
                      }}
                    >
                      <CoverImage
                        coverUrl={song.cover}
                        audioPath={song.path}
                        hq={true}
                        className="w-full h-full object-cover rounded-2xl"
                        iconSize={isCenter ? 64 : 32}
                      />
                      {!isCenter && (
                        <div className="absolute inset-0 bg-black/40 rounded-2xl transition-opacity hover:bg-black/20" />
                      )}
                    </motion.div>
                  );
                });
              })()}
            </AnimatePresence>
          </div>
        </div>

        {/* Lyrics Area */}
        <div
          className={`flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ease-in-out h-full ${
            isFullMode 
              ? (showLyrics ? 'flex-1 opacity-100' : 'hidden') // In Full Mode, take center if toggled
              : (showLyrics ? 'w-[45%] flex-none opacity-100 translate-x-0' : 'w-0 opacity-0 flex-none translate-x-4')
            }`}
        >
          <div className="w-full h-full min-w-[300px]">
            <LyricsView />
          </div>
        </div>

            {/* Queue Area */}
            <div
              className={`flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ease-in-out ${
                isFullMode 
                  ? `fixed right-0 top-0 bottom-0 z-40 bg-[#121212] border-l border-white/5 shadow-2xl ${isQueueOpen ? 'w-[340px] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full pointer-events-none'}`
                  : (isQueueOpen ? 'w-[45%] flex-none opacity-100 py-4 h-full translate-x-0 relative' : 'w-0 opacity-0 h-full flex-none py-4 translate-x-4 relative')
                }`}
            >
              <div className={`${isFullMode ? 'w-[340px]' : 'w-full max-w-md'} h-full`}>
                <QueuePanel isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
              </div>
            </div>

          </div>

          {/* Bottom Controls Area */}
          <div className="relative z-10 w-full max-w-4xl mx-auto px-8 flex flex-col pb-8">
            {/* Track Info */}
            <div className="w-full flex flex-row items-center justify-between mb-6">
          <div className="flex flex-col flex-1 overflow-hidden pr-4">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={currentSong?.id || 'empty'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
                className="w-full"
              >
                <MarqueeText 
                  text={currentSong.title || currentSong.filename.replace(/\.[^/.]+$/, "")}
                  className="text-3xl font-black text-white mb-1"
                />
                <p 
                  className="text-lg font-medium text-white/70 truncate cursor-pointer hover:underline hover:text-white transition-colors w-fit"
                  onClick={() => {
                    setIsPlayerOpen(false);
                    navigate(`/detail/artist/${encodeURIComponent(currentSong.artist || 'Desconocido')}`);
                  }}
                >
                  {currentSong.artist || 'Desconocido'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex flex-row gap-2">
            <button
              onClick={() => {
                if (currentSong) {
                  toggleFavorite(currentSong.id);
                }
              }}
              className="p-3 rounded-full transition-colors hover:bg-white/10"
              title={t('player.like', 'Me gusta')}
            >
              <Heart size={24} fill={currentSong && isFavorite(currentSong.id) ? colors.primary : 'none'} color={currentSong && isFavorite(currentSong.id) ? colors.primary : 'rgba(255,255,255,0.7)'} />
            </button>
            <button
              onClick={() => playNext()}
              className="p-3 rounded-full transition-colors hover:bg-white/10 text-white/70 hover:text-white"
              title={t('player.dislike', 'No me gusta (Saltar)')}
            >
              <ThumbsDown size={24} />
            </button>
            <button
              onClick={() => setIsAddToPlaylistOpen(true)}
              className="p-3 rounded-full transition-colors hover:bg-white/10 text-white/70 hover:text-white"
              title={t('player.addToPlaylist', 'Añadir a playlist')}
            >
              <Plus size={24} />
            </button>
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              className={`p-3 rounded-full transition-colors ${showLyrics ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}
              title="Letras"
              style={{ color: showLyrics ? colors.primary : undefined }}
            >
              <Mic2 size={24} />
            </button>
            <button
              onClick={() => setIsQueueOpen(!isQueueOpen)}
              className={`p-3 rounded-full transition-colors ${isQueueOpen ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}
              title="Queue"
              style={{ color: isQueueOpen ? colors.primary : undefined }}
            >
              <ListMusic size={24} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full mb-6">
          <div className="flex flex-row items-center gap-4 w-full group">
            <span className="text-xs font-medium text-white/70 w-10 text-right">{formatTime(progress)}</span>

            <div className="flex-1 relative flex items-center h-4 cursor-pointer">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden absolute z-0 pointer-events-none">
                <div
                  className="h-full transition-all duration-75 ease-linear group-hover:bg-green-500"
                  style={{
                    width: `${(progress / (duration || 1)) * 100}%`,
                    backgroundColor: colors.primary
                  }}
                />
              </div>
              <div
                className="w-3 h-3 bg-white rounded-full absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-none"
                style={{ left: `calc(${(progress / (duration || 1)) * 100}% - 6px)` }}
              />
            </div>

            <span className="text-xs font-medium text-white/70 w-10 text-left">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex flex-row items-center justify-center gap-6 md:gap-10 w-full">
          <button
            className="p-2 transition-colors relative"
            onClick={toggleShuffle}
            style={{ color: isShuffle ? colors.primary : 'rgba(255,255,255,0.5)' }}
          >
            <Shuffle size={24} />
            {isShuffle && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: colors.primary }} />}
          </button>

          <button
            className="p-3 opacity-80 hover:opacity-100 transition-transform active:scale-95 text-white"
            onClick={playPrevious}
          >
            <SkipBack size={36} fill="currentColor" />
          </button>

          <button
            className="p-4 opacity-90 hover:opacity-100 hover:scale-105 transition-transform active:scale-95 text-white"
            onClick={pauseOrResumeSound}
          >
            {isPlaying ? (
              <Pause size={56} fill="currentColor" />
            ) : (
              <Play size={56} fill="currentColor" className="ml-2" />
            )}
          </button>

          <button
            className="p-3 opacity-80 hover:opacity-100 transition-transform active:scale-95 text-white"
            onClick={playNext}
          >
            <SkipForward size={36} fill="currentColor" />
          </button>

          <button
            className="p-2 transition-colors relative"
            onClick={toggleRepeatMode}
            style={{ color: repeatMode !== 'off' ? colors.primary : 'rgba(255,255,255,0.5)' }}
          >
            <Repeat size={24} />
            {repeatMode === 'track' && (
              <div className="absolute -top-1 -right-1 text-[10px] font-bold" style={{ color: colors.primary }}>1</div>
            )}
            {repeatMode !== 'off' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: colors.primary }} />}
          </button>
        </div>

        {/* Audio Details */}
        {metadata.audioDetails && (
          <div className="mt-6 flex flex-row items-center justify-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
            {metadata.audioDetails.format && <span className="px-2 py-1 bg-white/5 rounded border border-white/5">{metadata.audioDetails.format}</span>}
            {metadata.audioDetails.bitrate && <span>{Math.round(metadata.audioDetails.bitrate / 1000)} kbps</span>}
            {metadata.audioDetails.sampleRate && <span>{metadata.audioDetails.sampleRate / 1000} kHz</span>}
          </div>
        )}
      </div>
    </div>
  </div>

      <AddToPlaylistModal 
        isOpen={isAddToPlaylistOpen} 
        onClose={() => setIsAddToPlaylistOpen(false)} 
        songId={currentSong?.id || null}
        onOpenCreateNew={() => {
          setIsAddToPlaylistOpen(false);
          setIsCreatePlaylistOpen(true);
        }}
      />

      <PlaylistCreateModal 
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
      />
    </div>
  );
}
