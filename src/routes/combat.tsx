import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useRef, useState } from 'react'
import { Board } from '../components/Board'
import { CursorTracker } from '../components/CursorTracker'
import { DebuggerOverlay } from '../components/DebuggerOverlay'
import { TokenDisplay } from '../components/Token'
import { useCamera } from '../hooks/useCamera'
import { useDebuggerOverlay } from '../hooks/useDebuggerOverlay'
import { createToken } from '../types/token'
import type { Token } from '../types/token'
import type { Vector2 } from '../lib/vector2'

export const Route = createFileRoute('/combat')({
  component: RouteComponent,
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

  const [showCursorTracker] = useState(false);

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
      <Board camera={camera} panBy={panBy} zoomAt={zoomAt} gridSize={GRID_SIZE}>
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
      </Board>
      <DebuggerOverlay gridCell={gridCell} hoveredToken={hoveredTokenName} />
    </div>
  )
}
