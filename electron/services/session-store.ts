import { BrowserWindow } from 'electron'
import type { Session } from '../../shared/types.js'
import { IPC_CHANNELS } from '../../shared/constants.js'

let sessions: Session[] = []

export function addSession(session: Session) {
  sessions.push(session)
  broadcastUpdate()
}

export function updateSession(id: string, updates: Partial<Session>) {
  const index = sessions.findIndex(s => s.id === id)
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates }
    broadcastUpdate()
  }
}

export function getSessions(): Session[] {
  return sessions
}

import fs from 'fs'

export function clearSessions() {
  for (const session of sessions) {
    if (session.request.bodyFile) {
      try { fs.unlinkSync(session.request.bodyFile) } catch (e) {}
    }
    if (session.response?.bodyFile) {
      try { fs.unlinkSync(session.response.bodyFile) } catch (e) {}
    }
  }
  sessions = []
  broadcastUpdate()
}

function broadcastUpdate() {
  const windows = BrowserWindow.getAllWindows()
  console.log(`[SessionStore] Broadcasting update to ${windows.length} windows`)
  for (const win of windows) {
    try {
      win.webContents.send(IPC_CHANNELS.SESSIONS_UPDATE, JSON.parse(JSON.stringify(sessions)))
    } catch (e) {
      console.error('Failed to send sessions', e)
    }
  }
}
