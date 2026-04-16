import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function DashboardSectionMenu({
  sections,
  activeSection,
  onSelect,
  title = "Sections",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeItem =
    sections.find((section) => section.value === activeSection) || sections[0];

  return (
    <div className="sticky top-3 z-30 mb-5 md:hidden">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-3xl border border-teal-200 bg-white/95 px-4 py-3.5 text-left shadow-sm backdrop-blur transition-all hover:border-teal-400"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-600">
              {title}
            </p>
            <p className="mt-1 text-base font-semibold text-teal-900 sm:text-lg">
              {activeItem?.label}
            </p>
          </div>
          <span className="rounded-2xl bg-teal-50 p-2.5 text-teal-700">
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </span>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-20 max-h-[70vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur">
            <div className="space-y-2">
              {sections.map((section, index) => (
                <button
                  key={section.value}
                  type="button"
                  onClick={() => {
                    onSelect(section.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all ${
                    section.value === activeSection
                      ? "bg-teal-600 text-white"
                      : "bg-slate-50 text-gray-700 hover:bg-teal-50 hover:text-teal-700"
                  }`}
                >
                  <span className="font-medium">{section.label}</span>
                  <span
                    className={`text-xs font-semibold ${
                      section.value === activeSection
                        ? "text-white/80"
                        : "text-gray-400"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
