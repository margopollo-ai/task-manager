"use client";

import { useState } from "react";
import { Target, Plus, Trash2, ChevronRight, Pencil, GripVertical, ChevronDown } from "lucide-react";
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
  }

  function handleUpdate(id: string) {
    updateGoal.mutate(
      { id, data: { title: editTitle.trim(), description: editDescription.trim() || undefined } },
      { onSuccess: () => setEditingId(null) }
    );
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this goal? Tasks linked to it will be unlinked.")) return;
    deleteGoal.mutate(id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !goals) return;

    const oldIndex = goals.findIndex((g) => g.id === active.id);
    const newIndex = goals.findIndex((g) => g.id === over.id);
    const reordered = arrayMove(goals, oldIndex, newIndex);

    reorderGoals.mutate(reordered.map((g, i) => ({ id: g.id, position: (i + 1) * 1000 })));
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">Goals</h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          New goal
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal title"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={goals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {goals.map((goal) => (
                <SortableGoalItem
                  key={goal.id}
                  goal={goal}
                  isEditing={editingId === goal.id}
                  editTitle={editTitle}
                  editDescription={editDescription}
                  onEditTitleChange={setEditTitle}
                  onEditDescriptionChange={setEditDescription}
                  onStartEdit={startEdit}
                  onSave={handleUpdate}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={handleDelete}
                  isSaving={updateGoal.isPending}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

interface GoalItemProps {
  goal: Goal;
  isEditing: boolean;
  editTitle: string;
  editDescription: string;
  onEditTitleChange: (v: string) => void;
  onEditDescriptionChange: (v: string) => void;
  onStartEdit: (goal: Goal) => void;
  onSave: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
}

function SortableGoalItem({ goal, isEditing, editTitle, editDescription, onEditTitleChange, onEditDescriptionChange, onStartEdit, onSave, onCancelEdit, onDelete, isSaving }: GoalItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id });
  const [expanded, setExpanded] = useState(false);
  const { data: detail, isLoading: loadingTasks } = useGoal(goal.id, expanded);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={editDescription}
              onChange={(e) => onEditDescriptionChange(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => onSave(goal.id)}
                disabled={isSaving}
                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
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
              className="mt-0.5 p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-fuchsia-600 text-lg">{goal.title}</p>
              {goal.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{goal.description}</p>
              )}
              {goal._count.tasks > 0 ? (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="text-xs text-blue-500 hover:text-blue-700 mt-1.5 flex items-center gap-1 transition"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  {goal._count.tasks} linked {goal._count.tasks === 1 ? "task" : "tasks"}
                </button>
              ) : (
                <p className="text-xs text-gray-400 mt-1.5">No linked tasks</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onStartEdit(goal)}
                className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                title="Edit goal"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(goal.id)}
                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                title="Delete goal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {expanded && !isEditing && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          {loadingTasks ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => <div key={i} className="h-8 bg-gray-200 animate-pulse rounded-lg" />)}
            </div>
          ) : detail?.tasks.length === 0 ? (
            <p className="text-xs text-gray-400">No tasks linked.</p>
          ) : (
            <TaskList tasks={detail?.tasks ?? []} />
          )}
        </div>
      )}
    </li>
  );
}

function TaskList({ tasks }: { tasks: NonNullable<ReturnType<typeof useGoal>["data"]>["tasks"] }) {
  const { open } = useTaskPanel();
  const statusMap: Record<string, string> = {
    TODO: "bg-gray-100 text-gray-600",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    IN_REVIEW: "bg-yellow-100 text-yellow-700",
    DONE: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-600",
  };
  const statusLabel: Record<string, string> = {
    TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "In Review", DONE: "Done", CANCELLED: "Cancelled",
  };
  return (
    <ul className="space-y-1.5">
      {tasks.map((task) => (
        <li key={task.id}>
          <button
            onClick={() => open(task.id)}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 bg-white border border-gray-200 hover:border-blue-300 transition text-xs text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-gray-400 shrink-0">{task.project.key}-{task.sequenceNumber}</span>
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
