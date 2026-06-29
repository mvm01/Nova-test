import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { startProxy } from './proxy/index.js'
import { startMcpServer } from './mcp/server.js'
import { setupIpcHandlers } from './ipc/handlers.js'
import { disableSystemProxySync } from './services/system-proxy.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

import os from 'os'
const logFile = path.join(os.tmpdir(), 'fiddler-killer-debug.log')
try {
  fs.writeFileSync(logFile, '--- App Started ---\\n')
} catch(e) {}
const originalConsoleLog = console.log
const originalConsoleError = console.error
console.log = (...args) => {
  try { fs.appendFileSync(logFile, `[LOG] ${args.join(' ')}\\n`) } catch(e) {}
  originalConsoleLog(...args)
}
console.error = (...args) => {
  try { fs.appendFileSync(logFile, `[ERR] ${args.join(' ')}\\n`) } catch(e) {}
  originalConsoleError(...args)
}

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.webContents.on('console-message', (_event, _level, message, _line, _sourceId) => {
    if (!app.isPackaged) {
      console.log(`[Renderer Console] ${message}`);
    }
  });
}

import { dialog } from 'electron'

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    const payloadsDir = path.join(app.getPath('documents'), 'Fiddler-Killer-Payloads')
    if (fs.existsSync(payloadsDir)) {
      try {
        const files = fs.readdirSync(payloadsDir)
        if (files.length > 0) {
          const choice = dialog.showMessageBoxSync({
            type: 'question',
            buttons: ['Clean Up Data', 'Keep Files'],
            defaultId: 0,
            cancelId: 1,
            title: 'Clean Up Large Payloads?',
            message: `There are ${files.length} large payload files saved in your Documents/Fiddler-Killer-Payloads folder from this session.\\n\\nDo you want to delete them to save disk space, or keep them for manual inspection?`
          })
          
          if (choice === 0) {
            fs.rmSync(payloadsDir, { recursive: true, force: true })
          }
        }
      } catch (e) {
        console.error('Error checking payload directory:', e)
      }
    }

    app.quit()
    win = null
  }
})

let isCleaningUp = false
const cleanupProxy = () => {
  if (isCleaningUp) return
  isCleaningUp = true
  disableSystemProxySync()
}

app.on('will-quit', cleanupProxy)

process.on('exit', cleanupProxy)
process.on('SIGINT', () => { cleanupProxy(); process.exit(0) })
process.on('SIGTERM', () => { cleanupProxy(); process.exit(0) })
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  cleanupProxy()
  process.exit(1)
})
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  cleanupProxy()
  process.exit(1)
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()

  // Start the proxy
  startProxy()

  // Start the MCP server stub
  startMcpServer()

  // Setup IPC handlers
  setupIpcHandlers()
})
