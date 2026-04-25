"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, GripVertical, CheckCircle2 } from "lucide-react";
import { useTaskPanel } from "@/lib/store";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate?: string | null;
  recurrence?: string | null;
  goal?: { title: string; position: number } | null;
  project?: { name: string } | null;
  position: number;
  habitPosition?: number | null;
}

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  tasks: Task[];
  dueTodayTasks: Task[];
  members: User[];
  currentUserId: string;
}

function todayKey() {
  return `habit-completions-${new Date().toLocaleDateString("en-CA")}`; // YYYY-MM-DD
}

function loadCompletedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(todayKey());
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveCompletedIds(ids: Set<string>) {
  try {
    localStorage.setItem(todayKey(), JSON.stringify([...ids]));
  } catch {}
}

async function patchTaskStatus(id: string, status: "DONE" | "TODO") {
  await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

function getDefaultHabitOrder(task: Task) {
  const goalOrder = task.goal?.position ?? Infinity;
  return goalOrder * 1_000_000 + task.position;
}

function sortHabits(a: Task, b: Task) {
  const aOrder = a.habitPosition ?? getDefaultHabitOrder(a);
  const bOrder = b.habitPosition ?? getDefaultHabitOrder(b);
  if (aOrder !== bOrder) return aOrder - bOrder;
  return a.title.localeCompare(b.title);
}

function SortableTaskCard({
  task,
  onOpen,
  onToggle,
}: {
  task: Task;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-[#dadce0] rounded-2xl p-2 shadow-sm hover:shadow-md transition">
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 rounded-full text-[#5f6368] hover:bg-slate-100 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onToggle(task.id)}
          className="flex-shrink-0 text-gray-300 hover:text-green-500 transition"
          aria-label="Mark as done"
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpen(task.id)}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <p className="text-sm font-medium text-[#202124] truncate">{task.title}</p>
              {task.goal && (
                <span className="text-xs text-[#5f6368] flex-shrink-0">{task.goal.title}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DueTodayCard({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  return (
    <div
      className="bg-blue-50 border border-blue-200 rounded-2xl p-2 shadow-sm hover:shadow-md transition cursor-pointer"
      onClick={() => onOpen(task.id)}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-blue-900 truncate">{task.title}</p>
            {task.goal && (
              <span className="text-xs text-blue-600 flex-shrink-0">{task.goal.title}</span>
            )}
            {task.project && (
              <span className="text-xs text-blue-400 flex-shrink-0">{task.project.name}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DoneTaskCard({
  task,
  onOpen,
  onToggle,
}: {
  task: Task;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-2 shadow-sm opacity-60">
      <div className="flex items-center gap-2">
        <div className="w-6 flex-shrink-0" />
        <button
          type="button"
          onClick={() => onToggle(task.id)}
          className="flex-shrink-0 text-green-500 hover:text-gray-300 transition"
          aria-label="Mark as not done"
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpen(task.id)}>
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-gray-400 truncate line-through">{task.title}</p>
            {task.goal && (
              <span className="text-xs text-gray-400 flex-shrink-0">{task.goal.title}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HabitsClientNew({ tasks: initialTasks, dueTodayTasks }: Props) {
  const { open } = useTaskPanel();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(() => [...initialTasks].sort(sortHabits));
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Load completions from localStorage on mount (client only).
  // If any tasks are DONE in the DB but not in today's localStorage, they were
  // completed on a previous day and never reset — fix them now.
  useEffect(() => {
    const stored = loadCompletedIds();
    setCompletedIds(stored);
    initialTasks.forEach((task) => {
      if (task.status === "DONE" && !stored.has(task.id)) {
        patchTaskStatus(task.id, "TODO");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTasks([...initialTasks].sort(sortHabits));
  }, [initialTasks]);

  // Schedule a midnight reset: clear done state and reset task statuses back to TODO
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    const timer = setTimeout(() => {
      setCompletedIds((prev) => {
        prev.forEach((id) => {
          patchTaskStatus(id, "TODO").then(() => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["task", id] });
          });
        });
        return new Set();
      });
    }, msUntilMidnight);
    return () => clearTimeout(timer);
  }, []);

  const pendingTasks = useMemo(
    () => [...tasks].filter((t) => !completedIds.has(t.id)).sort(sortHabits),
    [tasks, completedIds]
  );
  const doneTasks = useMemo(
    () => [...tasks].filter((t) => completedIds.has(t.id)),
    [tasks, completedIds]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function toggleDone(id: string) {
    const isDone = completedIds.has(id);
    const newStatus = isDone ? "TODO" : "DONE";

    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (isDone) next.delete(id);
      else next.add(id);
      saveCompletedIds(next);
      return next;
    });

    patchTaskStatus(id, newStatus).then(() => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", id] });
    });
  }

  async function saveHabitOrder(updatedTasks: Task[]) {
    const updates = updatedTasks.map((task) =>
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitPosition: task.habitPosition }),
      })
    );
    const results = await Promise.all(updates);
    if (results.some((r) => !r.ok)) throw new Error("Failed to save habit order");
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;

    const oldIndex = pendingTasks.findIndex((t) => t.id === active.id);
    const newIndex = pendingTasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(pendingTasks, oldIndex, newIndex);
    const nextPending = reordered.map((task, index) => ({ ...task, habitPosition: (index + 1) * 1000 }));

    const previousTasks = tasks;
    setTasks((prev) => {
      const doneOnes = prev.filter((t) => completedIds.has(t.id));
      return [...nextPending, ...doneOnes];
    });
    setIsSaving(true);
    setSaveError(null);

    const prevMap = Object.fromEntries(previousTasks.map((t) => [t.id, t.habitPosition]));
    const changed = nextPending.filter((t) => t.habitPosition !== prevMap[t.id]);

    try {
      await saveHabitOrder(changed);
    } catch {
      setTasks(previousTasks);
      setSaveError("Unable to save habit order. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <CalendarDays className="w-5 h-5 text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-900">Today</h1>
        {doneTasks.length > 0 && (
          <span className="ml-1 text-xs text-green-600 font-medium bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
            {doneTasks.length} / {tasks.length} done today
          </span>
        )}
      </div>

      {saveError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {mounted ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pendingTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-12">
                  No daily habits found. Create daily recurring tasks in your goals to see them here.
                </div>
              ) : (
                pendingTasks.map((task) => (
                  <SortableTaskCard key={task.id} task={task} onOpen={open} onToggle={toggleDone} />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-12">
              No daily habits found. Create daily recurring tasks in your goals to see them here.
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="bg-white border border-[#dadce0] rounded-2xl p-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 flex-shrink-0" />
                  <div className="w-5 flex-shrink-0" />
                  <p className="text-sm font-medium text-[#202124] truncate">{task.title}</p>
                  {task.goal && <span className="text-xs text-[#5f6368] flex-shrink-0">{task.goal.title}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {dueTodayTasks.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-blue-200" />
            <span className="text-xs text-blue-500 font-medium">Due today</span>
            <div className="h-px flex-1 bg-blue-200" />
          </div>
          {dueTodayTasks.map((task) => (
            <DueTodayCard key={task.id} task={task} onOpen={open} />
          ))}
        </div>
      )}

      {doneTasks.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">Done today</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          {doneTasks.map((task) => (
            <DoneTaskCard key={task.id} task={task} onOpen={open} onToggle={toggleDone} />
          ))}
        </div>
      )}

      {isSaving && <div className="mt-4 text-sm text-slate-500">Saving order...</div>}
    </div>
  );
}
