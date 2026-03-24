import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTokenSchema, TOKEN_SIZES } from "../schemas/createToken";
import type { CreateTokenFormValues } from "../schemas/createToken";
import { createToken } from "../types/token";
import type { Token } from "../types/token";

type CreateTokenModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (token: Token) => void;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid rgba(148, 163, 184, 0.45)",
  background: "rgba(255, 255, 255, 0.05)",
  color: "#e2e8f0",
  fontSize: 13,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#94a3b8",
  marginBottom: 4,
};

const errorStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#f87171",
  marginTop: 3,
};

const SIZE_LABELS: Record<number, string> = {
  0.5: "0.5 – Tiny",
  1: "1 – Small",
  2: "2 – Medium",
  3: "3 – Large",
  4: "4 – Huge",
};

export function CreateTokenModal({ isOpen, onClose, onSubmit }: CreateTokenModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTokenFormValues>({
    resolver: zodResolver(createTokenSchema),
    defaultValues: { name: "", size: 1, image: "", locked: false },
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFormSubmit = (data: CreateTokenFormValues) => {
    const token = createToken(data.name, data.size, data.image || undefined, data.locked);
    onSubmit(token);
    reset();
  };

  const handleBackdropClick = () => onClose();

  return createPortal(
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(148, 163, 184, 0.45)",
          borderRadius: 10,
          padding: 20,
          width: 320,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          color: "#e2e8f0",
        }}
      >
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: 16,
            fontWeight: 600,
            color: "#f1f5f9",
          }}
        >
          Create Token
        </h2>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="token-name" style={labelStyle}>
              Name *
            </label>
            <input
              id="token-name"
              {...register("name")}
              placeholder="Goblin"
              style={inputStyle}
              autoFocus
            />
            {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="token-size" style={labelStyle}>
              Size *
            </label>
            <select
              id="token-size"
              {...register("size", { valueAsNumber: true })}
              style={inputStyle}
            >
              {TOKEN_SIZES.map((s) => (
                <option key={s} value={s}>
                  {SIZE_LABELS[s]}
                </option>
              ))}
            </select>
            {errors.size && <p style={errorStyle}>{errors.size.message}</p>}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="token-image" style={labelStyle}>
              Image URL
            </label>
            <input
              id="token-image"
              {...register("image")}
              type="url"
              placeholder="https://example.com/token.png"
              style={inputStyle}
            />
            {errors.image && <p style={errorStyle}>{errors.image.message}</p>}
          </div>

          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              id="token-locked"
              {...register("locked")}
              type="checkbox"
              style={{ cursor: "pointer" }}
            />
            <label htmlFor="token-locked" style={{ ...labelStyle, margin: 0 }}>
              Locked (cannot be dragged on the board)
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid rgba(148, 163, 184, 0.45)",
                background: "transparent",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: "#3b82f6",
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                fontWeight: 500,
              }}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
