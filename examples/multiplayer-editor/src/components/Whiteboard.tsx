'use client';

import { useState, useEffect, useCallback, useRef } from "react"
import type { Shape, User } from "../types"

type WhiteboardProps = {
  onCreateShape: (shape: Shape) => void
  onUpdateShape: (id: number, shape: Partial<Shape>) => void
  onCursorMove?: (position: { x: number, y: number } | null) => void
  shapes: Shape[]
  users?: User[]
}

export function Whiteboard({
  onCreateShape,
  onUpdateShape,
  onCursorMove = () => {},
  shapes,
  users = []
}: WhiteboardProps) {
  const [mode, setMode] = useState<'dragging' | 'creating' | null>(null)
  const [selectedShape, setSelectedShape] = useState<number | null>(null)
  const [dragStart, setDragStart] = useState<[number, number] | null>(null)
  const [shapeStart, setShapeStart] = useState<[number, number] | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)

  const renderCanvas = useCallback(() => {
    if (!ctx) return
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    ctx.save()
    ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2)
    for (const shape of shapes) {
      ctx.fillStyle = shape.color
      ctx.fillRect(shape.x, shape.y, shape.w, shape.h)
    }
    ctx.restore()
  }, [ctx, shapes])

  const resize = useCallback(() => {
    if (!canvasRef.current) return
    const { width, height } = canvasRef.current.getBoundingClientRect()
    canvasRef.current.width = width
    canvasRef.current.height = height
    renderCanvas()
  }, [renderCanvas])

  const setContext = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas === null) return
    canvasRef.current = canvas
    resize()
    setCtx(canvas.getContext('2d'))
  }, [resize])

  useEffect(() => {
    function onMouseUp() {
      setMode(null)
      setSelectedShape(null)
      setDragStart(null)
    }
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [resize])

  useEffect(() => {
    renderCanvas()
  })

  const onMouseLeave = () => {
    onCursorMove(null)
  }

  function getMousePosition(event: React.MouseEvent) {
    const { x, y, width, height } = event.currentTarget.getBoundingClientRect()
    return {
      x: event.clientX - x - width / 2,
      y: event.clientY - y - height / 2
    }
  }

  const onMouseDown = (event: React.MouseEvent) => {
    const { x, y } = getMousePosition(event)
    const dragStart: [number, number] = [x, y]

    // detect if cursor is clicking a shape
    let n = shapes.length
    while (n--) {
      const shape = shapes[n]
      if (pointRectIntersect(x, y, shape.x, shape.y, shape.w, shape.h)) {
        setMode('dragging')
        setSelectedShape(shape.id)
        setDragStart(dragStart)
        setShapeStart([shape.x, shape.y])
        return
      }
    }

    const id = Math.floor(Math.random() * 100000)
    const newShape = { x, y, w: 0, h: 0, color: randomColor(), id }
    setMode('creating')
    setSelectedShape(newShape.id)
    setDragStart(dragStart)
    onCreateShape(newShape)
  }

  const onMouseMove = (event: React.MouseEvent) => {
    const { x, y } = getMousePosition(event)
    onCursorMove({ x, y })

    const shape = shapes.find((s) => s.id === selectedShape)
    if (!mode || !shape || !dragStart) return
    if (mode === 'dragging') {
      if (!shapeStart) throw new Error('Should be a shapeStart here')
      const dx = x - dragStart[0]
      const dy = y - dragStart[1]
      onUpdateShape(shape.id, {
        x: shapeStart[0] + dx,
        y: shapeStart[1] + dy,
        w: shape.w,
        h: shape.h
      })
    } else if (mode === 'creating') {
      onUpdateShape(shape.id, {
        w: Math.abs(dragStart[0] - x),
        h: Math.abs(dragStart[1] - y),
        x: Math.min(dragStart[0], x),
        y: Math.min(dragStart[1], y)
      })
    }
  }

  const cursors = users
    .filter((u) => !!u.cursorX && !!u.cursorY && ctx)
    .map((u) => ({
        color: getColorFromStr(u.id),
        x: u.cursorX! + ctx!.canvas.width / 2,
        y: u.cursorY! + ctx!.canvas.height / 2
    }))

  return (
    <div className="w-full h-full relative">
      <canvas
        className="w-full h-full"
        ref={setContext}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      />
      {shapes.length > 0 ? null : (
        <div className="text-gray-500 text-xl font-light absolute top-0 w-full h-full flex items-center justify-center pointer-events-none">
          <div>Click and drag to draw rectangles</div>
        </div>
      )}
      <Cursors cursors={cursors} />
    </div>
  )
}

function Cursors({ cursors }: { cursors: { x: number, y: number, color: string }[] }) {
  return (
    <div className="absolute top-0 w-full h-full pointer-events-none z-10 bg-yellow overflow-hidden">
      {cursors.map(({ x, y, color }, idx) => {
        return <svg key={idx} className="absolute h-8 w-8" style={{ transform: `translate(${x}px, ${y}px)` }} width="100%" height="100%" viewBox="8 8 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 15.5068L10 10L12.8382 23L16.3062 17.8654L22 15.5068Z" fill={color}/>
          <path d="M22.1914 15.9687L23.2499 15.5302L22.2085 15.0523L10.2085 9.54556L9.29776 9.12761L9.51151 10.1066L12.3497 23.1066L12.5988 24.2477L13.2525 23.2799L16.6364 18.2698L22.1914 15.9687Z" stroke="white"/>
        </svg>
      })}
    </div>
  )
}

function pointRectIntersect(x: number, y: number, rectX: number, rectY: number, rectW: number, rectH: number) {
  return !(x < rectX || y < rectY || x > rectX + rectW || y > rectY + rectH)
}

const HUE_OFFSET = Math.random() * 360 | 0
function randomColor() {
  const h = (Math.random() * 60 + HUE_OFFSET) % 360 | 0
  const s = (Math.random() * 10 + 30) | 0
  const l = (Math.random() * 20 + 30) | 0
  return `hsl(${h}, ${s}%, ${l}%)`
}

export function AvatarList({ users }: { users: User[] }) {
  return (
    <div className="isolate flex -space-x-4 overflow-hidden">
      {users.map((u, i) => {
        const color = getColorFromStr(u.id)
        return (
          <span className="inline-block h-10 w-10 overflow-hidden rounded-full bg-gray-100 border-2 border-white" key={i}>
            <svg className="h-full w-full text-gray-300" fill={color} viewBox="0 0 24 24">
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </span>
        )
      })}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="bg-gray-600/50 text-gray-400 font-light p-4 flex items-center justify-center gap-3 rounded-md">
      <div className="animate-spin h-5 w-5 border-b-2 border-r-2 rounded-full border-gray-100/50" />
      Loading...
    </div>
  )
}

function getColorFromStr(str: string) {
  const hash = str
    .split('')
    .reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 65%)`
}
