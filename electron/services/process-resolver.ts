import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const portToAppCache = new Map<number, string>()
const pendingResolutions = new Map<number, Promise<string | null>>()

export async function getAppNameFromPort(port: number): Promise<string | null> {
  if (process.platform !== 'win32') {
    return null
  }

  if (portToAppCache.has(port)) {
    return portToAppCache.get(port)!
  }

  if (pendingResolutions.has(port)) {
    return pendingResolutions.get(port)!
  }

  const promise = (async () => {
    try {
      // Find the PID associated with the port
      const { stdout: netstatOut } = await execAsync(`netstat -ano | findstr :${port}`)
      
      const lines = netstatOut.trim().split('\n')
      let pid: string | null = null
      for (const line of lines) {
        if (line.includes('ESTABLISHED') || line.includes('TIME_WAIT') || line.includes('CLOSE_WAIT')) {
          const parts = line.trim().split(/\s+/)
          // In netstat -ano, columns are: Proto, Local Address, Foreign Address, State, PID
          const localAddress = parts[1]
          if (localAddress && localAddress.endsWith(':' + port)) {
            pid = parts[parts.length - 1]
            if (pid) break
          }
        }
      }
      
      console.log(`[ProcessResolver] Port ${port} -> PID ${pid || 'NOT FOUND'}`)
      
      if (!pid) return null
      
      // Map PID to process name
      const { stdout: tasklistOut } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`)
      
      // Output example: "chrome.exe","12345","Console","7","150,000 K"
      const match = tasklistOut.match(/"([^"]+)"/)
      if (match) {
        const appName = match[1]
        console.log(`[ProcessResolver] PID ${pid} -> App ${appName}`)
        portToAppCache.set(port, appName)
        
        // Basic cleanup to avoid memory leak over very long sessions
        if (portToAppCache.size > 10000) {
          const firstKey = portToAppCache.keys().next().value
          if (firstKey) portToAppCache.delete(firstKey)
        }
        
        return appName
      }
    } catch (e) {
      // Error resolving, might be transient
    } finally {
      pendingResolutions.delete(port)
    }
    return null
  })()

  pendingResolutions.set(port, promise)
  return promise
}

export async function getAllActiveApps(): Promise<string[]> {
  if (process.platform !== 'win32') return []
  
  try {
    const { stdout } = await execAsync(`tasklist /FO CSV /NH`)
    const lines = stdout.trim().split('\n')
    const apps = new Set<string>()
    
    for (const line of lines) {
      const match = line.match(/"([^"]+)"/)
      if (match) {
        apps.add(match[1])
      }
    }
    
    return Array.from(apps).sort()
  } catch (e) {
    return []
  }
}
