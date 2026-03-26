import type { GridCell } from "../utils/cameraMath";

type DebuggerOverlayProps = {
  gridCell: GridCell | null;
  hoveredToken: string | null;
};

export const DebuggerOverlay = ({ gridCell, hoveredToken }: DebuggerOverlayProps) => {
  const label = gridCell ? `Grid: (${gridCell.col}, ${gridCell.row})` : "Grid: (--, --)";

  return (
    <div
      className="pointer-events-none absolute top-4 left-4 z-10 rounded-md border border-gray-400 bg-gray-800/80 p-2 font-mono text-sm text-gray-200"
      aria-live="polite"
    >
      {label}
      {hoveredToken && <div>Token: {hoveredToken}</div>}
    </div>
  );
};
