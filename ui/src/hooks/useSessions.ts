import { useState, useEffect, useCallback } from 'react'
import type { Session } from '../../../shared/types.js'
import { useIpc } from './useIpc.js'

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const ipc = useIpc()

  useEffect(() => {
    // Initial fetch
    ipc.invoke('sessions:get').then((initialSessions) => {
      if (initialSessions) {
        setSessions(initialSessions)
      }
    })

    // Listen for updates
    ipc.receive('sessions:update', (updatedSessions: Session[]) => {
      console.log('[useSessions] received:', updatedSessions)
      setSessions([...updatedSessions])
    })
  }, [])

  const clearSessions = useCallback(() => {
    ipc.invoke('sessions:clear')
    setSelectedSessionId(null)
  }, [ipc])

  const selectedSession = sessions.find(s => s.id === selectedSessionId) || null

  return {
    sessions,
    selectedSession,
    setSelectedSessionId,
    clearSessions
  }
}
