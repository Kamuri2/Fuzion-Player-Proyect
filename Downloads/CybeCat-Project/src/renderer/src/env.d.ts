/// <reference types="vite/client" />

interface Window {
  api: {
    openDirectory: () => Promise<string | null>;
    openImageFile: () => Promise<string | null>;
    readMusicFiles: (folderPath: string) => Promise<any[]>;
    getMetadata: (filePath: string) => Promise<any>;
    getCover: (filePath: string) => Promise<string | null>;
    getArtistImage: (artistName: string) => Promise<string | null>;
    getArtistCache: () => Promise<Record<string, string | null>>;
    translateLyrics: (songId: string, lines: string[], targetLang?: string) => Promise<string[]>;
    translateUI: (langCode: string, baseDictionary: Record<string, any>) => Promise<Record<string, any> | null>;
    getTranslatedUI: (langCode: string) => Promise<Record<string, any> | null>;
  };
}
