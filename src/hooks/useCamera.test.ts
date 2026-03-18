import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCamera } from './useCamera'
import { MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM, screenToWorld } from '../utils/cameraMath'

describe('useCamera', () => {
  describe('initial state', () => {
    it('defaults to zoom=1, panX=0, panY=0', () => {
      const { result } = renderHook(() => useCamera())
      expect(result.current.camera).toEqual({ zoom: 1, panX: 0, panY: 0 })
    })

    it('applies custom initial values', () => {
      const { result } = renderHook(() =>
        useCamera({ initialZoom: 2, initialPanX: 100, initialPanY: 200 }),
      )
      expect(result.current.camera).toEqual({ zoom: 2, panX: 100, panY: 200 })
    })

    it('clamps initialZoom to the minZoom bound', () => {
      const { result } = renderHook(() =>
        useCamera({ initialZoom: 0.001, minZoom: 0.5 }),
      )
      expect(result.current.camera.zoom).toBe(0.5)
    })

    it('clamps initialZoom to the maxZoom bound', () => {
      const { result } = renderHook(() =>
        useCamera({ initialZoom: 100, maxZoom: 4 }),
      )
      expect(result.current.camera.zoom).toBe(4)
    })

    it('exposes the configured minZoom and maxZoom', () => {
      const { result } = renderHook(() =>
        useCamera({ minZoom: 0.25, maxZoom: 5 }),
      )
      expect(result.current.minZoom).toBe(0.25)
      expect(result.current.maxZoom).toBe(5)
    })

    it('uses the global constants as default bounds', () => {
      const { result } = renderHook(() => useCamera())
      expect(result.current.minZoom).toBe(MIN_CAMERA_ZOOM)
      expect(result.current.maxZoom).toBe(MAX_CAMERA_ZOOM)
    })
  })

  describe('setPan', () => {
    it('sets the pan to an absolute position', () => {
      const { result } = renderHook(() => useCamera())

      act(() => {
        result.current.setPan(300, 400)
      })

      expect(result.current.camera.panX).toBe(300)
      expect(result.current.camera.panY).toBe(400)
    })

    it('overwrites a previous pan value', () => {
      const { result } = renderHook(() => useCamera())

      act(() => {
        result.current.setPan(300, 400)
      })
      act(() => {
        result.current.setPan(10, 20)
      })

      expect(result.current.camera.panX).toBe(10)
      expect(result.current.camera.panY).toBe(20)
    })

    it('does not change the zoom', () => {
      const { result } = renderHook(() => useCamera({ initialZoom: 2 }))

      act(() => {
        result.current.setPan(100, 100)
      })

      expect(result.current.camera.zoom).toBe(2)
    })
  })

  describe('panBy', () => {
    it('adds a delta to the current pan', () => {
      const { result } = renderHook(() => useCamera())

      act(() => {
        result.current.panBy(50, 75)
      })

      expect(result.current.camera.panX).toBe(50)
      expect(result.current.camera.panY).toBe(75)
    })

    it('accumulates deltas across multiple calls', () => {
      const { result } = renderHook(() => useCamera())

      act(() => {
        result.current.panBy(50, 75)
      })
      act(() => {
        result.current.panBy(-20, 25)
      })

      expect(result.current.camera.panX).toBe(30)
      expect(result.current.camera.panY).toBe(100)
    })

    it('adds to an existing pan offset', () => {
      const { result } = renderHook(() =>
        useCamera({ initialPanX: 100, initialPanY: 200 }),
      )

      act(() => {
        result.current.panBy(10, -50)
      })

      expect(result.current.camera.panX).toBe(110)
      expect(result.current.camera.panY).toBe(150)
    })
  })

  describe('setZoom', () => {
    it('updates the zoom level', () => {
      const { result } = renderHook(() => useCamera())

      act(() => {
        result.current.setZoom(3)
      })

      expect(result.current.camera.zoom).toBe(3)
    })

    it('clamps zoom below minZoom to minZoom', () => {
      const { result } = renderHook(() => useCamera({ minZoom: 0.5 }))

      act(() => {
        result.current.setZoom(0.1)
      })

      expect(result.current.camera.zoom).toBe(0.5)
    })

    it('clamps zoom above maxZoom to maxZoom', () => {
      const { result } = renderHook(() => useCamera({ maxZoom: 4 }))

      act(() => {
        result.current.setZoom(10)
      })

      expect(result.current.camera.zoom).toBe(4)
    })

    it('does not change the pan', () => {
      const { result } = renderHook(() =>
        useCamera({ initialPanX: 100, initialPanY: 200 }),
      )

      act(() => {
        result.current.setZoom(2)
      })

      expect(result.current.camera.panX).toBe(100)
      expect(result.current.camera.panY).toBe(200)
    })
  })

  describe('zoomAt', () => {
    it('updates the zoom level', () => {
      const { result } = renderHook(() => useCamera())

      act(() => {
        result.current.zoomAt(0, 0, 3)
      })

      expect(result.current.camera.zoom).toBe(3)
    })

    it('adjusts pan so the world point under the screen point is preserved', () => {
      const { result } = renderHook(() => useCamera())
      const screenX = 200
      const screenY = 150

      const worldBefore = screenToWorld(screenX, screenY, result.current.camera)

      act(() => {
        result.current.zoomAt(screenX, screenY, 4)
      })

      const worldAfter = screenToWorld(screenX, screenY, result.current.camera)

      expect(worldAfter.x).toBeCloseTo(worldBefore.x)
      expect(worldAfter.y).toBeCloseTo(worldBefore.y)
    })

    it('does not change pan when zoom level is already at the target', () => {
      const { result } = renderHook(() =>
        useCamera({ initialZoom: 2, initialPanX: 50, initialPanY: 50 }),
      )

      act(() => {
        result.current.zoomAt(100, 100, 2)
      })

      expect(result.current.camera.panX).toBe(50)
      expect(result.current.camera.panY).toBe(50)
    })

    it('clamps the zoom to the configured maxZoom', () => {
      const { result } = renderHook(() => useCamera({ maxZoom: 4 }))

      act(() => {
        result.current.zoomAt(0, 0, 999)
      })

      expect(result.current.camera.zoom).toBe(4)
    })

    it('clamps the zoom to the configured minZoom', () => {
      const { result } = renderHook(() => useCamera({ minZoom: 0.5 }))

      act(() => {
        result.current.zoomAt(0, 0, 0.01)
      })

      expect(result.current.camera.zoom).toBe(0.5)
    })
  })
})
