"use client";

import { useState } from "react";
import { Target, Plus, Trash2, Pencil, GripVertical, CheckCircle2, RotateCcw } from "lucide-react";
import { useGoals, useGoal, useCreateGoal, useUpdateGoal, useDeleteGoal, useReorderGoals, type Goal } from "@/lib/hooks/useGoals";
import { useTaskPanel } from "@/lib/store";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const reorderGoals = useReorderGoals();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editKey, setEditKey] = useState("");
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "with-tasks">("with-tasks");

  function toggleGoalExpanded(id: string) {
    setExpandedGoalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    if (goals) setExpandedGoalIds(new Set(goals.map((g) => g.id)));
  }

  function collapseAll() {
    setExpandedGoalIds(new Set());
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createGoal.mutate(
      { title: title.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setShowForm(false);
        },
      }
    );
  }

  function startEdit(goal: Goal) {
    setEditingId(goal.id);
    setEditTitle(goal.title);
    setEditDescription(goal.description ?? "");
    setEditKey(goal.key);
  }

  function handleUpdate(id: string) {
    updateGoal.mutate(
      {
        id,
        data: {
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          key: editKey.trim().toUpperCase() || undefined,
        },
      },
      { onSuccess: () => setEditingId(null) }
    );
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this goal? Tasks linked to it will be unlinked.")) return;
    deleteGoal.mutate(id);
  }

  function handleComplete(id: string) {
    updateGoal.mutate({ id, data: { completedAt: new Date().toISOString() } });
  }

  function handleUncomplete(id: string) {
    updateGoal.mutate({ id, data: { completedAt: null } });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !goals) return;

    const activeGoals = goals.filter((g) => !g.completedAt);
    const oldIndex = activeGoals.findIndex((g) => g.id === active.id);
    const newIndex = activeGoals.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(activeGoals, oldIndex, newIndex);

    reorderGoals.mutate(reordered.map((g, i) => ({ id: g.id, position: (i + 1) * 1000 })));
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">Goals</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setFilter("with-tasks")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === "with-tasks" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Goals with tasks
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              All goals
            </button>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={collapseAll}
              className="rounded-full px-3 py-1 text-xs font-semibold transition text-slate-600 hover:bg-slate-200"
            >
              Collapse all
            </button>
            <button
              type="button"
              onClick={expandAll}
              className="rounded-full px-3 py-1 text-xs font-semibold transition text-slate-600 hover:bg-slate-200"
            >
              Expand all
            </button>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 bg-[#1a73e8] text-white text-sm px-3 py-1.5 rounded-lg hover:bg-[#1765cc] transition"
          >
            <Plus className="w-4 h-4" />
            New goal
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-white border border-[#dadce0] rounded-2xl p-4 space-y-3 shadow-sm">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal title"
            className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1a73e8] resize-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createGoal.isPending || !title.trim()}
              className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {createGoal.isPending ? "Creating…" : "Create goal"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : !goals?.length ? (
        <div className="text-center py-16 text-gray-400">
          <Target className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No goals yet. Create one to start linking tasks.</p>
        </div>
      ) : (
        <>
          {(() => {
            const activeGoals = goals!.filter((g) => !g.completedAt);
            const completedGoals = goals!.filter((g) => g.completedAt);
            const visibleActive = filter === "with-tasks"
              ? activeGoals.filter((g) => g._count.tasks > 0)
              : activeGoals;
            const visibleCompleted = filter === "all" ? completedGoals : [];
            return (
              <>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={activeGoals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-3">
                      {visibleActive.map((goal) => (
                        <SortableGoalItem
                          key={goal.id}
                          goal={goal}
                          isExpanded={expandedGoalIds.has(goal.id)}
                          onToggle={() => toggleGoalExpanded(goal.id)}
                          isEditing={editingId === goal.id}
                          editTitle={editTitle}
                          editDescription={editDescription}
                          editKey={editKey}
                          onEditTitleChange={setEditTitle}
                          onEditDescriptionChange={setEditDescription}
                          onEditKeyChange={setEditKey}
                          onStartEdit={startEdit}
                          onSave={handleUpdate}
                          onCancelEdit={() => setEditingId(null)}
                          onDelete={handleDelete}
                          onComplete={handleComplete}
                          isSaving={updateGoal.isPending}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>

                {visibleCompleted.length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <h2 className="text-sm font-semibold text-gray-500">Achieved</h2>
                      <span className="text-xs text-gray-400">({completedGoals.length})</span>
                    </div>
                    <ul className="space-y-3">
                      {visibleCompleted.map((goal) => (
                        <CompletedGoalItem
                          key={goal.id}
                          goal={goal}
                          isExpanded={expandedGoalIds.has(goal.id)}
                          onToggle={() => toggleGoalExpanded(goal.id)}
                          onUncomplete={handleUncomplete}
                          onDelete={handleDelete}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}

interface GoalItemProps {
  goal: Goal;
  isExpanded: boolean;
  onToggle: () => void;
  isEditing: boolean;
  editTitle: string;
  editDescription: string;
  editKey: string;
  onEditTitleChange: (v: string) => void;
  onEditDescriptionChange: (v: string) => void;
  onEditKeyChange: (v: string) => void;
  onStartEdit: (goal: Goal) => void;
  onSave: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  isSaving: boolean;
}

function SortableGoalItem({ goal, isExpanded, onToggle, isEditing, editTitle, editDescription, editKey, onEditTitleChange, onEditDescriptionChange, onEditKeyChange, onStartEdit, onSave, onCancelEdit, onDelete, onComplete, isSaving }: GoalItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id });
  const { data: detail, isLoading: loadingTasks } = useGoal(goal.id, isExpanded);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="bg-white border border-[#dadce0] rounded-2xl shadow-sm overflow-hidden">
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-1.5">
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              placeholder="Goal title"
              className="w-full border border-[#dadce0] rounded-lg px-3 py-1.5 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 shrink-0">Key:</label>
              <input
                value={editKey}
                onChange={(e) => onEditKeyChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                placeholder="e.g. MAR"
                className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono text-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400">Used as task ID prefix (e.g. MAR-1)</span>
            </div>
            <textarea
              value={editDescription}
              onChange={(e) => onEditDescriptionChange(e.target.value)}
              rows={2}
              className="w-full border border-[#dadce0] rounded-lg px-3 py-1.5 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1a73e8] resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => onSave(goal.id)}
                disabled={isSaving}
                className="bg-[#1a73e8] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#1765cc] disabled:opacity-50 transition"
              >
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 p-1 text-[#dadce0] hover:text-[#5f6368] cursor-grab active:cursor-grabbing touch-none"
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-fuchsia-600 text-lg">{goal.title}</p>
                <span className="text-xs font-mono bg-fuchsia-50 text-fuchsia-500 border border-fuchsia-200 px-1.5 py-0.5 rounded shrink-0">{goal.key}</span>
              </div>
              {goal.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{goal.description}</p>
              )}
              {goal._count.tasks > 0 ? (
                <>
                  <button
                    onClick={onToggle}
                    className="text-xs text-[#1a73e8] mt-1 hover:underline text-left"
                  >
                    {isExpanded ? "▾" : "▸"} {goal._count.tasks} linked {goal._count.tasks === 1 ? "task" : "tasks"}
                  </button>
                  <div className="mt-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-0.5">
                      <span>{goal.doneTaskCount} / {goal._count.tasks} done</span>
                      <span>{Math.round((goal.doneTaskCount / goal._count.tasks) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${Math.round((goal.doneTaskCount / goal._count.tasks) * 100)}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-400 mt-1">No linked tasks</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onComplete(goal.id)}
                className="p-1.5 rounded-full hover:bg-green-50 text-[#5f6368] hover:text-green-600 transition"
                title="Mark as achieved"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStartEdit(goal)}
                className="p-1.5 rounded-full hover:bg-[#e8f0fe] text-[#5f6368] hover:text-[#1a73e8] transition"
                title="Edit goal"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(goal.id)}
                className="p-1.5 rounded-full hover:bg-red-50 text-[#5f6368] hover:text-red-500 transition"
                title="Delete goal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {isExpanded && !isEditing && (
        <div className="border-t border-[#f1f3f4] bg-[#f8f9fa] px-4 py-3">
          {loadingTasks ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => <div key={i} className="h-8 bg-gray-200 animate-pulse rounded-lg" />)}
            </div>
          ) : detail?.tasks.length === 0 ? (
            <p className="text-xs text-gray-400">No tasks linked.</p>
          ) : (
            <TaskList tasks={detail?.tasks ?? []} goalKey={detail?.key ?? ""} />
          )}
        </div>
      )}
    </li>
  );
}

function CompletedGoalItem({ goal, isExpanded, onToggle, onUncomplete, onDelete }: {
  goal: Goal;
  isExpanded: boolean;
  onToggle: () => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { data: detail, isLoading: loadingTasks } = useGoal(goal.id, isExpanded);

  return (
    <li className="bg-green-50/60 border border-green-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-1 text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-extrabold text-gray-500 text-lg">{goal.title}</p>
              <span className="text-xs font-mono bg-green-100 text-green-600 border border-green-200 px-1.5 py-0.5 rounded shrink-0">{goal.key}</span>
            </div>
            {goal.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{goal.description}</p>
            )}
            <p className="text-xs text-green-600 mt-1 font-medium">
              Achieved {new Date(goal.completedAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            {goal._count.tasks > 0 && (
              <>
                <button onClick={onToggle} className="text-xs text-gray-400 mt-1 hover:underline text-left">
                  {isExpanded ? "▾" : "▸"} {goal._count.tasks} linked {goal._count.tasks === 1 ? "task" : "tasks"}
                </button>
                <div className="mt-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-0.5">
                    <span>{goal.doneTaskCount} / {goal._count.tasks} done</span>
                    <span>{Math.round((goal.doneTaskCount / goal._count.tasks) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-green-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full transition-all"
                      style={{ width: `${Math.round((goal.doneTaskCount / goal._count.tasks) * 100)}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onUncomplete(goal.id)}
              className="p-1.5 rounded-full hover:bg-white text-gray-400 hover:text-gray-600 transition"
              title="Mark as not achieved"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
              title="Delete goal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-green-200 bg-green-50 px-4 py-3">
          {loadingTasks ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => <div key={i} className="h-8 bg-green-100 animate-pulse rounded-lg" />)}
            </div>
          ) : detail?.tasks.length === 0 ? (
            <p className="text-xs text-gray-400">No tasks linked.</p>
          ) : (
            <TaskList tasks={detail?.tasks ?? []} goalKey={detail?.key ?? ""} />
          )}
        </div>
      )}
    </li>
  );
}

function TaskList({ tasks, goalKey }: { tasks: NonNullable<ReturnType<typeof useGoal>["data"]>["tasks"]; goalKey: string }) {
  const { open } = useTaskPanel();
  const statusMap: Record<string, string> = {
    TODO: "bg-gray-100 text-gray-600",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    IN_REVIEW: "bg-yellow-100 text-yellow-700",
    DONE: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-600",
  };
  const statusLabel: Record<string, string> = {
    TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "Follow Up", DONE: "Done", CANCELLED: "Cancelled",
  };
  return (
    <ul className="space-y-1.5">
      {tasks.map((task) => (
        <li key={task.id}>
          <button
            onClick={() => open(task.id)}
            className="w-full flex items-center justify-between rounded-xl px-3 py-2 bg-white border border-[#dadce0] hover:border-[#1a73e8] hover:bg-[#e8f0fe]/30 transition text-xs text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-gray-400 shrink-0">
                {task.goalSequenceNumber
                  ? `${goalKey}-${task.goalSequenceNumber}`
                  : `${task.project.key}-${task.sequenceNumber}`}
              </span>
              <span className="text-gray-800 truncate">{task.title}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {task.assignee?.name && <span className="text-gray-400">{task.assignee.name}</span>}
              <span className={`px-1.5 py-0.5 rounded-full font-medium ${statusMap[task.status] ?? "bg-gray-100 text-gray-600"}`}>
                {statusLabel[task.status] ?? task.status}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
