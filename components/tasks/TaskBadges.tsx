export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    TODO: "bg-[#f1f3f4] text-[#5f6368]",
    IN_PROGRESS: "bg-[#e8f0fe] text-[#1a73e8]",
    IN_REVIEW: "bg-[#fef7e0] text-[#f29900]",
    DONE: "bg-[#e6f4ea] text-[#188038]",
    CANCELLED: "bg-[#fce8e6] text-[#d93025]",
  };
  const labels: Record<string, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "Follow Up",
    DONE: "Done",
    CANCELLED: "Cancelled",
  };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? "bg-[#f1f3f4] text-[#5f6368]"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    LOW: "text-gray-400",
    MEDIUM: "text-blue-500",
    HIGH: "text-orange-500",
    URGENT: "text-red-600",
  };
  const icons: Record<string, string> = {
    LOW: "↓",
    MEDIUM: "→",
    HIGH: "↑",
    URGENT: "⚡",
  };
  return (
    <span className={`text-xs font-semibold ${styles[priority] ?? ""}`}>
      {icons[priority]} {priority}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    TASK: "bg-blue-50 text-blue-700",
    BUG: "bg-red-50 text-red-700",
    STORY: "bg-green-50 text-green-700",
    EPIC: "bg-purple-50 text-purple-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[type] ?? "bg-gray-100 text-gray-600"}`}>
      {type}
    </span>
  );
}
