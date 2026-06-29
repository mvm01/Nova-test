import { useRef, useState, useMemo, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Session } from '../../../../shared/types.js'
import { cn } from '../../utils.js'
import { Search, RefreshCw } from 'lucide-react'

interface SessionListProps {
  sessions: Session[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function getStatusColor(status: number | undefined) {
  if (!status) return 'bg-gray-500'
  if (status >= 200 && status < 300) return 'bg-green-500'
  if (status >= 300 && status < 400) return 'bg-blue-500'
  if (status >= 400 && status < 500) return 'bg-yellow-500'
  if (status >= 500) return 'bg-red-500'
  return 'bg-gray-500'
}

function getMethodColor(method: string) {
  switch (method.toUpperCase()) {
    case 'GET': return 'text-blue-400'
    case 'POST': return 'text-green-400'
    case 'PUT': return 'text-yellow-400'
    case 'DELETE': return 'text-red-400'
    case 'PATCH': return 'text-purple-400'
    default: return 'text-gray-400'
  }
}

export function SessionList({ sessions, selectedId, onSelect }: SessionListProps) {
  const [filter, setFilter] = useState('')
  const [appFilter, setAppFilter] = useState('')
  const [loadedApps, setLoadedApps] = useState<string[]>([])
  const [isLoadingApps, setIsLoadingApps] = useState(false)
  const parentRef = useRef<HTMLDivElement>(null)

  const loadActiveApps = async () => {
    setIsLoadingApps(true)
    try {
      const apps = await (window as any).api.invoke('apps:get_active')
      if (apps && Array.isArray(apps)) {
        setLoadedApps(apps)
      }
    } catch (e) {
      console.error('Failed to load apps', e)
    } finally {
      setIsLoadingApps(false)
    }
  }

  useEffect(() => {
    loadActiveApps()
  }, [])

  const uniqueApps = useMemo(() => {
    const apps = new Set<string>(loadedApps)
    for (const s of sessions) {
      if (s.processName && s.processName !== 'Resolving...') {
        apps.add(s.processName)
      }
    }
    return Array.from(apps).sort()
  }, [sessions, loadedApps])

  const filteredSessions = useMemo(() => {
    let result = sessions
    if (appFilter) {
      result = result.filter(s => s.processName === appFilter)
    }
    if (filter) {
      const lowerFilter = filter.toLowerCase()
      result = result.filter(s => 
        s.request.url.toLowerCase().includes(lowerFilter) ||
        s.request.method.toLowerCase().includes(lowerFilter) ||
        s.response?.statusCode?.toString().includes(lowerFilter)
      )
    }
    return result
  }, [sessions, filter, appFilter])

  const rowVirtualizer = useVirtualizer({
    count: filteredSessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  })

  return (
    <div className="flex h-full flex-col border-r border-gray-700 bg-gray-900">
      {/* Filter Bar */}
      <div className="border-b border-gray-700 p-2 space-y-2">
        <div className="relative flex items-center rounded bg-gray-800 px-2 py-1">
          <Search className="mr-2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
            placeholder="Filter by URL, method, status..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          {uniqueApps.length > 0 ? (
            <select 
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="flex-1 bg-gray-800 text-sm text-gray-300 p-1 rounded outline-none border border-gray-700 focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="">Filter by App (All Apps)</option>
              {uniqueApps.map(app => (
                 <option key={app} value={app}>{app}</option>
              ))}
            </select>
          ) : (
            <div className="flex-1 text-xs text-gray-500 italic">No apps found yet</div>
          )}
          <button 
            onClick={loadActiveApps}
            disabled={isLoadingApps}
            className="p-1 rounded bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50 text-gray-400 flex items-center justify-center"
            title="Load all active desktop apps"
          >
            <RefreshCw className={cn("h-4 w-4", isLoadingApps && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* List Header */}
      <div className="flex px-4 py-2 text-xs font-semibold text-gray-400 border-b border-gray-800">
        <div className="w-16">Stat</div>
        <div className="w-16">Method</div>
        <div className="flex-1">URL</div>
        <div className="w-16 text-right">Time</div>
      </div>

      {/* Virtualized List or Empty State */}
      <div ref={parentRef} className="flex-1 overflow-auto relative">
        {filteredSessions.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 space-y-4 p-8 text-center">
            {appFilter ? (
              <>
                <div className="text-lg font-semibold text-gray-400">No traffic captured for {appFilter}</div>
                <div className="text-sm max-w-md">
                  This app might not be making any network requests right now, or it ignores the Windows System Proxy settings.
                </div>
                <div className="text-sm max-w-md bg-gray-800 p-3 rounded text-left border border-gray-700">
                  <span className="font-semibold text-gray-300">Tip:</span> Browsers like Chrome work automatically. Command-line tools (Node, Python, Go) often require setting environment variables manually:
                  <code className="block mt-2 text-blue-400 bg-gray-900 p-1 rounded select-all">set HTTP_PROXY=http://127.0.0.1:8080</code>
                </div>
              </>
            ) : (
              <div className="text-lg font-semibold text-gray-400">Waiting for traffic...</div>
            )}
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const session = filteredSessions[virtualItem.index]
              const isSelected = session.id === selectedId

              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className={cn(
                    "flex cursor-pointer items-center border-b border-gray-800 px-4 text-sm transition-colors",
                    isSelected ? "bg-blue-900/50" : "hover:bg-gray-800"
                  )}
                  onClick={() => onSelect(session.id)}
                >
                  <div className="w-16 flex items-center space-x-2">
                    <div className={cn("h-2 w-2 rounded-full", getStatusColor(session.response?.statusCode))} />
                    <span className={(session.response?.statusCode || 0) >= 400 ? 'text-red-400' : 'text-gray-300'}>
                      {session.response?.statusCode || '...'}
                    </span>
                  </div>
                  <div className={cn("w-16 font-mono font-medium", getMethodColor(session.request.method))}>
                    {session.request.method}
                  </div>
                  <div className="flex-1 truncate text-gray-300 flex flex-col justify-center" title={session.request.url}>
                    <div className="truncate">{session.request.url}</div>
                    {session.processName && (
                      <div className="text-[10px] text-gray-500 truncate mt-0.5">
                        {session.processName}
                      </div>
                    )}
                  </div>
                  <div className="w-16 text-right text-xs text-gray-500">
                    {session.response?.timing?.duration ? `${session.response.timing.duration}ms` : '-'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
