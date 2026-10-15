/// <reference types="vite/client" />

interface Window {
  api: {
    openDirectory: () => Promise<string | null>;
    openImageFile: () => Promise<string | null>;
    readMusicFiles: (folderPath: string, existingSongs?: any[]) => Promise<any>;
    getMetadata: (filePath: string) => Promise<any>;
    getCover: (filePath: string, hq?: boolean) => Promise<string | null>;
    getArtistImage: (artistName: string, sampleSongPath?: string) => Promise<string | null>;
    getArtistCache: () => Promise<Record<string, string | null>>;
    translateLyrics: (songId: string, lines: string[], targetLang?: string) => Promise<string[]>;
    getAvailableTranslations: (songId: string) => Promise<string[]>;
    deleteTranslation: (songId: string, targetLang: string) => Promise<boolean>;
    saveTranslation: (songId: string, targetLang: string, lines: string[]) => Promise<boolean>;
    translateUI: (langCode: string, baseDictionary: Record<string, any>) => Promise<Record<string, any> | null>;
    getTranslatedUI: (langCode: string) => Promise<Record<string, any> | null>;
    getAlbumInfo: (artistName: string, albumName: string) => Promise<string | null>;
    searchYouTube: (query: string) => Promise<{ id: string; title: string; thumbnail?: string; duration?: string; channel?: string }[]>;
    openExternal: (url: string) => Promise<boolean>;
    setTheme: (isDark: boolean) => void;
  };
}

declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string;
      allowpopups?: string | boolean;
      useragent?: string;
      httpreferrer?: string;
      webpreferences?: string;
      partition?: string;
    };
  }
}
