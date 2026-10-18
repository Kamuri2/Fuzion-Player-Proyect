import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Play,
  Pause,
  Disc,
  User,
  ListMusic,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Volume2
} from 'lucide-react';
import CoverImage from './CoverImage';
import { Song, Album, Artist } from '../types';

interface AlbumTriptychProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  album?: Album;
  artist?: Artist;
  onPlaySong: (song: Song) => void;
  currentSongId?: string;
  isPlaying?: boolean;
  setIsPlayerOpen?: (isOpen: boolean) => void;
}

export const AlbumTriptych: React.FC<AlbumTriptychProps> = ({
  isOpen,
  onClose,
  song,
  album,
  artist,
  onPlaySong,
  currentSongId,
  isPlaying = false,
  setIsPlayerOpen
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState<0 | 1 | 2>(1); // 1 = Panel central (Álbum) por defecto

  // Escuchar tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Centrar en el panel central (Álbum) cuando se abre
  useEffect(() => {
    if (isOpen) {
      setActivePanel(1);
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const width = scrollContainerRef.current.clientWidth;
          scrollContainerRef.current.scrollTo({ left: width, behavior: 'instant' as ScrollBehavior });
        }
      }, 50);
    }
  }, [isOpen]);

  // Convertir movimiento vertical de la rueda del ratón en desplazamiento horizontal continuo
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      // Si el elemento interno bajo el cursor es la lista de canciones y tiene scroll vertical, respetarlo
      const target = e.target as HTMLElement;
      const isScrollableList = target.closest('.tracklist-vertical-scroll');
      if (isScrollableList && isScrollableList.scrollHeight > isScrollableList.clientHeight) {
        // Permitir scroll vertical en la lista si no está en sus bordes
        const isAtTop = isScrollableList.scrollTop === 0 && e.deltaY < 0;
        const isAtBottom =
          isScrollableList.scrollTop + isScrollableList.clientHeight >= isScrollableList.scrollHeight - 2 &&
          e.deltaY > 0;
        if (!isAtTop && !isAtBottom) {
          return;
        }
      }

      e.preventDefault();
      scrollContainerRef.current.scrollBy({
        left: e.deltaY * 1.5,
        behavior: 'auto'
      });
    }
  }, []);

  // Detectar en qué panel estamos ubicados según scrollLeft
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, clientWidth } = scrollContainerRef.current;
    if (clientWidth <= 0) return;
    const index = Math.round(scrollLeft / clientWidth) as 0 | 1 | 2;
    if (index !== activePanel && (index === 0 || index === 1 || index === 2)) {
      setActivePanel(index);
    }
  }, [activePanel]);

  const scrollToPanel = (index: 0 | 1 | 2) => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({
      left: index * scrollContainerRef.current.clientWidth,
      behavior: 'smooth'
    });
    setActivePanel(index);
  };

  const albumSongs = album?.songs?.length ? album.songs : [song];
  const totalDuration = albumSongs.reduce((acc, s) => acc + (s.duration || 0), 0);

  const formatTime = (secs?: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const handleArtistClick = () => {
    if (song.artist) {
      if (setIsPlayerOpen) setIsPlayerOpen(false);
      onClose();
      navigate(`/detail/artist/${encodeURIComponent(song.artist)}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={onClose}
        >
          {/* Tarjeta principal del Tríptico */}
          <motion.div
            className="relative w-full max-w-5xl h-[82vh] max-h-[750px] rounded-3xl bg-[#121316]/95 border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden"
            initial={{ scale: 0.9, y: 20, rotateX: 10 }}
            animate={{ scale: 1, y: 0, rotateX: 0 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
            style={{ perspective: 1200 }}
          >
            {/* =========================================================
                BARRA SUPERIOR (HEADER) CON PESTAÑAS Y BOTÓN CERRAR
               ========================================================= */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                  {t('player.triptychAlbum', 'Álbum')} • {song.album || song.title}
                </span>
              </div>

              {/* Pestañas de Navegación del Tríptico */}
              <div className="flex items-center bg-black/40 p-1 rounded-full border border-white/10">
                <button
                  onClick={() => scrollToPanel(0)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activePanel === 0
                      ? 'bg-white text-black shadow-lg scale-105'
                      : 'text-white/60 hover:text-white'
                    }`}
                >
                  <ListMusic size={13} />
                  <span>{t('player.triptychTracks', 'Canciones')}</span>
                </button>
                <button
                  onClick={() => scrollToPanel(1)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activePanel === 1
                      ? 'bg-white text-black shadow-lg scale-105'
                      : 'text-white/60 hover:text-white'
                    }`}
                >
                  <Disc size={13} />
                  <span>{t('player.triptychAlbum', 'Álbum')}</span>
                </button>
                <button
                  onClick={() => scrollToPanel(2)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activePanel === 2
                      ? 'bg-white text-black shadow-lg scale-105'
                      : 'text-white/60 hover:text-white'
                    }`}
                >
                  <User size={13} />
                  <span>{t('player.triptychArtist', 'Artista')}</span>
                </button>
              </div>

              {/* Botón Cerrar */}
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                title={t('player.closeTriptych', 'Cerrar')}
              >
                <X size={18} />
              </button>
            </div>

            {/* =========================================================
                CONTENEDOR HORIZONTAL CON SCROLL SNAP Y SOPORTE DE RUEDA
               ========================================================= */}
            <div
              ref={scrollContainerRef}
              onWheel={handleWheel}
              onScroll={handleScroll}
              className="flex-1 w-full flex flex-row overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {/* -------------------------------------------------------
                  PANEL 0: LISTA DE CANCIONES (TRACKLIST)
                 ------------------------------------------------------- */}
              <div className="w-full shrink-0 snap-center p-6 md:p-10 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/10 text-white">
                      <ListMusic size={22} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">
                        {t('player.triptychTracksTitle', 'Lista de Canciones')}
                      </h3>
                      <p className="text-xs text-white/50">
                        {albumSongs.length} {t('player.tracksCount', 'pistas')} • {formatTime(totalDuration)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista vertical de canciones */}
                <div className="tracklist-vertical-scroll flex-1 overflow-y-auto pr-2 space-y-1.5 custom-scrollbar">
                  {albumSongs.map((track, idx) => {
                    const isCurrent = track.id === (currentSongId || song.id);
                    return (
                      <div
                        key={track.id || `${track.path}-${idx}`}
                        onClick={() => onPlaySong(track)}
                        className={`group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200 border ${isCurrent
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-white shadow-md'
                            : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10 text-white/80'
                          }`}
                      >
                        <div className="flex items-center gap-4 truncate mr-4">
                          <span
                            className={`w-6 text-center text-xs font-bold ${isCurrent ? 'text-emerald-400' : 'text-white/40 group-hover:text-white/70'
                              }`}
                          >
                            {isCurrent && isPlaying ? (
                              <Volume2 size={16} className="inline animate-pulse text-emerald-400" />
                            ) : (
                              track.trackNumber || idx + 1
                            )}
                          </span>
                          <div className="flex flex-col truncate">
                            <span
                              className={`text-sm font-semibold truncate ${isCurrent ? 'text-emerald-300' : 'text-white group-hover:text-emerald-200'
                                }`}
                            >
                              {track.title || track.filename.replace(/\.[^/.]+$/, '')}
                            </span>
                            <span className="text-xs text-white/45 truncate">
                              {track.artist || song.artist}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-white/40 font-mono">
                            {formatTime(track.duration)}
                          </span>
                          <button
                            className={`p-2 rounded-full transition-transform active:scale-90 ${isCurrent
                                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                                : 'bg-white/10 text-white group-hover:bg-white/20'
                              }`}
                          >
                            {isCurrent && isPlaying ? <Pause size={13} /> : <Play size={13} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* -------------------------------------------------------
                  PANEL 1: INFORMACIÓN DEL ÁLBUM (CENTER PANEL)
                 ------------------------------------------------------- */}
              <div className="w-full shrink-0 snap-center p-6 md:p-10 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 h-full">
                {/* Portada en relieve 3D */}
                <div className="relative group shrink-0">
                  <div className="w-56 h-56 md:w-72 md:h-72 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/20 relative z-10 bg-[#16171a]">
                    <CoverImage
                      coverUrl={album?.cover || song.cover}
                      audioPath={song.path || album?.songs?.[0]?.path}
                      hq={true}
                      className="w-full h-full object-cover"
                      iconSize={64}
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/15 pointer-events-none" />
                  </div>
                  {/* Sombra de suelo */}
                  <div className="absolute -bottom-6 left-6 right-6 h-6 bg-black/80 blur-xl rounded-full" />
                </div>

                {/* Ficha técnica del Álbum */}
                <div className="flex flex-col justify-center max-w-md w-full">
                  <div className="flex items-center gap-2 text-xs uppercase font-black tracking-widest text-emerald-400 mb-2">
                    <Disc size={15} />
                    <span>{t('albums.title', 'Álbum')}</span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black text-white mb-1 leading-tight line-clamp-2">
                    {album?.name || song.album || song.title}
                  </h2>
                  <p className="text-base font-semibold text-white/70 mb-6">
                    {album?.artist || song.artist || t('common.unknownArtist', 'Artista desconocido')}
                  </p>

                  {/* Cuadrícula de detalles técnicos */}
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs">
                    <div className="flex flex-col">
                      <span className="text-white/40 uppercase font-bold text-[10px] tracking-wider mb-0.5">
                        {t('player.releaseYear', 'Año')}
                      </span>
                      <span className="text-white font-bold text-sm">
                        {song.year || album?.year || '—'}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-white/40 uppercase font-bold text-[10px] tracking-wider mb-0.5">
                        {t('player.genre', 'Género')}
                      </span>
                      <span className="text-white font-bold text-sm truncate">
                        {song.genre || '—'}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-white/40 uppercase font-bold text-[10px] tracking-wider mb-0.5">
                        {t('player.totalTracks', 'Canciones')}
                      </span>
                      <span className="text-white font-bold text-sm">
                        {albumSongs.length}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-white/40 uppercase font-bold text-[10px] tracking-wider mb-0.5">
                        {t('player.totalDuration', 'Duración Total')}
                      </span>
                      <span className="text-white font-bold text-sm">
                        {formatTime(totalDuration)}
                      </span>
                    </div>
                  </div>

                  {/* Botón para navegar a la lista de canciones en el panel 0 */}
                  <button
                    onClick={() => scrollToPanel(0)}
                    className="mt-5 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold tracking-wide transition-all border border-white/10 hover:border-white/20"
                  >
                    <ListMusic size={15} />
                    <span>{t('player.triptychTracksTitle', 'Ver Lista de Canciones')}</span>
                  </button>
                </div>
              </div>

              {/* -------------------------------------------------------
                  PANEL 2: INFORMACIÓN DEL ARTISTA
                 ------------------------------------------------------- */}
              <div className="w-full shrink-0 snap-center p-6 md:p-10 flex flex-col items-center justify-center text-center h-full max-w-2xl mx-auto">
                {/* Avatar del Artista */}
                <div className="relative mb-5">
                  <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden shadow-2xl border-4 border-white/20 bg-white/10 flex items-center justify-center">
                    {artist?.cover ? (
                      <img
                        src={artist.cover}
                        alt={song.artist}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <CoverImage
                        coverUrl={song.cover}
                        audioPath={song.path}
                        hq={true}
                        type="artist"
                        className="w-full h-full object-cover"
                        iconSize={48}
                      />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-emerald-500 text-black shadow-lg">
                    <Sparkles size={16} />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs uppercase font-black tracking-widest text-emerald-400 mb-1">
                  <User size={13} />
                  <span>{t('artists.title', 'Artista')}</span>
                </div>

                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
                  {song.artist || t('common.unknownArtist', 'Artista desconocido')}
                </h3>

                <p className="text-xs md:text-sm text-white/60 max-w-md leading-relaxed mb-6">
                  {t(
                    'player.artistBioPlaceholder',
                    'Explora las canciones y álbumes de este artista en tu biblioteca musical.'
                  )}
                </p>

                {/* Badge de canciones del artista */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-white/80">
                    {artist?.songs?.length || 1} {t('player.artistSongsCount', 'canciones en tu biblioteca')}
                  </span>
                </div>

                {/* Botón para abrir el perfil completo del artista */}
                <button
                  onClick={handleArtistClick}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wider shadow-xl shadow-emerald-500/20 transform hover:scale-105 active:scale-95 transition-all"
                >
                  <ExternalLink size={15} />
                  <span>{t('player.viewArtistProfile', 'Ver perfil completo del artista')}</span>
                </button>
              </div>
            </div>

            {/* =========================================================
                BARRA INFERIOR (FOOTER) CON CONTROLES Y GUÍA DE SCROLL
               ========================================================= */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-black/40 text-xs text-white/50 shrink-0">
              {/* Botón flecha izquierda */}
              <button
                onClick={() => {
                  if (activePanel > 0) scrollToPanel((activePanel - 1) as 0 | 1 | 2);
                }}
                disabled={activePanel === 0}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 transition-colors ${activePanel === 0
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-white/10 hover:text-white'
                  }`}
              >
                <ChevronLeft size={14} />
                <span>{activePanel === 2 ? t('player.triptychAlbum', 'Álbum') : t('player.triptychTracks', 'Canciones')}</span>
              </button>

              {/* Indicador de navegación por scroll */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 rounded-full transition-all duration-300 ${activePanel === 0 ? 'w-6 bg-emerald-400' : 'w-2 bg-white/30'
                      }`}
                  />
                  <span
                    className={`h-2 rounded-full transition-all duration-300 ${activePanel === 1 ? 'w-6 bg-emerald-400' : 'w-2 bg-white/30'
                      }`}
                  />
                  <span
                    className={`h-2 rounded-full transition-all duration-300 ${activePanel === 2 ? 'w-6 bg-emerald-400' : 'w-2 bg-white/30'
                      }`}
                  />
                </div>
                <span className="hidden md:inline ml-3 text-[11px] text-white/40 font-medium">
                  {t('player.scrollHint', 'Haz scroll o desliza para mover las 3 pantallas')}
                </span>
              </div>

              {/* Botón flecha derecha */}
              <button
                onClick={() => {
                  if (activePanel < 2) scrollToPanel((activePanel + 1) as 0 | 1 | 2);
                }}
                disabled={activePanel === 2}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 transition-colors ${activePanel === 2
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-white/10 hover:text-white'
                  }`}
              >
                <span>{activePanel === 0 ? t('player.triptychAlbum', 'Álbum') : t('player.triptychArtist', 'Artista')}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AlbumTriptych;
