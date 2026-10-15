import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
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
    // Configurar User-Agent de Chrome estándar (evita que YouTube detecte Electron y bloquee la reproducción)
    const customUserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    session.defaultSession.setUserAgent(customUserAgent)

    // 1. Interceptar encabezados recibidos para eliminar X-Frame-Options y CSP restrictivos
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      if (
        details.url.includes('youtube.com') ||
        details.url.includes('youtube-nocookie.com') ||
        details.url.includes('googlevideo.com')
      ) {
        const headers = { ...details.responseHeaders }
        delete headers['x-frame-options']
        delete headers['X-Frame-Options']
        delete headers['frame-options']
        for (const key of Object.keys(headers)) {
          if (key.toLowerCase() === 'content-security-policy') {
            headers[key] = headers[key].map((csp) =>
              csp.replace(/frame-ancestors[^;]+;?/gi, '')
            )
          }
        }
        callback({ cancel: false, responseHeaders: headers })
      } else {
        callback({ cancel: false, responseHeaders: details.responseHeaders })
      }
    })

    // 2. Interceptar encabezados enviados para proveer Referer y Origin válidos de YouTube (elimina error 152-4)
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      if (
        details.url.includes('youtube.com') ||
        details.url.includes('youtube-nocookie.com') ||
        details.url.includes('googlevideo.com')
      ) {
        const headers = { ...details.requestHeaders }
        for (const key of Object.keys(headers)) {
          if (key.toLowerCase() === 'referer' || key.toLowerCase() === 'origin') {
            delete headers[key]
          }
        }
        headers['Referer'] = 'https://www.youtube.com/'
        headers['Origin'] = 'https://www.youtube.com'
        callback({ cancel: false, requestHeaders: headers })
      } else {
        callback({ cancel: false, requestHeaders: details.requestHeaders })
      }
    })

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
