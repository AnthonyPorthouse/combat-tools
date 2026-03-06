import { Application, extend } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'
import { createFileRoute } from '@tanstack/react-router'
import { LayoutContainer } from '@pixi/layout/components'
import { useRef } from 'react'
import { CursorTracker } from '../components/CursorTracker'
import { DebuggerOverlay } from '../components/DebuggerOverlay'
import { GridOverlay } from '../components/GridOverlay'
import { LayoutResizer } from '../components/LayoutResizer'
import { CameraController } from '../components/CameraController'
import { useCamera } from '../hooks/useCamera'
import { useDebuggerOverlay } from '../hooks/useDebuggerOverlay'

export const Route = createFileRoute('/combat')({
  component: RouteComponent,
})

extend({
  Container,
  Graphics,
  LayoutContainer
})

function RouteComponent() {
  const { camera, panBy, zoomAt } = useCamera()
  const combatContainerRef = useRef<HTMLDivElement | null>(null)
  const { gridCell } = useDebuggerOverlay({
    camera,
    gridSize: 32,
    containerRef: combatContainerRef,
  })

  return (
    <div ref={combatContainerRef} style={{ position: 'relative' }}>
      <Application resizeTo={window} eventMode='static'>
          <LayoutResizer>
              <CameraController camera={camera} panBy={panBy} zoomAt={zoomAt} />
              <GridOverlay size={32} zoom={camera.zoom} panX={camera.panX} panY={camera.panY} />
              <CursorTracker camera={camera} />
          </LayoutResizer>
      </Application>
      <DebuggerOverlay gridCell={gridCell} />
    </div>
  )
}
