import type { GridCell } from '../utils/cameraMath'

type DebuggerOverlayProps = {
  gridCell: GridCell | null
  hoveredToken: string | null
}

export const DebuggerOverlay = ({ gridCell, hoveredToken }: DebuggerOverlayProps) => {
  const label = gridCell
    ? `Grid: (${gridCell.col}, ${gridCell.row})`
    : 'Grid: (--, --)'

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 10,
        pointerEvents: 'none',
        background: 'rgba(15, 23, 42, 0.8)',
        color: '#e2e8f0',
        border: '1px solid rgba(148, 163, 184, 0.45)',
        borderRadius: 8,
        padding: '8px 10px',
        fontSize: 13,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        lineHeight: 1.2,
      }}
      aria-live="polite"
    >
      {label}
      {hoveredToken && <div>Token: {hoveredToken}</div>}
    </div>
  )
}
