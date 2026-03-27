import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type ContextMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type ContextMenuProps = {
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
};

export function ContextMenu({ position, items, onClose }: Readonly<ContextMenuProps>) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    // Defer the outside-click listener by one tick so the pointerdown/mousedown
    // event that opened the menu doesn't immediately close it.
    const timerId = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown);
    }, 0);
    return () => {
      clearTimeout(timerId);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      style={{ left: position.x, top: position.y }}
      className="fixed z-[200] min-w-[140px] overflow-hidden rounded-md border border-slate-400/45 bg-slate-900/95 py-1 font-mono shadow-lg"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`flex w-full cursor-pointer items-center px-3 py-1.5 text-left text-[13px] hover:bg-white/[0.08] ${item.danger ? "text-red-400" : "text-slate-200"}`}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
