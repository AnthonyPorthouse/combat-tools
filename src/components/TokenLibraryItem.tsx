import type { DragEvent } from "react";
import type { Token } from "../types/token";

type TokenLibraryItemProps = {
  token: Token;
  onDragStart: (token: Token) => void;
  onDragEnd: () => void;
};

const SIZE_LABELS: Record<number, string> = {
  0.5: "Tiny",
  1: "Small",
  2: "Medium",
  3: "Large",
  4: "Huge",
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 6,
        cursor: "grab",
        userSelect: "none",
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(148, 163, 184, 0.2)",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: token.image ? `url(${token.image}) center/cover` : "rgba(148, 163, 184, 0.3)",
          border: "1px solid rgba(148, 163, 184, 0.5)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: "#94a3b8",
        }}
      >
        {!token.image && token.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: "#e2e8f0",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {token.name}
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          {SIZE_LABELS[token.size] ?? token.size}
          {token.locked && " · Locked"}
        </div>
      </div>
    </div>
  );
}
