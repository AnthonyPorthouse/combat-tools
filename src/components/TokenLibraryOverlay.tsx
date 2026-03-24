import { Plus } from "lucide-react";
import type { RefObject } from "react";
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
    <div
      style={{
        position: "absolute",
        bottom: 12,
        right: 12,
        zIndex: 10,
        background: "rgba(15, 23, 42, 0.8)",
        color: "#e2e8f0",
        border: "1px solid rgba(148, 163, 184, 0.45)",
        borderRadius: 8,
        padding: "8px",
        fontSize: 13,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        width: 200,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <button
        type="button"
        onClick={onCreateToken}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid rgba(148, 163, 184, 0.45)",
          background: "rgba(255, 255, 255, 0.08)",
          color: "#e2e8f0",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "inherit",
          width: "100%",
        }}
      >
        <Plus size={14} />
        Create Token
      </button>

      {tokens.length === 0 ? (
        <div
          style={{
            padding: "8px 4px",
            color: "#64748b",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          No tokens yet
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
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
