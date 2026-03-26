import type { RefObject } from "react";

import { Plus } from "lucide-react";

import type { Token } from "../types/token";

import { TokenLibraryItem } from "./TokenLibraryItem";

type TokenLibraryOverlayProps = {
  tokens: Token[];
  draggedTokenRef: RefObject<Token | null>;
  onDragEnd: () => void;
  onCreateToken: () => void;
};

export function TokenLibraryOverlay({
  tokens,
  draggedTokenRef,
  onDragEnd,
  onCreateToken,
}: TokenLibraryOverlayProps) {
  const handleDragStart = (token: Token) => {
    draggedTokenRef.current = token;
  };

  return (
    <div className="absolute right-3 bottom-3 z-10 flex w-[200px] flex-col gap-1.5 rounded-lg border border-slate-400/45 bg-slate-900/80 p-2 font-mono text-[13px] text-slate-200">
      <button
        type="button"
        onClick={onCreateToken}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-400/45 bg-white/[0.08] px-2.5 py-1.5 text-[13px] text-slate-200"
      >
        <Plus size={14} />
        Create Token
      </button>

      {tokens.length === 0 ? (
        <div className="px-1 py-2 text-center text-xs text-slate-500">No tokens yet</div>
      ) : (
        <div className="flex max-h-[300px] flex-col gap-1 overflow-y-auto">
          {tokens.map((token) => (
            <TokenLibraryItem
              key={token.id}
              token={token}
              onDragStart={handleDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
