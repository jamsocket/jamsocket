import { createContext, useContext, useEffect, useState } from 'react'
import { SessionBackend } from '@jamsocket/client'

export type SpawnResult = {
  url: string
  name: string
  readyUrl: string
  statusUrl: string
  spawned: boolean
  bearerToken?: string
}

export const SessionBackendContext = createContext<SessionBackend | null>(null)

export function SessionBackendProvider({
  spawnResult,
  children,
}: {
  spawnResult: SpawnResult
  children: React.ReactNode
}) {
  const { url, statusUrl } = spawnResult
  const [backend, setBackend] = useState<SessionBackend | null>(null)

  useEffect(() => {
    setBackend(new SessionBackend(url, statusUrl))
    return () => {
      backend?.destroy()
    }
  }, [url, statusUrl])
  return (
    <SessionBackendContext.Provider value={backend}>
      {backend ? children : null}
    </SessionBackendContext.Provider>
  )
}

export function useReady(): boolean {
  const backend = useContext(SessionBackendContext)
  if (!backend) throw new Error('useReady must be used within a SessionBackendContext / Provider')
  const [isReady, setIsReady] = useState(backend.isReady())

  useEffect(() => {
    return backend.onReady(() => setIsReady(true))
  }, [backend])

  return isReady
}
