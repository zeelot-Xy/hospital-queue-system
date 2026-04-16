import { BellRing } from "lucide-react";

export default function NotificationPanel({
  notifications = [],
  title = "Notifications",
  emptyMessage = "No notifications right now.",
}) {
  return (
    <div className="medical-card p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-teal-900 sm:text-xl">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            Latest operational updates relevant to your role
          </p>
        </div>
        <BellRing className="mt-1 h-5 w-5 shrink-0 text-teal-600 sm:h-6 sm:w-6" />
      </div>

      {notifications.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-gray-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-3">
          {notifications.slice(0, 6).map((notification) => (
            <div
              key={notification.id}
              className="rounded-2xl border border-gray-200 bg-white px-3.5 py-3.5 sm:px-4 sm:py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-teal-900">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {notification.message}
                  </p>
                </div>
                {!notification.read_at && (
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-teal-500" />
                )}
              </div>
              <p className="mt-3 text-[11px] text-gray-400 sm:text-xs">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
