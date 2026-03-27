import type { ReactNode } from "react";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { useInert } from "../hooks/useInert";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ isOpen, onClose, children }: ModalProps) {
  useInert(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[320px] rounded-[10px] border border-slate-400/45 bg-slate-900/95 p-5 font-mono text-slate-200"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
