import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Play, Shuffle, Activity, Clock, ExternalLink, Music, Trash2, X, Languages, RotateCcw } from 'lucide-react';
import CoverImage from '../components/CoverImage';
import { Virtuoso } from 'react-virtuoso';
import { motion } from 'framer-motion';
import lutoImg from '../assets/luto.png';
import { useTranslation } from 'react-i18next';
import SongContextMenu from '../components/SongContextMenu';

const SongListItem = React.memo(({ item, isPlaying, onPress, index, hideCover, onRemove }: any) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <div
      className="flex flex-row items-center p-3 rounded-xl mb-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition-colors group"
      onClick={onPress}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="w-10 text-center text-sm font-bold opacity-50 group-hover:opacity-100" style={{ color: colors.text }}>
        {isPlaying ? <Activity size={18} color={colors.primary} className="mx-auto" /> : index + 1}
      </div>
      {!hideCover && (
        <CoverImage
          coverUrl={item.cover || null}
          audioPath={item.path}
          hq={false}
          className="w-12 h-12 rounded-lg ml-2 shadow-sm"
          placeholderClassName="w-12 h-12 rounded-lg bg-black/10 dark:bg-white/10 ml-2 shadow-sm"
        />
      )}
      <div className={`flex-1 flex flex-col justify-center overflow-hidden pr-4 ${hideCover ? 'ml-0' : 'ml-4'}`}>
        <span
          className="text-base font-bold mb-0.5 truncate"
          style={{ color: isPlaying ? colors.primary : colors.text }}
        >
          {item.title || item.filename.replace(/\.[^/.]+$/, "")}
        </span>
        <span className="text-sm font-medium truncate opacity-70" style={{ color: colors.text }}>
          {item.artist || t('detail.unknown')}
        </span>
      </div>
      {item.duration > 0 && (
        <div className="text-sm font-medium opacity-50 mr-4" style={{ color: colors.text }}>
          {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
        </div>
      )}
      
      <div className="flex items-center gap-2">
        {onRemove && (
          <button
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-red-500 opacity-0 group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            title={t('playlists.removeFromPlaylist', 'Eliminar de playlist')}
          >
            <Trash2 size={18} />
          </button>
        )}
        {!isPlaying && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <SongContextMenu song={item} />
          </div>
        )}
      </div>
    </div>
  );
});

export default function ListDetailScreen() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { albums, folders, artists, playlists, songs, playSound, playWithShuffle, currentSong, removeSongFromPlaylist, showToast } = useAudio();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  let dataList: any = null;
  let title = '';
  let subtitle = '';
  let cover: string | null = null;
  let audioPath: string | undefined = undefined;

  const [artistDetails, setArtistDetails] = useState<{ bio: string | null, followers: number | null, origin: string | null, fanart: string | null, isDeceased?: boolean | null } | null>(null);
  const [isAboutArtistOpen, setIsAboutArtistOpen] = useState(false);
  const [translatedBio, setTranslatedBio] = useState<string | null>(null);
  const [isTranslatingBio, setIsTranslatingBio] = useState(false);
  const [isBioTranslated, setIsBioTranslated] = useState(false);
  const [isRetryModalOpen, setIsRetryModalOpen] = useState(false);
  const [retrySearchTerm, setRetrySearchTerm] = useState('');
  const [isFetchingBio, setIsFetchingBio] = useState(false);

  useEffect(() => {
    setTranslatedBio(null);
    setIsBioTranslated(false);
    setIsTranslatingBio(false);
  }, [id, i18n.language]);

  const handleToggleTranslateBio = async () => {
    if (!artistDetails?.bio) return;

    if (isBioTranslated) {
      setIsBioTranslated(false);
      return;
    }

    if (translatedBio && !translatedBio.includes('SAME_LANGUAGE')) {
      setIsBioTranslated(true);
      return;
    }

    setIsTranslatingBio(true);
    try {
      const lines = artistDetails.bio.split('\n');
      const translatedLines = await (window as any).api.translateLyrics(`bio_${id}_${i18n.language}`, lines, i18n.language);

      const isSame =
        !translatedLines ||
        translatedLines.length === 0 ||
        translatedLines.some((l: string) => typeof l === 'string' && l.includes('SAME_LANGUAGE'));

      if (isSame) {
        showToast(t('detail.bioAlreadySameLang', 'La biografía ya está en tu idioma'));
        setIsBioTranslated(false);
      } else {
        const joined = translatedLines.join('\n');
        setTranslatedBio(joined);
        setIsBioTranslated(true);
      }
    } catch (e) {
      showToast(t('detail.bioTranslateError', 'No se pudo traducir la biografía'), 'error');
    } finally {
      setIsTranslatingBio(false);
    }
  };

  const displayedBio =
    isBioTranslated && translatedBio && !translatedBio.includes('SAME_LANGUAGE')
      ? translatedBio
      : artistDetails?.bio;

  const fetchBioForQuery = async (queryName: string, baseArtistName: string, force: boolean = false) => {
    setIsFetchingBio(true);
    setTranslatedBio(null);
    setIsBioTranslated(false);

    const cacheKey = `artist_details_cache_${baseArtistName.toLowerCase()}`;
    if (force) {
      localStorage.removeItem(cacheKey);
      showToast(t('detail.searchingBio', 'Buscando biografía...'));
    }

    try {
      const adbRes = await fetch(`https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(queryName)}`);
      const adbData = await adbRes.json();
      let details: any = null;
      if (adbData.artists && adbData.artists.length > 0) {
        const exactArtist = adbData.artists.find((a: any) => a.strArtist.toLowerCase() === queryName.toLowerCase());
        const artist = exactArtist || adbData.artists[0];
        details = {
          bio: artist.strBiographyES || artist.strBiography || null,
          followers: parseInt(artist.intFollowers) || null,
          origin: artist.strCountry || null,
          fanart: artist.strArtistFanart || artist.strArtistThumb || null,
          isDeceased: artist.intDiedYear !== null && artist.intDiedYear !== "0" && artist.intDiedYear !== ""
        };
      }

      if (!details?.bio) {
        let wikiBio = null;
        let wikiIsDeceased = false;
        
        const hosts = Array.from(new Set([(i18n.language || 'en').slice(0, 2), 'en']));
        const capQuery = queryName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        const rawNames = [
          queryName, `${queryName} (band)`, `${queryName} (banda)`, `${queryName} (singer)`, `${queryName} (cantante)`, `${queryName} (musician)`, `${queryName} (músico)`, `${queryName} (DJ)`,
          capQuery, `${capQuery} (band)`, `${capQuery} (banda)`, `${capQuery} (singer)`, `${capQuery} (cantante)`, `${capQuery} (musician)`, `${capQuery} (músico)`, `${capQuery} (DJ)`
        ];
        const names = Array.from(new Set(rawNames));
        
        outerLoop:
        for (const host of hosts) {
          for (const name of names) {
            try {
              const r = await fetch(`https://${host}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, '_'))}`);
              if (!r.ok) continue;
              const d = await r.json();
              const text = `${d.description || ''} ${(d.extract || '').slice(0, 240)}`;
              if (d.type !== 'standard' || !d.extract || !/band|banda|singer|cantante|musician|músic|rapper|rapero|composer|compositor|producer|productor|group|grupo|duo|dúo|songwriter|\bDJ\b|artist|artista/i.test(text)) continue;
              
              wikiBio = d.extract;
              const fullTextToTest = (wikiBio || '') + ' ' + (d.description || '');
              if (fullTextToTest) {
                const isBand = /\b(banda|grupo|band|group|duo|trio)\b/i.test(fullTextToTest);
                const deathRegex = /\b(falleció|murió|fallecido|fallecida|asesinado|asesinada|suicidó|found dead|passed away|died on|cause of death)\b/i;
                const dateRegex = /\b(?:18|19|20)\d{2}\s*[-–]\s*(?:18|19|20)\d{2}\b/;
                if (deathRegex.test(fullTextToTest) || (!isBand && dateRegex.test(fullTextToTest))) {
                  wikiIsDeceased = true;
                }
              }
              break outerLoop;
            } catch (e) { }
          }
        }

        if (wikiBio) {
          const finalDetails = {
            bio: wikiBio,
            followers: details?.followers ?? null,
            origin: details?.origin ?? null,
            fanart: details?.fanart ?? null,
            isDeceased: details?.isDeceased ?? wikiIsDeceased
          };
          setArtistDetails(finalDetails);
          localStorage.setItem(cacheKey, JSON.stringify(finalDetails));
          if (force) showToast(t('detail.bioUpdated', 'Información del artista actualizada'));
        } else if (details) {
          setArtistDetails(details);
          localStorage.setItem(cacheKey, JSON.stringify(details));
          if (force) showToast(t('detail.bioUpdated', 'Información del artista actualizada'));
        } else {
          setArtistDetails(null);
          if (force) showToast(t('detail.bioNotFound', 'No se encontró información para este artista'), 'error');
        }
      } else {
        setArtistDetails(details);
        localStorage.setItem(cacheKey, JSON.stringify(details));
        if (force) showToast(t('detail.bioUpdated', 'Información del artista actualizada'));
      }
    } catch (e) {
      if (force) showToast(t('detail.bioNotFound', 'No se encontró información para este artista'), 'error');
    } finally {
      setIsFetchingBio(false);
    }
  };

  useEffect(() => {
    if (type === 'artist' && id) {
      let artistData = artists[id];
      if (!artistData) {
        const lowerId = id.trim().toLowerCase();
        const realKey = Object.keys(artists).find(k => k.trim().toLowerCase() === lowerId);
        if (realKey) artistData = artists[realKey];
      }

      if (artistData && artistData.name !== 'Desconocido') {
        const artistName = artistData.name;
        setRetrySearchTerm(artistName);
        
        const cacheKey = `artist_details_cache_${artistName.toLowerCase()}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached && cached !== 'null') {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && Object.keys(parsed).length > 0 && parsed.bio) {
              setArtistDetails(parsed);
              return;
            }
          } catch(e) {}
        }
        
        fetchBioForQuery(artistName, artistName, false);
      } else {
        setTimeout(() => setArtistDetails(null), 0);
      }
    } else {
      setTimeout(() => setArtistDetails(null), 0);
      setIsAboutArtistOpen(false);
    }
  }, [type, id, artists]);

  if (type === 'album' && id) {
    let albumData = albums[id];
    if (!albumData) {
      const lowerId = id.trim().toLowerCase();
      const realKey = Object.keys(albums).find(k => k.trim().toLowerCase() === lowerId);
      if (realKey) albumData = albums[realKey];
    }
    if (albumData) {
      dataList = albumData.songs;
      title = albumData.name;
      subtitle = albumData.artist;
      cover = albumData.cover;
      audioPath = dataList[0]?.path;
    }
  } else if (type === 'folder' && id) {
    let folderData = folders[id];
    if (!folderData) {
      const lowerId = id.trim().toLowerCase();
      const realKey = Object.keys(folders).find(k => k.trim().toLowerCase() === lowerId);
      if (realKey) folderData = folders[realKey];
    }
    if (folderData) {
      dataList = folderData.songs;
      title = folderData.name;
      subtitle = t('detail.folder');
      cover = folderData.cover;
      audioPath = dataList[0]?.path;
    }
  } else if (type === 'artist' && id) {
    let artistData = artists[id];
    if (!artistData) {
      const lowerId = id.trim().toLowerCase();
      const realKey = Object.keys(artists).find(k => k.trim().toLowerCase() === lowerId);
      if (realKey) artistData = artists[realKey];
    }
    if (artistData) {
      dataList = artistData.songs;
      title = artistData.name;
      subtitle = `${dataList.length} ${t('detail.tracks', 'pistas')}`;
      cover = artistData.cover;
      audioPath = undefined;
    }
  } else if (type === 'playlist' && id) {
    const playlist = playlists.find(p => p.id === id);
    if (playlist) {
      // Mapear los IDs a canciones reales
      dataList = playlist.songIds.map(sId => songs.find(s => s.id === sId)).filter(Boolean);
      title = playlist.id === 'favorites' ? t('playlists.favorites', 'Me Gusta') : playlist.name;
      subtitle = playlist.description || t('detail.playlist', 'Playlist');
      cover = playlist.cover || null;
      audioPath = cover ? undefined : dataList[0]?.path;
    }
  }

  const artistAlbums = useMemo(() => {
    return type === 'artist' && title
      ? Object.values(albums).filter((a: any) => a.artist === title && a.name !== 'Desconocido')
      : [];
  }, [type, title, albums]);

  const displayList = useMemo(() => {
    if (!dataList) return [];
    if (type !== 'artist') return dataList;
    return dataList; // Return all songs for the artist
  }, [type, dataList]);

  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTimeout(() => {
      const el = document.getElementById('main-scroll-container');
      if (el) setScrollParent(el);
    }, 0);
  }, []);

  if (!dataList) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full w-full">
        <p className="text-xl font-bold mb-4" style={{ color: colors.text }}>{t('detail.notFound')}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 rounded-full font-bold" style={{ backgroundColor: colors.primary, color: '#000' }}>{t('detail.back')}</button>
      </div>
    );
  }

  const totalDuration = dataList.reduce((acc: number, song: any) => acc + (song.duration || 0), 0);
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  };

  const handleBack = () => {
    if (type === 'artist') {
      navigate('/artists');
    } else {
      navigate(-1);
    }
  };

  const openLink = (url: string) => {
    if (window.api && (window.api as any).openExternal) {
      (window.api as any).openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
      className="flex-1 w-full pb-24 flex flex-col"
    >
      {/* Dynamic Background (Blurred Cover) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="absolute top-0 left-0 right-0 h-[70vh] min-h-[500px] -z-10 overflow-hidden select-none pointer-events-none"
      >
        <CoverImage
          type={type as any}
          coverUrl={cover}
          audioPath={audioPath}
          hq={false}
          className="w-full h-full object-cover opacity-50 blur-[60px] scale-125 transition-all duration-1000"
          placeholderClassName="w-full h-full bg-transparent"
          iconSize={200}
        />
        <div 
          className="absolute inset-0"
          style={{ background: `linear-gradient(to bottom, transparent 0%, transparent 40%, ${colors.background} 95%, ${colors.background} 100%)` }}
        />
      </motion.div>

      {/* Header Section (Spotify Style) */}
      <div className="relative pt-20 pb-8 px-8 flex flex-col lg:flex-row items-end justify-between gap-8">
        <div className="absolute top-6 left-6 z-10">
          <button onClick={handleBack} style={{ WebkitAppRegion: 'no-drag' } as any} className="p-3 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors backdrop-blur-md">
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-end flex-1 w-full">
          {/* Cover */}
          <div
            className="relative w-64 h-64 md:w-[320px] md:h-[320px] shadow-[0_4px_60px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0 z-10 mt-8 md:mt-0 rounded-2xl group"
          >
          <CoverImage
            type={type as any}
            coverUrl={cover}
            audioPath={audioPath}
            hq={false}
            className="w-full h-full object-cover"
            placeholderClassName="w-full h-full bg-black/10 dark:bg-white/10"
            iconSize={80}
          />
        </div>

        {/* Text Details */}
        <div className="mt-6 md:mt-0 md:ml-8 flex flex-col z-10 flex-1 justify-end h-full w-full">
          <span className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: colors.text }}>
            {type === 'album' ? t('detail.album') : type === 'folder' ? t('detail.folder') : type === 'playlist' ? t('detail.playlist') : t('detail.artist')}
          </span>
          <h1 
            className={`font-black text-wrap mb-6 tracking-tighter line-clamp-3 ${
              title.length > 35 ? 'text-3xl md:text-5xl lg:text-6xl leading-tight' : 
              title.length > 20 ? 'text-4xl md:text-6xl lg:text-7xl leading-tight' : 
              'text-5xl md:text-8xl leading-none'
            }`} 
            style={{ color: colors.text, textShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            title={title}
          >
            {title}
          </h1>
          <div className="flex flex-row items-center flex-wrap gap-2 text-sm md:text-base font-bold opacity-90" style={{ color: colors.text }}>
            {type === 'album' && subtitle !== 'Carpeta' ? (
              <span
                className="cursor-pointer hover:underline"
                onClick={() => navigate(`/detail/artist/${encodeURIComponent(subtitle)}`)}
              >
                {subtitle}
              </span>
            ) : type === 'artist' ? (
              <span>{artistAlbums.length} {artistAlbums.length === 1 ? t('detail.album') : t('detail.albums')}</span>
            ) : (
              <span>{subtitle}</span>
            )}
            <span className="opacity-50">•</span>
            <span>{dataList.length} {t('detail.songs')}</span>
            {totalDuration > 0 && (
              <>
                <span className="opacity-50">•</span>
                <span>{formatDuration(totalDuration)}</span>
              </>
            )}
            {type === 'album' && albums[id!]?.year && (
              <>
                <span className="opacity-50">•</span>
                <span>{albums[id!].year}</span>
              </>
            )}
          </div>

          {type === 'artist' && (
            <div className="mt-8 flex flex-col gap-4">
              {/* Mobile bio (hidden on large screens) */}
              {artistDetails?.bio && (
                <div className="lg:hidden bg-black/10 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5 mb-4">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h3 className="font-bold text-sm uppercase tracking-wider opacity-70" style={{ color: colors.text }}>{t('detail.about')}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRetrySearchTerm(title || (id ? artists[id]?.name : '') || '');
                          setIsRetryModalOpen(true);
                        }}
                        disabled={isFetchingBio}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/20 text-xs font-medium hover:bg-white/10 transition-colors cursor-pointer"
                        style={{ color: colors.text }}
                      >
                        <RotateCcw size={12} className={isFetchingBio ? 'animate-spin' : ''} />
                        {t('detail.retry', 'Reintentar')}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleTranslateBio(); }}
                        disabled={isTranslatingBio || isFetchingBio}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/20 text-xs font-bold hover:bg-white/10 transition-colors cursor-pointer"
                        style={{ color: colors.text }}
                      >
                        <Languages size={14} className={isTranslatingBio ? 'animate-spin' : ''} />
                        {isTranslatingBio ? t('detail.translating', 'Traduciendo...') : isBioTranslated ? t('detail.viewOriginal', 'Ver original') : t('detail.translateBio', 'Traducir')}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm opacity-90 leading-relaxed line-clamp-3 cursor-pointer" onClick={() => setIsAboutArtistOpen(true)} style={{ color: colors.text }}>
                    {displayedBio}
                  </p>
                </div>
              )}

              <div className="flex flex-row flex-wrap gap-3">
                <button
                  onClick={() => openLink(`https://open.spotify.com/search/${encodeURIComponent(title)}/artists`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1DB954]/20 hover:bg-[#1DB954]/30 text-[#1DB954] transition-colors text-sm font-bold"
                >
                  <Music size={16} /> Spotify
                </button>
                <button
                  onClick={() => openLink(`https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF0000]/20 hover:bg-[#FF0000]/30 text-[#FF0000] transition-colors text-sm font-bold"
                >
                  <ExternalLink size={16} /> YouTube
                </button>
                <button
                  onClick={() => openLink(`https://music.apple.com/us/search?term=${encodeURIComponent(title)}`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FA243C]/20 hover:bg-[#FA243C]/30 text-[#FA243C] transition-colors text-sm font-bold"
                >
                  <ExternalLink size={16} /> Apple Music
                </button>

                {artistDetails?.bio && (
                  <button
                    onClick={() => setIsAboutArtistOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 hover:bg-white/10 transition-colors text-sm font-bold ml-auto"
                    style={{ color: colors.text }}
                  >
                    {t('detail.aboutArtist')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {!isAboutArtistOpen ? (
        <>
          {/* Action Buttons */}
      <div className="px-8 py-6 flex flex-row items-center gap-6 relative z-10">
        <button
          className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-[0_8px_16px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.4)]"
          style={{ backgroundColor: colors.primary, color: '#000' }}
          onClick={() => playSound(dataList[0], `${type}:${id}`, dataList, false)}
        >
          <Play size={32} fill="currentColor" className="ml-1" />
        </button>
        <button
          className="p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
          style={{ color: colors.text }}
          title="Reproducción aleatoria"
          onClick={() => playWithShuffle(`${type}:${id}`, dataList)}
        >
          <Shuffle size={32} />
        </button>
      </div>

      {/* Artist Albums */}
      {type === 'artist' && artistAlbums.length > 0 && (
        <div className="px-8 mb-8 mt-2">
          <h2 className="text-2xl font-bold mb-4 uppercase tracking-widest opacity-90" style={{ color: colors.text }}>{t('detail.discography')}</h2>
          <div
            className="flex overflow-x-auto gap-4 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            onWheel={(e) => {
              if (e.currentTarget) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            {artistAlbums.map((album: any) => (
              <div
                key={album.name}
                className="flex flex-col flex-shrink-0 w-32 md:w-40 cursor-pointer group"
                onClick={() => navigate(`/detail/album/${encodeURIComponent(album.name)}`)}
              >
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl shadow-lg overflow-hidden mb-3 relative bg-black/5 dark:bg-white/5">
                  <CoverImage
                    coverUrl={album.cover}
                    audioPath={album.songs[0]?.path}
                    hq={false}
                    className="w-full h-full object-cover"
                    placeholderClassName="w-full h-full"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play size={32} color="#fff" />
                  </div>
                </div>
                <span className="font-bold text-sm truncate" style={{ color: colors.text }}>{album.name}</span>
                <span className="text-xs opacity-70 truncate mt-0.5" style={{ color: colors.text }}>{album.year || `${album.songs.length} ${t('detail.tracks')}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Track List */}
      <div className="flex-1 flex flex-col">
        {displayList.length > 0 && (
          <div className="px-8 mb-4 mt-2">
            {type === 'artist' && (
              <h2 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>{t('detail.allSongs')}</h2>
            )}
            <div className="flex flex-row items-center px-3 py-2 border-b border-white/10 text-sm font-bold opacity-70" style={{ color: colors.text }}>
              <div className="w-10 text-center">#</div>
              <div className="flex-1 ml-4">{t('detail.title')}</div>
              <div className="mr-4"><Clock size={16} /></div>
            </div>
          </div>
        )}

        {displayList.length > 0 && scrollParent && (
          <Virtuoso
            customScrollParent={scrollParent}
            data={displayList}
            className="px-8"
            components={{
              Footer: () => <div style={{ height: '120px' }} />
            }}
            itemContent={(index, item) => (
              <SongListItem
                key={item.id}
                item={item}
                index={index}
                isPlaying={currentSong?.id === item.id}
                onPress={() => playSound(item, `${type}-${id}`, displayList, false)}
                hideCover={type === 'album'}
                onRemove={type === 'playlist' ? () => removeSongFromPlaylist(id as string, item.id) : undefined}
              />
            )}
          />
        )}
        </div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute inset-0 z-50 overflow-y-auto"
          style={{ backgroundColor: colors.background }}
        >
          <button 
            onClick={() => setIsAboutArtistOpen(false)} 
            className="absolute top-6 left-6 z-50 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-md"
          >
            <X size={24} />
          </button>
          
          <div className="w-full h-[90vh] lg:h-[100vh] relative">
            <img src={artistDetails?.fanart || cover || ''} alt={title} className="w-full h-full object-cover object-top" />
            <div 
              className="absolute inset-0 opacity-100" 
              style={{ background: `linear-gradient(to bottom, transparent 0%, transparent 65%, ${colors.background} 98%, ${colors.background} 100%)` }} 
            />
            
            {artistDetails?.isDeceased && (
              <div className="absolute top-6 right-10 z-40 drop-shadow-2xl" title="In Memoriam">
                <img src={lutoImg} alt="Moño de luto" className="w-20 h-20 md:w-24 md:h-24 object-contain opacity-90 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]" />
              </div>
            )}
            <div className="absolute bottom-12 left-12">
              <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter" style={{ textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>{title}</h1>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-12 py-16 pb-32 flex flex-col lg:flex-row gap-16">
            <div className="lg:w-1/3 flex flex-col gap-10">
              {artistDetails?.followers && (
                <div>
                  <div className="text-5xl font-black" style={{ color: colors.text }}>
                    {artistDetails.followers.toLocaleString()}
                  </div>
                  <div className="text-sm font-bold uppercase tracking-widest opacity-70 mt-2" style={{ color: colors.text }}>
                    {t('detail.followers')}
                  </div>
                </div>
              )}
              {artistDetails?.followers && (
                <div>
                  <div className="text-5xl font-black" style={{ color: colors.text }}>
                    {Math.floor(artistDetails.followers * 3.14).toLocaleString()}
                  </div>
                  <div className="text-sm font-bold uppercase tracking-widest opacity-70 mt-2" style={{ color: colors.text }}>
                    {t('detail.monthlyListeners')}
                  </div>
                </div>
              )}
              {artistDetails?.origin && (
                <div>
                  <div className="text-2xl font-bold" style={{ color: colors.text }}>
                    {artistDetails.origin}
                  </div>
                  <div className="text-sm font-bold uppercase tracking-widest opacity-70 mt-2" style={{ color: colors.text }}>
                    {t('detail.origin')}
                  </div>
                </div>
              )}
            </div>
            
            <div className="lg:w-2/3">
              {artistDetails?.bio && (
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-xs sm:text-sm font-medium opacity-70" style={{ color: colors.text }}>
                      {t('detail.isInfoCorrect', '¿Es correcta la información?')}
                    </span>
                    <button
                      onClick={() => {
                        setRetrySearchTerm(title || (id ? artists[id]?.name : '') || '');
                        setIsRetryModalOpen(true);
                      }}
                      disabled={isFetchingBio}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/10 transition-colors text-xs font-bold cursor-pointer"
                      style={{ color: colors.text }}
                    >
                      <RotateCcw size={13} className={isFetchingBio ? 'animate-spin' : ''} />
                      {t('detail.retry', 'Reintentar')}
                    </button>
                  </div>

                  <button
                    onClick={handleToggleTranslateBio}
                    disabled={isTranslatingBio || isFetchingBio}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 hover:bg-white/10 transition-colors text-sm font-bold backdrop-blur-md cursor-pointer ml-auto"
                    style={{ color: colors.text }}
                  >
                    <Languages size={18} className={isTranslatingBio ? 'animate-spin' : ''} />
                    {isTranslatingBio 
                      ? t('detail.translating', 'Traduciendo...') 
                      : isBioTranslated 
                        ? t('detail.viewOriginal', 'Ver original') 
                        : t('detail.translateBio', 'Traducir biografía')}
                  </button>
                </div>
              )}
              <p className="text-lg leading-relaxed whitespace-pre-wrap font-medium opacity-90" style={{ color: colors.text }}>
                {displayedBio}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {isRetryModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setIsRetryModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold mb-2 text-white pr-8">
              {t('detail.retryBioTitle', '¿Es correcta la información?')}
            </h3>
            <p className="text-zinc-400 mb-5 text-sm leading-relaxed">
              {t('detail.retryBioDesc', 'Si la biografía no corresponde a este artista o tiene datos erróneos, puedes reintentar la búsqueda o escribir un nombre alternativo:')}
            </p>

            <div className="mb-6">
              <label className="block text-xs uppercase tracking-wider font-bold text-zinc-400 mb-2">
                {t('detail.artist', 'Artista')}
              </label>
              <input
                type="text"
                value={retrySearchTerm}
                onChange={(e) => setRetrySearchTerm(e.target.value)}
                placeholder={t('detail.retryBioPlaceholder', 'Nombre o término de búsqueda...')}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsRetryModalOpen(false);
                    const base = (id && artists[id]?.name) || title;
                    fetchBioForQuery(retrySearchTerm, base, true);
                  }
                }}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsRetryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-white/70 font-semibold hover:text-white hover:bg-white/10 transition-colors text-sm cursor-pointer"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={() => {
                  setIsRetryModalOpen(false);
                  const base = (id && artists[id]?.name) || title;
                  fetchBioForQuery(retrySearchTerm, base, true);
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-all text-sm cursor-pointer shadow-lg"
              >
                <RotateCcw size={15} />
                {t('detail.retry', 'Reintentar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
