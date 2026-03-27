import { Modal } from "./Modal";

type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
}: Readonly<ConfirmModalProps>) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="m-0 mb-2 text-base font-semibold text-slate-100">{title}</h2>
      <p className="mb-5 text-[13px] text-slate-400">{description}</p>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-md border border-slate-400/45 bg-transparent px-3.5 py-1.5 text-[13px] text-slate-400"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="cursor-pointer rounded-md border-none bg-red-600 px-3.5 py-1.5 text-[13px] font-medium text-white"
        >
          Delete
        </button>
      </div>
    </Modal>
  );
}
