"use client";

import Link from "next/link";
import { useGoals } from "@/lib/hooks/useGoals";
import { useUpdateTask } from "@/lib/hooks/useTasks";

interface Task {
  id: string;
  title: string;
  sequenceNumber: number;
  status: string;
  priority: string;
  goalId: string | null;
  dueDate: string | null;
  project: {
    key: string;
    id: string;
    organization: { slug: string };
  };
}

export function DashboardTaskList({ tasks }: { tasks: Task[] }) {
  const { data: goals } = useGoals();

  if (tasks.length === 0) {
    return <p className="text-sm text-gray-400">No tasks assigned to you.</p>;
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} goals={goals ?? []} />
      ))}
    </div>
  );
}

function TaskRow({ task, goals }: { task: Task; goals: { id: string; title: string }[] }) {
  const updateTask = useUpdateTask(task.project.id);
  const backlogUrl = `/${task.project.organization.slug}/${task.project.key.toLowerCase()}/backlog`;

  function handleGoalChange(goalId: string) {
    updateTask.mutate({ id: task.id, data: { goalId: goalId || null } });
  }

  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 transition gap-3">
      <Link href={backlogUrl} className="flex-1 min-w-0">
        <span className="text-xs text-gray-400 font-mono">
          {task.project.key}-{task.sequenceNumber}
        </span>
        <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
      </Link>

      <div className="flex items-center gap-3 shrink-0">
        {task.dueDate && (
          <span className="text-xs text-gray-400 hidden sm:block">
            Due {new Date(task.dueDate).toLocaleDateString("en-US", { timeZone: "UTC" })}
          </span>
        )}

        <select
          defaultValue={task.goalId ?? ""}
          onChange={(e) => handleGoalChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[140px]"
        >
          <option value="">No goal</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>

        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    LOW: "text-gray-400", MEDIUM: "text-blue-500", HIGH: "text-orange-500", URGENT: "text-red-600",
  };
  const icons: Record<string, string> = {
    LOW: "↓", MEDIUM: "→", HIGH: "↑", URGENT: "⚡",
  };
  return (
    <span className={`text-xs font-semibold ${styles[priority] ?? ""}`}>
      {icons[priority]} {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    TODO: "bg-gray-100 text-gray-600",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    IN_REVIEW: "bg-yellow-100 text-yellow-700",
    DONE: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-600",
  };
  const label: Record<string, string> = {
    TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "Follow Up", DONE: "Done", CANCELLED: "Cancelled",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? ""}`}>
      {label[status] ?? status}
    </span>
  );
}
