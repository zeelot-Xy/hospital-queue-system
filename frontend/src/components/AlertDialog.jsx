import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import Modal from "./Modal";

const variantStyles = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-green-600",
    badgeClass: "bg-green-100 text-green-700",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-600",
    badgeClass: "bg-amber-100 text-amber-700",
  },
  info: {
    icon: Info,
    iconClass: "text-teal-600",
    badgeClass: "bg-teal-100 text-teal-700",
  },
  error: {
    icon: AlertTriangle,
    iconClass: "text-red-600",
    badgeClass: "bg-red-100 text-red-700",
  },
};

export default function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  variant = "info",
  confirmText = "OK",
  cancelText,
  onConfirm,
}) {
  const config = variantStyles[variant] || variantStyles.info;
  const Icon = config.icon;
  const isConfirmDialog = Boolean(onConfirm);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      overlayClassName="z-[70]">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className={`rounded-2xl p-3 ${config.badgeClass}`}>
            <Icon className={`w-6 h-6 ${config.iconClass}`} />
          </div>
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>

        <div className="flex justify-end gap-3">
          {cancelText && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all">
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (isConfirmDialog) {
                onConfirm();
              } else {
                onClose();
              }
            }}
            className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-medium transition-all">
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
