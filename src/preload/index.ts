import { contextBridge, ipcRenderer, webFrame } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Forzar reseteo del nivel de zoom en el frame web al 100%
try {
  webFrame.setZoomLevel(0)
  webFrame.setZoomFactor(1.0)
  webFrame.setVisualZoomLevelLimits(1, 1)
} catch (e) {}

// Custom APIs for renderer
const api = {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openImageFile: () => ipcRenderer.invoke('dialog:openImageFile'),
  readMusicFiles: (folderPath: string, existingSongs?: any[]) => ipcRenderer.invoke('fs:readMusicFiles', folderPath, existingSongs),
  getMetadata: (filePath: string) => ipcRenderer.invoke('fs:getMetadata', filePath),
  getCover: (filePath: string, hq: boolean = true) => ipcRenderer.invoke('fs:getCover', filePath, hq),
  getArtistImage: (artistName: string, sampleSongPath?: string) => ipcRenderer.invoke('api:getArtistImage', artistName, sampleSongPath),
  getArtistCache: () => ipcRenderer.invoke('api:getArtistCache'),
  translateLyrics: (songId: string, lines: string[], targetLang: string = 'es') => ipcRenderer.invoke('api:translateLyrics', songId, lines, targetLang),
  getAvailableTranslations: (songId: string) => ipcRenderer.invoke('api:getAvailableTranslations', songId),
  deleteTranslation: (songId: string, targetLang: string) => ipcRenderer.invoke('api:deleteTranslation', songId, targetLang),
  saveTranslation: (songId: string, targetLang: string, lines: string[]) => ipcRenderer.invoke('api:saveTranslation', songId, targetLang, lines),
  translateUI: (langCode: string, baseDictionary: any) => ipcRenderer.invoke('api:translateUI', langCode, baseDictionary),
  getTranslatedUI: (langCode: string) => ipcRenderer.invoke('api:getTranslatedUI', langCode),
  getAlbumInfo: (artistName: string, albumName: string) => ipcRenderer.invoke('api:getAlbumInfo', artistName, albumName),
  searchYouTube: (query: string) => ipcRenderer.invoke('api:searchYouTube', query),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  setTheme: (isDark: boolean) => ipcRenderer.send('theme-changed', isDark)
}
// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
