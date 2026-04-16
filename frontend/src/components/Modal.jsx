import { X } from "lucide-react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-lg",
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${maxWidthClass} overflow-hidden`}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b">
          <h2 className="text-xl font-semibold text-teal-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
