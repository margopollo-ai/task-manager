"use client";

import { useState } from "react";
import { useTaskPanel } from "@/lib/store";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const STATUSES = [
  { value: "TODO", label: "To Do" },
  { value: "IN_REVIEW", label: "Follow Up" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
];

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-[#f1f3f4] text-[#5f6368]",
  IN_PROGRESS: "bg-[#e8f0fe] text-[#1a73e8]",
  IN_REVIEW: "bg-[#fef7e0] text-[#f29900]",
  DONE: "bg-[#e6f4ea] text-[#188038]",
};

const PRIORITY_BORDER: Record<string, string> = {
  URGENT: "border-l-[3px] border-l-red-500",
  HIGH: "border-l-[3px] border-l-orange-400",
  MEDIUM: "border-l-[3px] border-l-blue-400",
  LOW: "border-l-[3px] border-l-gray-300",
};

interface Task {
  id: string;
  sequenceNumber: number;
  goalSequenceNumber?: number | null;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  assignee?: { name: string | null } | null;
  goal?: { id: string; title: string; key: string; position: number } | null;
}

interface Props {
  projectKey: string;
  tasks: Task[];
}

export function BoardClient({ projectKey, tasks: initialTasks }: Props) {
  const { open } = useTaskPanel();
  const [tasks, setTasks] = useState(initialTasks);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const goalMap = new Map<string, { id: string; title: string; key: string; position: number }>();
  for (const t of tasks) {
    if (t.goal && !goalMap.has(t.goal.id)) goalMap.set(t.goal.id, t.goal);
  }
  const sortedGoals = [...goalMap.values()].sort((a, b) => a.position - b.position);
  const ungrouped = tasks.filter((t) => !t.goal);

  const sections = [
    ...sortedGoals.map((g) => ({
      id: g.id,
      title: g.title,
      goalKey: g.key,
      tasks: tasks.filter((t) => t.goal?.id === g.id),
    })),
    ...(ungrouped.length > 0
      ? [{ id: "__none__", title: "No goal", goalKey: null, tasks: ungrouped }]
      : []),
  ];

  const draggingTask = draggingId ? tasks.find((t) => t.id === draggingId) ?? null : null;

  function handleDragStart({ active }: DragStartEvent) {
    setDraggingId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDraggingId(null);
    if (!over) return;

    const taskId = active.id as string;
    // droppable id format: "sectionId::STATUS"
    const newStatus = (over.id as string).split("::")[1];
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !newStatus || task.status === newStatus) return;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t)));
    });
  }

  if (sections.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No tasks yet. Add tasks from the Backlog.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-10">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-extrabold text-fuchsia-600 text-lg">{section.title}</h2>
              {section.goalKey && (
                <span className="text-xs font-mono bg-fuchsia-50 text-fuchsia-500 border border-fuchsia-200 px-1.5 py-0.5 rounded">
                  {section.goalKey}
                </span>
              )}
              <span className="text-xs text-gray-400">
                {section.tasks.length} task{section.tasks.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {STATUSES.map(({ value, label }) => {
                const col = section.tasks.filter((t) => t.status === value);
                // unique per section+status
                const droppableId = `${section.id}::${value}`;
                return (
                  <DroppableColumn
                    key={droppableId}
                    id={droppableId}
                    label={label}
                    count={col.length}
                  >
                    {col.map((task) => (
                      <DraggableCard
                        key={task.id}
                        task={task}
                        onOpen={() => open(task.id)}
                      />
                    ))}
                  </DroppableColumn>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <DragOverlay>
        {draggingTask && <TaskCard task={draggingTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}

// ── Droppable column ──────────────────────────────────────────────────────────

function DroppableColumn({
  id, label, count, children,
}: {
  id: string; label: string; count: number; children: React.ReactNode;
}) {
  const status = id.split("::")[1];
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-none w-52">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
          {label}
        </span>
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-1.5 min-h-[60px] rounded-xl p-1.5 transition-colors ${
          isOver ? "bg-[#e8f0fe] ring-2 ring-[#1a73e8] ring-inset" : "bg-[#f8f9fa]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// ── Draggable card ────────────────────────────────────────────────────────────

function DraggableCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0 : 1 }}
      {...listeners}
      {...attributes}
      onClick={onOpen}
    >
      <TaskCard task={task} />
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, isDragging }: { task: Task; isDragging?: boolean }) {
  const border = PRIORITY_BORDER[task.priority] ?? PRIORITY_BORDER.LOW;

  return (
    <div
      className={`bg-white border border-[#dadce0] rounded-xl px-2.5 py-1.5 cursor-grab active:cursor-grabbing select-none transition ${border} ${
        isDragging ? "shadow-xl rotate-1" : "hover:border-[#1a73e8]/40 hover:shadow-sm"
      }`}
    >
      <p className="text-xs text-gray-800 font-medium leading-snug">{task.title}</p>
      {task.dueDate && (
        <p className="text-[10px] italic text-gray-400 mt-0.5">
          {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      )}
    </div>
  );
}
