import { useContext, useEffect, useState, createContext, Dispatch, SetStateAction } from 'react'
import { io, Socket } from 'socket.io-client'
import { useReady } from './react'

export type Event = {
  event: string
  args: string // these are stringified args - to freeze them in place
}

export const SocketIOContext = createContext<{
  socket: Socket | null
  setEvents: Dispatch<SetStateAction<Event[]>>
}>({
  socket: null,
  setEvents: () => {},
})

export function SocketIOProvider({ url, children }: { url: string; children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const ready = useReady()
  useEffect(() => {
    if (ready) {
      const backendUrl = new URL(url)
      const path = backendUrl.pathname.replace(/\/$/, '')
      const socketConnection = io(backendUrl.origin, { path: `${path}/socket.io/` })
      socketConnection.connect()
      events.forEach((event) => {
        if (event?.event && event?.args) {
          socketConnection.emit(event.event, JSON.parse(event.args))
        }
      })
      setEvents([])
      setSocket(socketConnection)
      return () => {
        socketConnection.disconnect()
      }
    }
  }, [url, ready])

  return (
    <SocketIOContext.Provider value={{ socket, setEvents }}>{children}</SocketIOContext.Provider>
  )
}

export function useSend<T>(): (newEvent: string, msg: T) => void {
  const { socket, setEvents } = useContext(SocketIOContext)
  return (newEvent: string, msg: T) => {
    if (socket) {
      socket.emit(newEvent, msg)
    } else {
      setEvents((prevEvents) => [...prevEvents, { event: newEvent, args: JSON.stringify(msg) }])
    }
  }
}

export function useEventListener<T>(event: string, callback: (msg: T) => void) {
  const { socket } = useContext(SocketIOContext)
  useEffect(() => {
    if (!socket) {
      return
    }
    socket.on(event, callback)
    return () => {
      socket.off(event, callback)
    }
  }, [socket, event, callback])
}
