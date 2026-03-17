import { Application, extend } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'
import { createFileRoute } from '@tanstack/react-router'
import { LayoutContainer } from '@pixi/layout/components'
import { useRef, useState } from 'react'
import { CursorTracker } from '../components/CursorTracker'
import { DebuggerOverlay } from '../components/DebuggerOverlay'
import { GridOverlay } from '../components/GridOverlay'
import { LayoutResizer } from '../components/LayoutResizer'
import { CameraController } from '../components/CameraController'
import { TokenDisplay } from '../components/Token'
import { useCamera } from '../hooks/useCamera'
import { useDebuggerOverlay } from '../hooks/useDebuggerOverlay'
import { createToken } from '../types/token'
import type { Token } from '../types/token'

export const Route = createFileRoute('/combat')({
  component: RouteComponent,
})

extend({
  Container,
  Graphics,
  LayoutContainer
})

/** Grid cell size in world-space units — must match the value passed to GridOverlay. */
const GRID_SIZE = 32

function RouteComponent() {
  const { camera, panBy, zoomAt } = useCamera()
  const combatContainerRef = useRef<HTMLDivElement | null>(null)
  const { gridCell } = useDebuggerOverlay({
    camera,
    gridSize: GRID_SIZE,
    containerRef: combatContainerRef,
  })

  // Demo tokens — one standard 1×1 token and one half-size token centred in its cell.
  const [tokens] = useState<Token[]>(() => [
    createToken('Goblin', 1),
    createToken('Sprite', 0.5),
  ])

  return (
    <div ref={combatContainerRef} style={{ position: 'relative' }}>
      <Application resizeTo={window} eventMode='static'>
          <LayoutResizer>
              <CameraController camera={camera} panBy={panBy} zoomAt={zoomAt} />
              <GridOverlay size={GRID_SIZE} zoom={camera.zoom} panX={camera.panX} panY={camera.panY} />
              {tokens.map((token, index) => (
                <TokenDisplay
                  key={token.id}
                  token={token}
                  gridCol={index * 2}
                  gridRow={0}
                  gridSize={GRID_SIZE}
                  camera={camera}
                />
              ))}
              <CursorTracker camera={camera} />
          </LayoutResizer>
      </Application>
      <DebuggerOverlay gridCell={gridCell} />
    </div>
  )
}
