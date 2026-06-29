import { Group, Panel, Separator } from 'react-resizable-panels'
import { SessionList } from '../components/SessionList/SessionList.js'
import { InspectorTabs } from '../components/Inspector/InspectorTabs.js'
import { useSessions } from '../hooks/useSessions.js'
import { Trash2 } from 'lucide-react'

export function MainLayout() {
  const { sessions, selectedSession, setSelectedSessionId, clearSessions } = useSessions()

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-900 text-gray-200">
      <header className="flex h-12 items-center justify-between border-b border-gray-700 bg-gray-800 px-4">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <h1 className="font-semibold text-white">Nova Test</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={clearSessions}
            className="flex items-center space-x-1 rounded px-2 py-1 text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Group orientation="horizontal">
          <Panel defaultSize={35} minSize={20}>
            <SessionList 
              sessions={sessions} 
              selectedId={selectedSession?.id || null} 
              onSelect={setSelectedSessionId} 
            />
          </Panel>
          
          <Separator className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
          
          <Panel defaultSize={65} minSize={30}>
            {selectedSession ? (
              <InspectorTabs session={selectedSession} />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                Select a session to inspect details
              </div>
            )}
          </Panel>
        </Group>
      </main>
    </div>
  )
}
