import { Application, extend } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'
import { createFileRoute } from '@tanstack/react-router'
import { LayoutContainer } from '@pixi/layout/components'
import { useCallback, useRef, useState } from 'react'
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
import type { Vector2 } from '../lib/vector2'

export const Route = createFileRoute('/combat')({
  component: RouteComponent,
})

extend({
  Container,
  Graphics,
  LayoutContainer
})

/** Grid cell size in world-space units — must match the value passed to GridOverlay. */
const GRID_SIZE = 64

type TokenPlacement = {
  token: Token
  position: Vector2
}

function RouteComponent() {
  const { camera, panBy, zoomAt } = useCamera()
  const combatContainerRef = useRef<HTMLDivElement | null>(null)
  const { gridCell } = useDebuggerOverlay({
    camera,
    gridSize: GRID_SIZE,
    containerRef: combatContainerRef,
  })

  const [showCursorTracker, setShowCursorTracker] = useState(false);

  const [tokenPlacements, setTokenPlacements] = useState<Map<string, TokenPlacement>>(() => {
    const map = new Map<string, TokenPlacement>()
    const goblin = createToken('Goblin', 1)
    const sprite = createToken('Sprite', 0.5)
    map.set(goblin.id, { token: goblin, position: { x: 0, y: 0 } })
    map.set(sprite.id, { token: sprite, position: { x: 2, y: 0 } })
    return map
  })

  const [hoveredTokenName, setHoveredTokenName] = useState<string | null>(null)

  const handleTokenHover = useCallback((name: string | null) => {
    setHoveredTokenName(name)
  }, [])

  const handleTokenMove = useCallback((id: string, newPosition: Vector2) => {
    setTokenPlacements(prev => {
      const placement = prev.get(id)
      if (!placement) return prev
      const next = new Map(prev)
      next.set(id, { ...placement, position: newPosition })
      return next
    })
  }, [])

  return (
    <div ref={combatContainerRef} style={{ position: 'relative' }}>
      <Application resizeTo={window} antialias={true} eventMode='static'>
          <LayoutResizer>
              <CameraController camera={camera} panBy={panBy} zoomAt={zoomAt} />
              <GridOverlay size={GRID_SIZE} zoom={camera.zoom} panX={camera.panX} panY={camera.panY} />
              {[...tokenPlacements.values()].map(({ token, position }) => (
                <TokenDisplay
                  key={token.id}
                  token={token}
                  position={position}
                  gridSize={GRID_SIZE}
                  camera={camera}
                  onMove={handleTokenMove}
                  onHoverChange={handleTokenHover}
                />
              ))}
              {showCursorTracker && <CursorTracker camera={camera} />}
          </LayoutResizer>
      </Application>
      <DebuggerOverlay gridCell={gridCell} hoveredToken={hoveredTokenName} />
    </div>
  )
}
