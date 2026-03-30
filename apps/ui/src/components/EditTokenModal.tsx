import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import type { CreateTokenFormValues } from "../schemas/createToken";
import type { Token } from "../types/token";

import { createTokenSchema, TOKEN_SIZES } from "../schemas/createToken";
import { TOKEN_SIZE_LABELS } from "../types/token";
import { Modal } from "./Modal";

type EditTokenModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (token: Token) => void;
  initialToken: Token | null;
};

const inputClassName =
  "w-full py-1.5 px-2 rounded-md border border-slate-400/45 bg-white/[0.05] text-slate-200 text-[13px] font-mono box-border";

const labelClassName = "block text-xs text-slate-400 mb-1";

const errorClassName = "text-[11px] text-red-400 mt-0.5";

export function EditTokenModal({
  isOpen,
  onClose,
  onSubmit,
  initialToken,
}: Readonly<EditTokenModalProps>) {
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
    if (isOpen && initialToken) {
      reset({
        name: initialToken.name,
        size: initialToken.size,
        image: initialToken.image ?? "",
        locked: initialToken.locked ?? false,
      });
    }
  }, [isOpen, initialToken, reset]);

  const handleFormSubmit = (data: CreateTokenFormValues) => {
    if (!initialToken) return;
    onSubmit({
      id: initialToken.id,
      name: data.name,
      size: data.size,
      image: data.image || undefined,
      locked: data.locked,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="m-0 mb-4 text-base font-semibold text-slate-100">Edit Token</h2>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <div className="mb-3">
          <label htmlFor="edit-token-name" className={labelClassName}>
            Name *
          </label>
          <input
            id="edit-token-name"
            {...register("name")}
            placeholder="Goblin"
            className={inputClassName}
            autoFocus
          />
          {errors.name && <p className={errorClassName}>{errors.name.message}</p>}
        </div>

        <div className="mb-3">
          <label htmlFor="edit-token-size" className={labelClassName}>
            Size *
          </label>
          <select
            id="edit-token-size"
            {...register("size", { valueAsNumber: true })}
            className={inputClassName}
          >
            {TOKEN_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} – {TOKEN_SIZE_LABELS[s]}
              </option>
            ))}
          </select>
          {errors.size && <p className={errorClassName}>{errors.size.message}</p>}
        </div>

        <div className="mb-3">
          <label htmlFor="edit-token-image" className={labelClassName}>
            Image URL
          </label>
          <input
            id="edit-token-image"
            {...register("image")}
            type="url"
            placeholder="https://example.com/token.png"
            className={inputClassName}
          />
          {errors.image && <p className={errorClassName}>{errors.image.message}</p>}
        </div>

        <div className="mb-4 flex items-center gap-2">
          <input
            id="edit-token-locked"
            {...register("locked")}
            type="checkbox"
            className="cursor-pointer"
          />
          <label htmlFor="edit-token-locked" className="block text-xs text-slate-400">
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
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
