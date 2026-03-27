type DebuggerOverlayProps = {
  entries: Map<string, string>;
};

export const DebuggerOverlay = ({ entries }: DebuggerOverlayProps) => {
  const sorted = [...entries.entries()].sort(([a], [b]) => b.localeCompare(a));

  return (
    <div
      className="pointer-events-none absolute top-4 left-4 z-10 rounded-md border border-gray-400 bg-gray-800/80 p-2 font-mono text-sm text-gray-200"
      aria-live="polite"
    >
      {sorted.map(([key, value]) => (
        <div key={key}>
          {key}: {value}
        </div>
      ))}
    </div>
  );
};
