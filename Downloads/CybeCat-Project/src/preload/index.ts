import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import { ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openImageFile: () => ipcRenderer.invoke('dialog:openImageFile'),
  readMusicFiles: (folderPath: string) => ipcRenderer.invoke('fs:readMusicFiles', folderPath),
  getMetadata: (filePath: string) => ipcRenderer.invoke('fs:getMetadata', filePath),
  getCover: (filePath: string) => ipcRenderer.invoke('fs:getCover', filePath),
  getArtistImage: (artistName: string) => ipcRenderer.invoke('api:getArtistImage', artistName),
  getArtistCache: () => ipcRenderer.invoke('api:getArtistCache'),
  translateLyrics: (songId: string, lines: string[], targetLang: string = 'es') => ipcRenderer.invoke('api:translateLyrics', songId, lines, targetLang),
  translateUI: (langCode: string, baseDictionary: any) => ipcRenderer.invoke('api:translateUI', langCode, baseDictionary),
  getTranslatedUI: (langCode: string) => ipcRenderer.invoke('api:getTranslatedUI', langCode)
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
