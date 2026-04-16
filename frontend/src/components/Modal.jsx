import { X } from "lucide-react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-lg",
  overlayClassName = "z-50",
}) {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 overflow-y-auto bg-black bg-opacity-50 p-4 ${overlayClassName}`}>
      <div className="flex min-h-full items-start justify-center py-6 sm:items-center">
        <div
          className={`flex max-h-[calc(100vh-3rem)] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ${maxWidthClass}`}>
        {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b px-6 py-5">
            <h2 className="text-xl font-semibold text-teal-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
