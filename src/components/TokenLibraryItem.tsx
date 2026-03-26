import type { DragEvent } from "react";

import type { Token } from "../types/token";

type TokenLibraryItemProps = {
  token: Token;
  onDragStart: (token: Token) => void;
  onDragEnd: () => void;
};

const SIZE_LABELS: Record<number, string> = {
  0.5: "Small",
  1: "Medium",
  2: "Large",
  3: "Huge",
  4: "Gargantuan",
};

export function TokenLibraryItem({ token, onDragStart, onDragEnd }: TokenLibraryItemProps) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", token.id);
    e.dataTransfer.effectAllowed = "copy";
    onDragStart(token);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className="flex cursor-grab items-center gap-2 rounded-md border border-slate-400/20 bg-white/[0.05] px-2 py-1.5 select-none"
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-400/50 text-[10px] text-slate-400 ${!token.image ? "bg-slate-400/30" : ""}`}
        style={token.image ? { background: `url(${token.image}) center/cover` } : undefined}
      >
        {!token.image && token.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-slate-200">{token.name}</div>
        <div className="text-[11px] text-slate-500">
          {SIZE_LABELS[token.size] ?? token.size}
          {token.locked && " · Locked"}
        </div>
      </div>
    </div>
  );
}
