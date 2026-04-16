export const queueStatusStyles = {
  waiting: "bg-blue-100 text-blue-700",
  called: "bg-amber-100 text-amber-700",
  admitted: "bg-purple-100 text-purple-700",
  in_consultation: "bg-teal-100 text-teal-700",
  completed: "bg-green-100 text-green-700",
  missed: "bg-red-100 text-red-700",
  booked: "bg-slate-100 text-slate-700",
  arrived: "bg-cyan-100 text-cyan-700",
};

export const formatQueueStatus = (status) =>
  status
    ?.split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ") || "Unknown";
