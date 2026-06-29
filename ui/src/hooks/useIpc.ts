export function useIpc() {
  const isElectron = !!(window as any).api

  return {
    send: (channel: string, data?: any) => {
      if (isElectron) {
        ;(window as any).api.send(channel, data)
      }
    },
    receive: (channel: string, func: (...args: any[]) => void) => {
      if (isElectron) {
        ;(window as any).api.receive(channel, func)
      }
    },
    invoke: async (channel: string, ...args: any[]) => {
      if (isElectron && (window as any).api.invoke) {
        return await (window as any).api.invoke(channel, ...args)
      }
      return null
    }
  }
}
