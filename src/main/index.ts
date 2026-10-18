import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import type { Session } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setupIpc } from './ipc'

// Aumentar significativamente los límites de memoria de video (VRAM) para texturas/tiles
// Esto soluciona el "tile memory limits exceeded" en monitores 2K/4K
app.commandLine.appendSwitch('force-gpu-mem-available-mb', '4096')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')

// Partición (sesión) aislada donde vive el <webview> de YouTube.
// DEBE coincidir con el atributo `partition` del <webview> en IntegratedVideoPlayer.tsx
const YT_PARTITION = 'persist:youtube'

// User-Agent de Chrome limpio, construido con la versión REAL de Chromium de este Electron
// (sin "Electron/" ni el nombre de la app). Así no queda desfasado cuando actualices Electron.
function buildChromeUserAgent(): string {
  const major = process.versions.chrome.split('.')[0]
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`
}

// Hosts a los que se permite navegar dentro del <webview> (YouTube + login/consentimiento de Google)
function isAllowedWebviewNavigation(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url)
    if (protocol !== 'https:') return false
    return (
      hostname === 'youtube.com' ||
      hostname.endsWith('.youtube.com') ||
      hostname === 'google.com' ||
      hostname.endsWith('.google.com')
    )
  } catch {
    return false
  }
}

function configureYouTubeSession(ses: Session): void {
  ses.setUserAgent(buildChromeUserAgent())

  // Solo agregamos el Referer cuando falta y únicamente en la carga del documento
  // (mainFrame / subFrame). Ya NO tocamos Origin ni los requests de googlevideo.com,
  // porque forzarlos podía romper las peticiones del reproductor.
  ses.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'] },
    (details, callback) => {
      const headers = details.requestHeaders
      const hasReferer = Object.keys(headers).some((k) => k.toLowerCase() === 'referer')
      const isDocument = details.resourceType === 'mainFrame' || details.resourceType === 'subFrame'
      if (!hasReferer && isDocument) {
        headers['Referer'] = 'https://www.youtube.com/'
      }
      callback({ requestHeaders: headers })
    }
  )
}

// Seguridad extra para todos los <webview> de la app
app.on('web-contents-created', (_event, contents) => {
  // Ventana principal: los webviews no pueden tener Node ni preload propio
  contents.on('will-attach-webview', (_e, webPreferences) => {
    delete webPreferences.preload
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true
  })

  if (contents.getType() === 'webview') {
    // Sin ventanas emergentes: lo externo se abre en el navegador del sistema
    contents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) shell.openExternal(url)
      return { action: 'deny' }
    })

    // El webview no puede salirse de YouTube/Google
    contents.on('will-navigate', (event, url) => {
      if (!isAllowedWebviewNavigation(url)) event.preventDefault()
    })
  }
})

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#808080',
      height: 38
    },
    title: 'Fuzion Player',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false,
      webviewTag: true,
      backgroundThrottling: false,
      devTools: false
    }
  })

  // Forzar reseteo de zoom a su tamaño original (100%) y fijar límites
  mainWindow.webContents.setZoomLevel(0)
  mainWindow.webContents.setZoomFactor(1.0)
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1)

  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.setZoomLevel(0)
    mainWindow.webContents.setZoomFactor(1.0)
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomLevel(0)
    mainWindow.webContents.setZoomFactor(1.0)
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1)
  })

  // Bloquear atajos de zoom (Ctrl +, Ctrl -, Ctrl 0), F12, DevTools e inspeccionar
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Bloquear Ctrl + +, Ctrl + -, Ctrl + 0
    if (input.control || input.meta) {
      if (
        input.key === '+' ||
        input.key === '=' ||
        input.key === '-' ||
        input.key === '_' ||
        input.key === '0' ||
        input.code === 'NumpadAdd' ||
        input.code === 'NumpadSubtract' ||
        input.code === 'Equal' ||
        input.code === 'Minus' ||
        input.code === 'Digit0'
      ) {
        event.preventDefault()
      }

      // Bloquear atajos de inspeccionar / herramientas de desarrollo (Ctrl + Shift + I/J/C) y ver código fuente (Ctrl + U)
      if (
        (input.shift && ['i', 'j', 'c'].includes(input.key?.toLowerCase() || '')) ||
        input.key?.toLowerCase() === 'u'
      ) {
        event.preventDefault()
      }
    }

    // Bloquear tecla F12
    if (input.key === 'F12') {
      event.preventDefault()
    }
  })

  // Prevenir zoom con rueda del ratón
  mainWindow.webContents.on('zoom-changed', (event) => {
    event.preventDefault()
    mainWindow.webContents.setZoomFactor(1.0)
  })

  // Prevenir menú contextual del navegador (evita la opción de "Inspeccionar elemento")
  mainWindow.webContents.on('context-menu', (event) => {
    event.preventDefault()
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Prevent multiple instances which can cause cache lock issues
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  // Configuración de caché dedicada de alto rendimiento
  const cachePath = join(app.getPath('userData'), 'cybecat-cache')
  app.commandLine.appendSwitch('disk-cache-dir', cachePath)
  app.commandLine.appendSwitch('disk-cache-size', '1073741824') // 1GB
  app.commandLine.appendSwitch('media-cache-size', '536870912') // 500MB

  // Disable OS DPI Scaling
  app.commandLine.appendSwitch('high-dpi-support', '1')
  app.commandLine.appendSwitch('force-device-scale-factor', '1')

  // Prevent background throttling of JS/Audio
  app.commandLine.appendSwitch('disable-background-timer-throttling')
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
  app.commandLine.appendSwitch('disable-renderer-backgrounding')

  app.on('second-instance', () => {
    // Alguien intentó abrir otra instancia, enfocamos la original
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    // Sesión aislada para el reproductor de YouTube (<webview partition="persist:youtube">):
    // User-Agent de Chrome limpio + Referer válido en la carga del documento.
    configureYouTubeSession(session.fromPartition(YT_PARTITION))

    // Set app user model id for windows
    electronApp.setAppUserModelId('com.kevin.fuzionplayer')

    // IPC test
    ipcMain.on('ping', () => console.log('pong'))

    ipcMain.on('theme-changed', (event, isDarkMode) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win) {
        win.setTitleBarOverlay({
          color: '#00000000',
          symbolColor: isDarkMode ? '#ffffff' : '#000000',
          height: 38
        })
      }
    })

    setupIpc()

    createWindow()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
