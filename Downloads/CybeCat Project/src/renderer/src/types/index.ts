export interface Song {
  id: string;
  uri: string;
  path: string;
  filename: string;
  folder: string;
  duration: number;
  title?: string;
  // Extra metadata populated later
  album?: string;
  artist?: string;
  cover?: string | null;
  lyrics?: string;
  hasLyrics?: boolean;
  trackNumber?: number;
  year?: string;
}

export interface Metadata {
  title: string | null;
  artist: string | null;
  album: string | null;
  cover: string | null;
  lyrics: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover?: string | null;
  songIds: string[];
  isAuto?: boolean;
}

export interface Album {
  name: string;
  artist: string;
  cover: string | null;
  songs: Song[];
  year?: string;
}

export interface Folder {
  name: string;
  cover: string | null;
  songs: Song[];
}

export interface Artist {
  name: string;
  cover: string | null;
  songs: Song[];
}

export interface AudioContextType {
  isScanning: boolean;
  songs: Song[];
  setSongs: (songs: Song[]) => void;
  albums: Record<string, Album>;
  folders: Record<string, Folder>;
  artists: Record<string, Artist>;
  playlists: Playlist[];
  createPlaylist: (name: string, description?: string, cover?: string) => Promise<void>;
  updatePlaylist: (playlistId: string, updates: Pick<Playlist, 'name' | 'description' | 'cover'>) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  updatePlaylistCover: (playlistId: string, coverUri: string) => Promise<void>;
  currentSong: Song | null;
  isPlaying: boolean;
  metadata: { cover: string | null; lyrics: string | null; audioDetails: { bitrate?: number; sampleRate?: number; format?: string } | null };
  playSound: (song: Song, contextId?: string, contextList?: Song[], forceShuffle?: boolean, rebuildQueue?: boolean) => Promise<void>;
  playWithShuffle: (contextId?: string, contextList?: Song[]) => Promise<void>;
  pauseOrResumeSound: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (millis: number) => Promise<void>;
  metadataCache: Record<string, { title: string | null; artist: string | null; album: string | null; coverUri: string | null; lyrics: string | null }>;
  extractMetadataOnDemand: (uri: string) => Promise<{ title: string | null; artist: string | null; album: string | null; cover: string | null; lyrics: string | null }>;
  progress: number;
  duration: number;
  loadSongsFromUri: (uri?: string, isBackgroundLoad?: boolean) => Promise<void>;
  currentContextId: string;
  queue: Song[];
  queuePosition: number;
  queueLength: number;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  
  toggleFavorite: (songId: string) => Promise<void>;
  isFavorite: (songId: string) => boolean;
  
  repeatMode: 'off' | 'track' | 'queue';
  toggleRepeatMode: () => Promise<void>;
  
  isShuffle: boolean;
  toggleShuffle: () => Promise<void>;
  changeMusicFolder: () => Promise<void>;
  isPlayerOpen: boolean;
  setIsPlayerOpen: (open: boolean) => void;
  showLyrics: boolean;
  setShowLyrics: (show: boolean) => void;
  isCrossfadeEnabled: boolean;
  setIsCrossfadeEnabled: (enabled: boolean) => void;
  crossfadeDuration: number;
  setCrossfadeDuration: (duration: number) => void;
  toastMessage: { msg: string, type: 'success' | 'error' } | null;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}
