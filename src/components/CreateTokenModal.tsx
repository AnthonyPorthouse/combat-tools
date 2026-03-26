import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";

import type { CreateTokenFormValues } from "../schemas/createToken";
import type { Token } from "../types/token";

import { createTokenSchema, TOKEN_SIZES } from "../schemas/createToken";
import { createToken } from "../types/token";

type CreateTokenModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (token: Token) => void;
};

const inputClassName =
  "w-full py-1.5 px-2 rounded-md border border-slate-400/45 bg-white/[0.05] text-slate-200 text-[13px] font-mono box-border";

const labelClassName = "block text-xs text-slate-400 mb-1";

const errorClassName = "text-[11px] text-red-400 mt-0.5";

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[320px] rounded-[10px] border border-slate-400/45 bg-slate-900/95 p-5 font-mono text-slate-200"
      >
        <h2 className="m-0 mb-4 text-base font-semibold text-slate-100">Create Token</h2>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="mb-3">
            <label htmlFor="token-name" className={labelClassName}>
              Name *
            </label>
            <input
              id="token-name"
              {...register("name")}
              placeholder="Goblin"
              className={inputClassName}
              autoFocus
            />
            {errors.name && <p className={errorClassName}>{errors.name.message}</p>}
          </div>

          <div className="mb-3">
            <label htmlFor="token-size" className={labelClassName}>
              Size *
            </label>
            <select
              id="token-size"
              {...register("size", { valueAsNumber: true })}
              className={inputClassName}
            >
              {TOKEN_SIZES.map((s) => (
                <option key={s} value={s}>
                  {SIZE_LABELS[s]}
                </option>
              ))}
            </select>
            {errors.size && <p className={errorClassName}>{errors.size.message}</p>}
          </div>

          <div className="mb-3">
            <label htmlFor="token-image" className={labelClassName}>
              Image URL
            </label>
            <input
              id="token-image"
              {...register("image")}
              type="url"
              placeholder="https://example.com/token.png"
              className={inputClassName}
            />
            {errors.image && <p className={errorClassName}>{errors.image.message}</p>}
          </div>

          <div className="mb-4 flex items-center gap-2">
            <input
              id="token-locked"
              {...register("locked")}
              type="checkbox"
              className="cursor-pointer"
            />
            <label htmlFor="token-locked" className="block text-xs text-slate-400">
              Locked (cannot be dragged on the board)
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-md border border-slate-400/45 bg-transparent px-3.5 py-1.5 text-[13px] text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-md border-none bg-blue-500 px-3.5 py-1.5 text-[13px] font-medium text-white"
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
