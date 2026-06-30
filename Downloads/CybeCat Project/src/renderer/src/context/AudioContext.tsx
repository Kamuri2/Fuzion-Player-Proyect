/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, prefer-const, no-empty, @typescript-eslint/no-explicit-any, react-hooks/immutability, react-refresh/only-export-components, react-hooks/set-state-in-effect */
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Song, Album, Folder, Artist, AudioContextType, Playlist } from '../types';

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Record<string, Album>>({});
  const [folders, setFolders] = useState<Record<string, Folder>>({});
  const [artists, setArtists] = useState<Record<string, Artist>>({});
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [audioDetails, setAudioDetails] = useState<{ bitrate?: number; sampleRate?: number; format?: string } | null>(null);
  const [currentContextId, setCurrentContextId] = useState<string>('all');
  const [queue, setQueue] = useState<Song[]>([]);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueLength, setQueueLength] = useState(0);

  const [repeatMode, setRepeatMode] = useState<'off' | 'track' | 'queue'>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const secondaryAudioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<Song[]>([]);
  const currentQueueIndex = useRef(-1);
  const originalQueueRef = useRef<Song[]>([]);
  const repeatModeRef = useRef(repeatMode);
  const isShuffleRef = useRef(isShuffle);
  const currentContextIdRef = useRef(currentContextId);
  const isCrossfadingRef = useRef(false);
  const crossfadeTimerRef = useRef<any>(null);
  const crossfadeDurationRef = useRef(3);

  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { currentContextIdRef.current = currentContextId; }, [currentContextId]);

  const [isScanning, setIsScanning] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isCrossfadeEnabled, setIsCrossfadeEnabledState] = useState(true);
  const [crossfadeDuration, setCrossfadeDurationState] = useState(3);
  const [toastMessage, setToastMessage] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isCrossfadeEnabledRef = useRef(isCrossfadeEnabled);
  useEffect(() => { isCrossfadeEnabledRef.current = isCrossfadeEnabled; }, [isCrossfadeEnabled]);

  const setIsCrossfadeEnabled = (enabled: boolean) => {
    setIsCrossfadeEnabledState(enabled);
    localStorage.setItem('@crossfade_enabled', enabled.toString());
  };

  useEffect(() => { crossfadeDurationRef.current = crossfadeDuration; }, [crossfadeDuration]);

  const setCrossfadeDuration = (duration: number) => {
    setCrossfadeDurationState(duration);
    localStorage.setItem('@crossfade_duration', duration.toString());
  };

  const attachListeners = (audio: HTMLAudioElement) => {
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => handleTrackEnded();
    audio.ontimeupdate = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);

      const CROSSFADE_DURATION = crossfadeDurationRef.current;
      if (
        audio.duration &&
        audio.duration - audio.currentTime <= CROSSFADE_DURATION &&
        !isCrossfadingRef.current &&
        queueRef.current.length > 0 &&
        repeatModeRef.current !== 'track'
      ) {
        startCrossfade();
      }
    };
    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0);
    };
  };

  const clearListeners = (audio: HTMLAudioElement) => {
    audio.onplay = null;
    audio.onpause = null;
    audio.onended = null;
    audio.ontimeupdate = null;
    audio.onloadedmetadata = null;
  };

  useEffect(() => {
    const audio = new Audio();
    const secondaryAudio = new Audio();
    attachListeners(audio);

    audioRef.current = audio;
    secondaryAudioRef.current = secondaryAudio;

    const loadPlaylists = () => {
      const stored = localStorage.getItem('@playlists');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const parsedArray = Array.isArray(parsed) ? parsed : [];
          const sanitized = parsedArray.map((p: any) => ({ ...p, songIds: Array.isArray(p.songIds) ? p.songIds : [] }));
          if (!sanitized.find((p: Playlist) => p.id === 'favorites')) {
            sanitized.unshift({ id: 'favorites', name: t('playlists.favorites', 'Me Gusta'), songIds: [], isAuto: true });
          }
          setPlaylists(sanitized);
        } catch (e) {
          console.error("Error loading playlists", e);
        }
      } else {
        setPlaylists([{ id: 'favorites', name: t('playlists.favorites', 'Me Gusta'), songIds: [], isAuto: true }]);
      }

      const cf = localStorage.getItem('@crossfade_enabled');
      if (cf !== null) setIsCrossfadeEnabledState(cf === 'true');

      const cd = localStorage.getItem('@crossfade_duration');
      if (cd !== null) setCrossfadeDurationState(Number(cd));
    };
    loadPlaylists();

    const storedFolder = localStorage.getItem('@music_folder');
    const cached = localStorage.getItem('@cached_songs');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setSongs(parsed);
        buildLists(parsed);
      } catch (e) { }
    }

    if (storedFolder) {
      loadSongsFromUri(storedFolder, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildLists = async (formattedSongs: Song[]) => {
    let albumsObj: Record<string, Album> = {};
    let foldersObj: Record<string, Folder> = {};
    let artistsObj: Record<string, Artist> = {};

    // Pre-load the artist image cache to prevent flickering
    const artistCache = await window.api.getArtistCache();

    let albumKeyMap: Record<string, string> = {};
    let artistKeyMap: Record<string, string> = {};

    formattedSongs.forEach(song => {
      let fName = song.folder || 'Desconocido';
      if (!foldersObj[fName]) foldersObj[fName] = { name: fName, cover: song.cover || null, songs: [] };
      foldersObj[fName].songs.push(song);

      // Normalize Artist
      let rawArtist = song.artist || 'Desconocido';
      let normArtist = rawArtist.trim().toLowerCase();
      let artName = artistKeyMap[normArtist];
      if (!artName) {
        artName = rawArtist.trim();
        artistKeyMap[normArtist] = artName;
      }

      // Normalize Album
      let rawAlbum = song.album || 'Desconocido';
      let normAlbum = rawAlbum.trim().toLowerCase();
      let aName = albumKeyMap[normAlbum];
      if (!aName) {
        aName = rawAlbum.trim();
        albumKeyMap[normAlbum] = aName;
      }

      // Update the song object to use the canonical names so navigation matches perfectly
      song.artist = artName;
      song.album = aName;

      if (!albumsObj[aName]) albumsObj[aName] = { name: aName, artist: artName, cover: song.cover || null, songs: [], year: song.year };
      albumsObj[aName].songs.push(song);

      if (!artistsObj[artName]) {
        let coverUrl = song.cover || null;
        if (artistCache && artistCache[normArtist]) {
          coverUrl = artistCache[normArtist];
        }
        artistsObj[artName] = { name: artName, cover: coverUrl, songs: [] };
      }
      artistsObj[artName].songs.push(song);
    });

    Object.values(albumsObj).forEach(album => {
      album.songs.sort((a, b) => {
        const trackA = typeof a.trackNumber === 'number' && a.trackNumber > 0 ? a.trackNumber : 9999;
        const trackB = typeof b.trackNumber === 'number' && b.trackNumber > 0 ? b.trackNumber : 9999;

        if (trackA !== trackB) {
          return trackA - trackB;
        }
        const strA = a.title || a.filename || '';
        const strB = b.title || b.filename || '';
        return strA.localeCompare(strB);
      });
    });

    Object.values(foldersObj).forEach(folder => {
      folder.songs.sort((a, b) => {
        const strA = a.title || a.filename || '';
        const strB = b.title || b.filename || '';
        return strA.localeCompare(strB);
      });
    });

    setAlbums(albumsObj);
    setFolders(foldersObj);
    setArtists(artistsObj);

    // Fetch artist profile images asynchronously in batch
    const fetchArtistImages = async () => {
      const artistNames = Object.keys(artistsObj).filter(n => n !== 'Desconocido');

      for (const name of artistNames) {
        const url = await window.api.getArtistImage(name);
        if (url && url !== artistsObj[name].cover) {
          setArtists(prev => ({
            ...prev,
            [name]: { ...prev[name], cover: url }
          }));
        }
      }
    };
    fetchArtistImages();
  };

  const startCrossfade = () => {
    let nextIndex = currentQueueIndex.current + 1;
    let nextSong: Song | null = null;

    if (nextIndex < queueRef.current.length) {
      nextSong = queueRef.current[nextIndex];
    } else if (repeatModeRef.current === 'queue' && queueRef.current.length > 0) {
      nextIndex = 0;
      nextSong = queueRef.current[0];
    }

    if (!nextSong || !audioRef.current || !secondaryAudioRef.current) return;

    const primary = audioRef.current;
    const secondary = secondaryAudioRef.current;

    // UI update immediately (separa la interfaz del audio)
    currentQueueIndex.current = nextIndex;
    setQueuePosition(nextIndex + 1);
    setCurrentSong(nextSong);
    loadMetadataForSong(nextSong);

    if (!isCrossfadeEnabledRef.current) {
      // Cambio instantáneo sin desvanecimiento
      clearListeners(primary); // Prevent onpause firing
      primary.pause();
      primary.onended = null;
      primary.volume = 1;

      secondary.src = nextSong.uri;
      secondary.volume = 1;

      audioRef.current = secondary;
      secondaryAudioRef.current = primary;

      attachListeners(audioRef.current);
      audioRef.current.play().catch(e => console.error("Play error", e));
      return;
    }

    isCrossfadingRef.current = true;
    secondary.src = nextSong.uri;
    secondary.volume = 0;
    secondary.play().catch(e => console.error("Crossfade error", e));

    const CROSSFADE_DURATION = crossfadeDurationRef.current;
    const steps = Math.max(10, CROSSFADE_DURATION * 10);
    const intervalTime = (CROSSFADE_DURATION * 1000) / steps;
    let currentStep = 0;

    // Prevent natural end trigger
    primary.onended = null;

    if (crossfadeTimerRef.current) clearInterval(crossfadeTimerRef.current);

    crossfadeTimerRef.current = setInterval(() => {
      currentStep++;
      const fraction = currentStep / steps;

      if (primary) primary.volume = Math.max(0, 1 - fraction);
      if (secondary) secondary.volume = Math.min(1, fraction);

      if (currentStep >= steps) {
        clearInterval(crossfadeTimerRef.current);
        crossfadeTimerRef.current = null;

        clearListeners(primary); // Prevent onpause firing
        primary.pause();
        primary.volume = 1;

        // Swap references
        audioRef.current = secondary;
        secondaryAudioRef.current = primary;

        attachListeners(audioRef.current);
        setIsPlaying(true); // Ensure UI shows playing, since onplay won't fire for an already playing track

        isCrossfadingRef.current = false;
      }
    }, intervalTime);
  };

  const handleTrackEnded = () => {
    if (repeatModeRef.current === 'track') {
      audioRef.current!.currentTime = 0;
      audioRef.current!.play();
    } else {
      if (!isCrossfadingRef.current) {
        playNext();
      }
    }
  };

  const loadSongsFromUri = async (folderPath?: string, _isBackgroundLoad?: boolean) => {
    let targetFolder: string | null | undefined = folderPath;
    if (!targetFolder) {
      targetFolder = await window.api.openDirectory();
      if (targetFolder) {
        localStorage.setItem('@music_folder', targetFolder);
      } else {
        return;
      }
    }

    setIsScanning(true);
    try {
      const nativeSongs = await window.api.readMusicFiles(targetFolder);

      const formattedSongs: Song[] = nativeSongs.map((asset: any) => ({
        ...asset,
        duration: 0,
      }));

      formattedSongs.sort((a, b) => {
        const strA = a.title || a.filename || '';
        const strB = b.title || b.filename || '';
        return strA.localeCompare(strB);
      });

      // --- Migrate playlist songIds from old IDs to new IDs ---
      // Build a path→newId map from the freshly scanned songs
      const pathToNewId: Record<string, string> = {};
      for (const s of formattedSongs) {
        pathToNewId[s.path] = s.id;
      }

      // Build an oldId→path map from the previously cached songs
      const oldIdToPath: Record<string, string> = {};
      try {
        const oldCached = localStorage.getItem('@cached_songs');
        if (oldCached) {
          const oldSongs = JSON.parse(oldCached);
          if (Array.isArray(oldSongs)) {
            for (const os of oldSongs) {
              if (os.id && os.path) {
                oldIdToPath[os.id] = os.path;
              }
            }
          }
        }
      } catch {}

      // Migrate playlists: translate old songIds to new songIds via path matching
      const needsMigration = Object.keys(oldIdToPath).length > 0;
      if (needsMigration) {
        savePlaylists(prev => prev.map(playlist => {
          const migratedIds = playlist.songIds.map(oldSongId => {
            // If the old ID already matches a new song, keep it
            if (pathToNewId[oldIdToPath[oldSongId]] !== undefined) {
              return pathToNewId[oldIdToPath[oldSongId]];
            }
            // Check if it's already a valid new ID
            if (formattedSongs.some(s => s.id === oldSongId)) {
              return oldSongId;
            }
            // ID couldn't be migrated — drop it
            return null;
          }).filter((id): id is string => id !== null);
          // Remove duplicates that could arise from migration
          const uniqueIds = [...new Set(migratedIds)];
          return { ...playlist, songIds: uniqueIds };
        }));
      }
      // --- End migration ---

      setSongs(formattedSongs);
      buildLists(formattedSongs);

      try {
        localStorage.setItem('@cached_songs', JSON.stringify(formattedSongs));
      } catch (e) { }
    } catch (e) {
      console.error("Error loading songs:", e);
    } finally {
      setIsScanning(false);
    }
  };

  const changeMusicFolder = async () => {
    await loadSongsFromUri();
  };

  const savePlaylists = (updater: (prev: Playlist[]) => Playlist[]) => {
    setPlaylists(prev => {
      const updated = updater(prev);
      localStorage.setItem('@playlists', JSON.stringify(updated));
      return updated;
    });
  };

  const createPlaylist = async (name: string, description?: string, cover?: string) => {
    try {
      savePlaylists(prev => {
        const newPlaylist: Playlist = { id: Date.now().toString(), name, description, cover, songIds: [] };
        return [...prev, newPlaylist];
      });
      showToast(t('playlists.created', 'Lista "{{name}}" creada con éxito.', { name }));
      return;
    } catch {
      showToast(t('playlists.createError', 'Error al crear la lista "{{name}}".', { name }), 'error');
    }
  };

  const updatePlaylist = async (playlistId: string, updates: Pick<Playlist, 'name' | 'description' | 'cover'>) => {
    const existing = playlists.find(p => p.id === playlistId);
    if (!existing || existing.isAuto) return;

    try {
      savePlaylists(prev => prev.map(p => {
        if (p.id !== playlistId) return p;
        return {
          ...p,
          name: updates.name,
          description: updates.description || undefined,
          cover: updates.cover || null
        };
      }));
      showToast(t('playlists.updated', 'Lista "{{name}}" actualizada.', { name: updates.name }));
    } catch {
      showToast(t('playlists.updateError', 'Error al actualizar la lista "{{name}}".', { name: existing.name }), 'error');
    }
  };

  const deletePlaylist = async (id: string) => {
    if (id === 'favorites') return;
    const target = playlists.find(p => p.id === id);
    if (target) {
      const displayName = target.id === 'favorites' ? t('playlists.favorites', 'Me Gusta') : target.name;
      showToast(t('playlists.deleted', 'Lista "{{name}}" eliminada.', { name: displayName }));
    }
    savePlaylists(prev => prev.filter(p => p.id !== id));
  };

  const addSongToPlaylist = async (playlistId: string, songId: string) => {
    const song = songs.find(s => s.id === songId);
    const target = playlists.find(p => p.id === playlistId);

    if (target) {
      const displayName = target.id === 'favorites' ? t('playlists.favorites', 'Me Gusta') : target.name;
      if (target.songIds.includes(songId)) {
        showToast(t('playlists.songAlreadyAdded', 'La canción ya estaba en "{{name}}".', { name: displayName }), 'error');
      } else {
        showToast(t('playlists.songAdded', 'Canción añadida a "{{name}}".', { name: displayName }));
      }
    }

    savePlaylists(prev => prev.map(p => {
      if (p.id === playlistId && !p.songIds.includes(songId)) {
        return { ...p, songIds: [...p.songIds, songId], cover: p.cover ? p.cover : (song?.cover || null) };
      }
      return p;
    }));
  };

  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    const target = playlists.find(p => p.id === playlistId);
    if (target) {
      const displayName = target.id === 'favorites' ? t('playlists.favorites', 'Me Gusta') : target.name;
      showToast(t('playlists.songRemoved', 'Canción eliminada de "{{name}}".', { name: displayName }));
    }

    savePlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, songIds: p.songIds.filter(id => id !== songId) };
      }
      return p;
    }));
  };

  const updatePlaylistCover = async (playlistId: string, coverUri: string) => {
    savePlaylists(prev => prev.map(p => {
      if (p.id === playlistId) return { ...p, cover: coverUri };
      return p;
    }));
  };

  const toggleFavorite = async (songId: string) => {
    if (isFavorite(songId)) {
      await removeSongFromPlaylist('favorites', songId);
    } else {
      await addSongToPlaylist('favorites', songId);
    }
  };

  const isFavorite = (songId: string) => {
    const fav = playlists.find(p => p.id === 'favorites');
    return fav ? fav.songIds.includes(songId) : false;
  };

  const loadMetadataForSong = async (song: Song) => {
    try {
      const meta = await window.api.getMetadata(song.path);
      setLyrics(meta.lyrics);
      setAudioDetails({ bitrate: meta.bitrate, sampleRate: meta.sampleRate, format: meta.format });
      const updatedSong = { ...song, title: meta.title, artist: meta.artist, album: meta.album, cover: meta.cover, duration: meta.duration };
      setCurrentSong(updatedSong);
      return updatedSong;
    } catch (e) {
      console.error(e);
      return song;
    }
  };

  const playSound = async (song: Song, contextId?: string, contextList?: Song[], forceShuffle?: boolean, rebuildQueue: boolean = true) => {
    if (isCrossfadingRef.current && crossfadeTimerRef.current) {
      clearInterval(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
      isCrossfadingRef.current = false;
      if (secondaryAudioRef.current) {
        secondaryAudioRef.current.pause();
        secondaryAudioRef.current.volume = 1;
      }
      if (audioRef.current) {
        audioRef.current.volume = 1;
        attachListeners(audioRef.current);
      }
    }

    if (rebuildQueue) {
      const targetList = contextList && contextList.length > 0 ? contextList : songs;
      const targetContextId = contextId || 'all';

      setCurrentContextId(targetContextId);
      originalQueueRef.current = [...targetList];

      let tracks = [...targetList];
      if (isShuffleRef.current || forceShuffle) {
        const otherTracks = tracks.filter(s => s.id !== song.id);
        for (let i = otherTracks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
        }
        tracks = [song, ...otherTracks];
      }

      queueRef.current = tracks;
      setQueue(tracks);
      currentQueueIndex.current = tracks.findIndex(s => s.id === song.id);

      setQueueLength(tracks.length);
      setQueuePosition(currentQueueIndex.current + 1);
    } else {
      currentQueueIndex.current = queueRef.current.findIndex(s => s.id === song.id);
      setQueuePosition(currentQueueIndex.current + 1);
    }

    if (audioRef.current) {
      audioRef.current.src = song.uri;
      audioRef.current.play();
    }

    setCurrentSong(song);
    loadMetadataForSong(song);
  };

  const playWithShuffle = async (contextId?: string, contextList?: Song[]) => {
    const targetList = contextList !== undefined ? contextList : songs;
    if (targetList.length === 0) return;
    const randomSong = targetList[Math.floor(Math.random() * targetList.length)];
    await playSound(randomSong, contextId, targetList, true);
  };

  const pauseOrResumeSound = async () => {
    if (!audioRef.current) return;

    if (isCrossfadingRef.current && crossfadeTimerRef.current) {
      // Si el usuario pausa durante el crossfade, pausamos ambos
      if (isPlaying) {
        audioRef.current.pause();
        secondaryAudioRef.current?.pause();
        setIsPlaying(false);
        // Para simplificar, cancelamos el crossfade y avanzamos directo
        clearInterval(crossfadeTimerRef.current);
        crossfadeTimerRef.current = null;
        isCrossfadingRef.current = false;
        audioRef.current.volume = 1;

        const secondary = secondaryAudioRef.current!;
        secondary.volume = 1;
        audioRef.current = secondary;
        secondaryAudioRef.current = audioRef.current; // old primary
        attachListeners(audioRef.current);
        clearListeners(secondaryAudioRef.current);
      }
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const playNext = async () => {
    if (currentQueueIndex.current >= 0 && currentQueueIndex.current < queueRef.current.length - 1) {
      currentQueueIndex.current += 1;
      const nextSong = queueRef.current[currentQueueIndex.current];
      playSound(nextSong, currentContextIdRef.current, undefined, false, false);
    } else if (repeatModeRef.current === 'queue' && queueRef.current.length > 0) {
      currentQueueIndex.current = 0;
      const nextSong = queueRef.current[0];
      playSound(nextSong, currentContextIdRef.current, undefined, false, false);
    }
  };

  const playPrevious = async () => {
    if (currentQueueIndex.current > 0) {
      currentQueueIndex.current -= 1;
      const prevSong = queueRef.current[currentQueueIndex.current];
      playSound(prevSong, currentContextIdRef.current, undefined, false, false);
    }
  };

  const seekTo = async (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
    }
  };

  const extractMetadataOnDemand = async (uri: string) => {
    const song = songs.find(s => s.uri === uri);
    if (song) {
      const meta = await window.api.getMetadata(song.path);
      return meta;
    }
    return { title: null, artist: null, album: null, cover: null, lyrics: null };
  };

  const toggleRepeatMode = async () => {
    if (repeatMode === 'off') setRepeatMode('queue');
    else if (repeatMode === 'queue') setRepeatMode('track');
    else setRepeatMode('off');
  };

  const toggleShuffle = async () => {
    const newState = !isShuffle;
    setIsShuffle(newState);

    if (!currentSong) return;

    if (newState) {
      const otherTracks = originalQueueRef.current.filter(s => s.id !== currentSong.id);
      for (let i = otherTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
      }
      const newQueue = [currentSong, ...otherTracks];
      queueRef.current = newQueue;
      setQueue(newQueue);
      currentQueueIndex.current = 0;
      setQueuePosition(1);
    } else {
      const newQueue = [...originalQueueRef.current];
      queueRef.current = newQueue;
      setQueue(newQueue);
      currentQueueIndex.current = newQueue.findIndex(s => s.id === currentSong.id);
      setQueuePosition(currentQueueIndex.current + 1);
    }
  };

  const reorderQueue = (startIndex: number, endIndex: number) => {
    const result = Array.from(queueRef.current);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    queueRef.current = result;
    setQueue(result);

    if (currentSong) {
      currentQueueIndex.current = result.findIndex(s => s.id === currentSong.id);
      setQueuePosition(currentQueueIndex.current + 1);
    }
  };

  return (
    <AudioContext.Provider value={{
      isScanning, songs, setSongs, albums, folders, artists, playlists,
      createPlaylist, updatePlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist, updatePlaylistCover,
      currentSong, isPlaying, metadata: { cover: currentSong?.cover || null, lyrics, audioDetails },
      playSound, playWithShuffle, pauseOrResumeSound, playNext, playPrevious, seekTo,
      progress, duration,
      metadataCache: {}, extractMetadataOnDemand, currentContextId,
      loadSongsFromUri, queue, queuePosition, queueLength, reorderQueue,
      toggleFavorite, isFavorite, repeatMode, toggleRepeatMode, isShuffle,
      toggleShuffle, changeMusicFolder, isPlayerOpen, setIsPlayerOpen,
      showLyrics, setShowLyrics, isCrossfadeEnabled, setIsCrossfadeEnabled,
      crossfadeDuration, setCrossfadeDuration, toastMessage, showToast
    }}>
      {children}
    </AudioContext.Provider>
  );
};
