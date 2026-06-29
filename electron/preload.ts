import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    send: (channel: string, data: any) => {
      // whitelist channels
      let validChannels = ['toMain']
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data)
      }
    },
    receive: (channel: string, func: (...args: any[]) => void) => {
      let validChannels = ['sessions:update']
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (_event, ...args) => {
          console.log(`[Preload] Received on ${channel}:`, args)
          func(...args)
        })
      }
    },
    invoke: async (channel: string, ...args: any[]) => {
      let validChannels = ['sessions:get', 'sessions:clear', 'apps:get_active', 'files:save-body']
      if (validChannels.includes(channel)) {
        return await ipcRenderer.invoke(channel, ...args)
      }
    }
  }
)
