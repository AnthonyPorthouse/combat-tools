import { Application, extend } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'
import { LayoutContainer } from '@pixi/layout/components'
import type { ReactNode } from 'react'
import { CameraController } from './CameraController'
import { GridOverlay } from './GridOverlay'
import { LayoutResizer } from './LayoutResizer'
import type { CameraState } from '../utils/cameraMath'
import type { Vector2 } from '../lib/vector2'

extend({ Container, Graphics, LayoutContainer })

type BoardProps = {
  camera: CameraState
  panBy: (delta: Vector2) => void
  zoomAt: (screen: Vector2, zoom: number) => void
  gridSize?: number
  children?: ReactNode
}

export function Board({ camera, panBy, zoomAt, gridSize = 64, children }: BoardProps) {
  return (
    <Application resizeTo={window} antialias={true} eventMode='static'>
      <LayoutResizer>
        <CameraController camera={camera} panBy={panBy} zoomAt={zoomAt} />
        <GridOverlay size={gridSize} zoom={camera.zoom} pan={camera.pan} />
        {children}
      </LayoutResizer>
    </Application>
  )
}
