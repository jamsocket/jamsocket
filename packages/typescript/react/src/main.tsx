import { createContext, useContext, useEffect, useState } from 'react'
import { type ConnectResponse, SessionBackend } from '@jamsocket/client'
export * from '@jamsocket/client'

export const SessionBackendContext = createContext<SessionBackend | null>(null)

type SessionBackendProviderProps = {
  connectResponse: ConnectResponse
  children: React.ReactNode
}

export function SessionBackendProvider({ connectResponse, children }: SessionBackendProviderProps) {
  const [backend, setBackend] = useState<SessionBackend | null>(null)

  useEffect(() => {
    setBackend(new SessionBackend(connectResponse))
    return () => {
      backend?.destroy()
    }
    // the two pieces of state that, together, uniquely identify a SessionBackend connection
  }, [connectResponse.url, connectResponse.backend_id])
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
