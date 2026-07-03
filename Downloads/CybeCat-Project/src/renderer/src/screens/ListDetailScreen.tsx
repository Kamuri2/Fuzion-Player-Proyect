import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Play, Shuffle, Activity, Clock, ExternalLink, Music, Trash2, Camera, X } from 'lucide-react';
import CoverImage from '../components/CoverImage';
import { useDominantColor } from '../hooks/useDominantColor';
import { Virtuoso } from 'react-virtuoso';
import { motion } from 'framer-motion';
import lutoImg from '../assets/luto.png';
import { useTranslation } from 'react-i18next';

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
          hq={true}
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
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all text-white/50"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
});

export default function ListDetailScreen() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { albums, folders, artists, playlists, songs, playSound, playWithShuffle, currentSong, removeSongFromPlaylist, updatePlaylistCover } = useAudio();
  const { colors } = useTheme();
  const { t } = useTranslation();

  let dataList: any = null;
  let title = '';
  let subtitle = '';
  let cover: string | null = null;
  let audioPath: string | undefined = undefined;

  const dominantColor = useDominantColor(cover);

  const [artistDetails, setArtistDetails] = useState<{ bio: string | null, followers: number | null, origin: string | null, fanart: string | null, isDeceased?: boolean | null } | null>(null);
  const [isAboutArtistOpen, setIsAboutArtistOpen] = useState(false);

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
        
        const fetchBio = async () => {
          try {
            const adbRes = await fetch(`https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(artistName)}`);
            const adbData = await adbRes.json();
            let details: any = null;
            if (adbData.artists && adbData.artists.length > 0) {
              const exactArtist = adbData.artists.find((a: any) => a.strArtist.toLowerCase() === artistName.toLowerCase());
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
              // Intento directo en español
              let res = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artistName)}`);
              let data = await res.json();
              
              if (data.type === 'disambiguation' || data.title === 'Not found' || data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') {
                const searchRes = await fetch(`https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(artistName + ' cantante')}&utf8=&format=json&origin=*`);
                const searchData = await searchRes.json();
                if (searchData.query && searchData.query.search.length > 0) {
                  const bestTitle = searchData.query.search[0].title;
                  res = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`);
                  data = await res.json();
                }
              }

              let wikiBio = null;
              if (data && data.extract && data.type !== 'disambiguation' && data.type !== 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') {
                wikiBio = data.extract;
              } else {
                // Intento en inglés como respaldo
                const enRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artistName)}`);
                const enData = await enRes.json();
                if (enData && enData.extract && enData.type !== 'disambiguation' && enData.type !== 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') {
                  wikiBio = enData.extract;
                  data = enData;
                }
              }

              let wikiIsDeceased = false;
              let fullTextToTest = (wikiBio || '') + ' ' + (data?.description || '');
              if (fullTextToTest) {
                const isBand = /\b(banda|grupo|band|group|duo|trio)\b/i.test(fullTextToTest);
                const deathRegex = /\b(falleció|murió|fallecido|fallecida|asesinado|asesinada|suicidó|found dead|passed away|died on|cause of death)\b/i;
                const dateRegex = /\b(?:18|19|20)\d{2}\s*[-–]\s*(?:18|19|20)\d{2}\b/;
                
                if (deathRegex.test(fullTextToTest) || (!isBand && dateRegex.test(fullTextToTest))) {
                  wikiIsDeceased = true;
                }
              }

              if (wikiBio) {
                setArtistDetails(prev => ({
                  bio: wikiBio,
                  followers: prev?.followers ?? details?.followers ?? null,
                  origin: prev?.origin ?? details?.origin ?? null,
                  fanart: prev?.fanart ?? details?.fanart ?? null,
                  isDeceased: prev?.isDeceased ?? details?.isDeceased ?? wikiIsDeceased
                }));
              } else if (details) {
                setArtistDetails(details);
              } else {
                setArtistDetails(null);
              }
            } else {
              setArtistDetails(details);
            }
          } catch (e) {
            setArtistDetails(null);
          }
        };

        fetchBio();
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
      audioPath = dataList[0]?.path;
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
      {/* Dynamic Background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="absolute top-0 left-0 right-0 h-[600px] -z-10 select-none pointer-events-none transition-colors duration-1000"
        style={{
          background: `linear-gradient(to bottom, ${dominantColor || colors.card} 0%, ${colors.background} 100%)`
        }}
      />

      {/* Header Section (Spotify Style) */}
      <div className="relative pt-20 pb-8 px-8 flex flex-col lg:flex-row items-end justify-between gap-8">
        <div className="absolute top-6 left-6 z-10">
          <button onClick={handleBack} className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors backdrop-blur-md">
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-end flex-1 w-full">
          {/* Cover */}
          <div
            className="relative w-64 h-64 md:w-[320px] md:h-[320px] shadow-[0_4px_60px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0 z-10 mt-8 md:mt-0 rounded-2xl group"
          >
          <CoverImage
            coverUrl={cover}
            audioPath={audioPath}
            hq={true}
            className="w-full h-full object-cover"
            placeholderClassName="w-full h-full bg-black/10 dark:bg-white/10"
            iconSize={80}
          />
          {type === 'playlist' && id !== 'favorites' && (
            <button
              onClick={async () => {
                try {
                  const url = await window.api.openImageFile();
                  if (url && id) {
                    updatePlaylistCover(id, url);
                  }
                } catch (e) {
                  console.error(e);
                }
              }}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-2">
                <Camera size={32} />
                <span className="font-bold text-sm">Cambiar Portada</span>
              </div>
            </button>
          )}
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
                <div className="lg:hidden bg-black/10 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5 mb-4 cursor-pointer" onClick={() => setIsAboutArtistOpen(true)}>
                  <h3 className="font-bold text-sm uppercase tracking-wider mb-2 opacity-70" style={{ color: colors.text }}>{t('detail.about')}</h3>
                  <p className="text-sm opacity-90 leading-relaxed line-clamp-3" style={{ color: colors.text }}>
                    {artistDetails.bio}
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
                    hq={true}
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
          
          <div className="w-full h-[60vh] relative">
            <img src={artistDetails?.fanart || cover || ''} alt={title} className="w-full h-full object-cover" />
            <div 
              className="absolute inset-0 opacity-100" 
              style={{ background: `linear-gradient(to top, ${colors.background} -5%, transparent 100%)` }} 
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
              <p className="text-lg leading-relaxed whitespace-pre-wrap font-medium opacity-90" style={{ color: colors.text }}>
                {artistDetails?.bio}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
