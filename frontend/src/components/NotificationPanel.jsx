import { BellRing } from "lucide-react";

export default function NotificationPanel({
  notifications = [],
  title = "Notifications",
  emptyMessage = "No notifications right now.",
}) {
  return (
    <div className="medical-card p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-teal-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            Latest operational updates relevant to your role
          </p>
        </div>
        <BellRing className="h-6 w-6 text-teal-600" />
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
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4"
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
              <p className="mt-3 text-xs text-gray-400">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
