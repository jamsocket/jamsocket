"use client";

import { useState } from 'react'
import Header from './Header'
import Content from './Content'
import { AvatarList, Spinner, Whiteboard } from './Whiteboard'
import type { Shape, User } from '../types'
import { SocketIOProvider, useEventListener, useSend, SessionBackendProvider, useReady, type SpawnResult } from "@jamsocket/socketio"

export default function HomeContainer({ spawnResult }: { spawnResult: SpawnResult }) {
  return (
    <SessionBackendProvider spawnResult={spawnResult}>
      <SocketIOProvider url={spawnResult.url}>
        <Home />
      </SocketIOProvider>
    </SessionBackendProvider>
  )
}

function Home() {
  const ready = useReady()
  const sendEvent = useSend()

  const [shapes, setShapes] = useState<Shape[]>([])
  const [users, setUsers] = useState<User[]>([])

  useEventListener<string>('user-entered', (id) => {
    const newUser = { cursorX: null, cursorY: null, id }
    setUsers((users) => [...users, newUser])
  })

  useEventListener<string>('user-exited', (id) => {
    setUsers((users) => users.filter((p) => p.id !== id))
  })

  useEventListener<User>('cursor-position', (user) => {
    setUsers((users) => users.map((p) => p.id === user.id ? user : p))
  })

  useEventListener<Shape[]>('snapshot', (shapes) => {
    setShapes(shapes)
  })

  useEventListener<Shape>('update-shape', (shape) => {
    setShapes((shapes) => {
      const shapeToUpdate = shapes.find((s) => s.id === shape.id)
      if (!shapeToUpdate) return [...shapes, shape]
      return shapes.map((s) => s.id === shape.id ? { ...s, ...shape } : s)
    })
  })

  return (
    <main>
      <Header>
        <AvatarList users={users} />
      </Header>
      <Content>
        {ready ? (
          <Whiteboard
            shapes={shapes}
            users={users}
            onCursorMove={(position) => {
              sendEvent('cursor-position', { x: position?.x, y: position?.y })
            }}
            onCreateShape={(shape) => {
              sendEvent('create-shape', shape)
              setShapes([...shapes, shape])
            }}
            onUpdateShape={(id, shape) => {
              sendEvent('update-shape', { id, ...shape })
              setShapes((shapes) => shapes.map((s) => s.id === id ? { ...s, ...shape } : s))
            }}
          />
        ) : <Spinner />}
      </Content>
    </main>
  )
}
