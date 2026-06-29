import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants.js'
import { getSessions, clearSessions } from '../services/session-store.js'
import { getAllActiveApps } from '../services/process-resolver.js'

export function setupIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_SESSIONS, () => {
    return getSessions()
  })

  ipcMain.on(IPC_CHANNELS.CLEAR_SESSIONS, () => {
    clearSessions()
  })

  ipcMain.handle(IPC_CHANNELS.GET_ACTIVE_APPS, async () => {
    return await getAllActiveApps()
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_BODY_FILE, async (event, sourcePath: string) => {
    const win = require('electron').BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePath } = await require('electron').dialog.showSaveDialog(win!, {
      title: 'Save Payload',
      defaultPath: 'payload.bin'
    })
    
    if (!canceled && filePath) {
      try {
        require('fs').copyFileSync(sourcePath, filePath)
        return true
      } catch (err) {
        console.error('Failed to save file:', err)
        return false
      }
    }
    return false
  })
}
