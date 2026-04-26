"use client";

import { useState, useEffect } from "react";
import { Plus, Save, X, LayoutGrid } from "lucide-react";
import { useTaskPanel } from "@/lib/store";
import { useCreateTask, useUpdateTask, useTasks } from "@/lib/hooks/useTasks";
import { useGoals } from "@/lib/hooks/useGoals";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const STATUSES = [
  { value: "TODO", label: "To Do" },
  { value: "IN_REVIEW", label: "Follow Up" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
];

const STATUS_COLORS: Record<string, { pill: string; header: string }> = {
  TODO:        { pill: "bg-[#f1f3f4] text-[#5f6368]",  header: "text-[#5f6368]" },
  IN_PROGRESS: { pill: "bg-[#e8f0fe] text-[#1a73e8]",  header: "text-[#1a73e8]" },
  IN_REVIEW:   { pill: "bg-[#fef7e0] text-[#f29900]",  header: "text-[#f29900]" },
  DONE:        { pill: "bg-[#e6f4ea] text-[#188038]",  header: "text-[#188038]" },
};

const PRIORITY_CARD: Record<string, { bg: string; text: string; sub: string; border: string }> = {
  URGENT: { bg: "bg-red-50",    text: "text-red-900",    sub: "text-red-400",    border: "border-red-200"    },
  HIGH:   { bg: "bg-orange-50", text: "text-orange-900", sub: "text-orange-400", border: "border-orange-200" },
  MEDIUM: { bg: "bg-blue-50",   text: "text-blue-900",   sub: "text-blue-400",   border: "border-blue-200"   },
  LOW:    { bg: "bg-[#f8f9fa]", text: "text-[#202124]",  sub: "text-[#5f6368]",  border: "border-[#dadce0]"  },
};

const POSITION_STEP = 1000;

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";

interface Task {
  id: string;
  sequenceNumber: number;
  goalSequenceNumber?: number | null;
  title: string;
  status: TaskStatus;
  priority: string;
  position: number;
  recurrence: string;
  dueDate?: string | null;
  assignee?: { name: string | null } | null;
  goal?: { id: string; title: string; key: string; position: number } | null;
}

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  projectId: string;
  projectKey: string;
  tasks: Task[];
  members: Member[];
  currentUserId: string;
}

function getColumnId(task: Task) {
  return `${task.goal?.id ?? "__none__"}::${task.status}`;
}

function positionForInsert(tasks: Task[], index: number) {
  if (tasks.length === 0) return POSITION_STEP;
  if (index <= 0) return tasks[0].position - POSITION_STEP;
  if (index >= tasks.length) return tasks[tasks.length - 1].position + POSITION_STEP;
  return (tasks[index - 1].position + tasks[index].position) / 2;
}

function normalizeTask(task: any): Task {
  return {
    id: task.id,
    sequenceNumber: task.sequenceNumber,
    goalSequenceNumber: task.goalSequenceNumber,
    title: task.title,
    status: task.status as TaskStatus,
    priority: task.priority,
    position: task.position,
    recurrence: task.recurrence ?? "NONE",
    dueDate: task.dueDate ?? null,
    assignee: task.assignee ? { name: task.assignee.name } : null,
    goal: task.goal
      ? { id: task.goal.id, title: task.goal.title, key: task.goal.key, position: task.goal.position }
      : null,
  };
}

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export function BoardClient({ projectId, projectKey, tasks: initialTasks, members, currentUserId }: Props) {
  const { open } = useTaskPanel();
  const { data: queryTasks } = useTasks(projectId);
  const { data: goals = [] } = useGoals();
  const [tasks, setTasks] = useState(initialTasks);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [creatingGoalId, setCreatingGoalId] = useState<string | null>(null);
  const [showAllGoals, setShowAllGoals] = useState(false);
  const updateTask = useUpdateTask(projectId);

  useEffect(() => {
    if (queryTasks) {
      setTasks(queryTasks.map(normalizeTask));
    }
  }, [queryTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const sortedTasks = [...tasks].sort((a, b) => a.position - b.position);
  const activeGoals = [...goals].filter((g) => !g.completedAt).sort((a, b) => a.position - b.position);
  const completedGoals = [...goals].filter((g) => g.completedAt).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
  const ungrouped = sortedTasks.filter((t) => !t.goal);

  const toSection = (g: (typeof goals)[number]) => ({
    id: g.id,
    title: g.title,
    goalKey: g.key,
    completed: !!g.completedAt,
    tasks: sortedTasks.filter((t) => t.goal?.id === g.id),
  });

  const allSections = [
    ...activeGoals.map(toSection),
    ...(ungrouped.length > 0
      ? [{ id: "__none__", title: "No goal", goalKey: null, completed: false, tasks: ungrouped }]
      : []),
    ...completedGoals.map(toSection),
  ];

  const sections = showAllGoals
    ? allSections
    : allSections.filter((section) => !section.completed && (section.tasks.length > 0 || section.id === "__none__"));

  const draggingTask = draggingId ? tasks.find((t) => t.id === draggingId) ?? null : null;

  function handleTaskCreated(task: any) {
    setTasks((current) => [...current, normalizeTask(task)]);
    setCreatingGoalId(null);
  }

  function handleDragStart({ active }: DragStartEvent) {
    setDraggingId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDraggingId(null);
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const targetId = over.id as string;
    const targetTask = tasks.find((t) => t.id === targetId);
    const targetColumnId = targetTask ? getColumnId(targetTask) : targetId.includes("::") ? targetId : null;
    if (!targetColumnId) return;

    const destinationTasks = sortedTasks.filter((t) => getColumnId(t) === targetColumnId && t.id !== taskId);
    const destinationStatus = targetColumnId.split("::")[1] as TaskStatus;
    let newPosition = task.position;
    let newStatus: TaskStatus = task.status;

    if (targetTask) {
      newStatus = targetTask.status;
      const insertIndex = destinationTasks.findIndex((t) => t.id === targetTask.id);
      newPosition = positionForInsert(destinationTasks, insertIndex);
    } else {
      newStatus = destinationStatus;
      newPosition = positionForInsert(destinationTasks, destinationTasks.length);
    }

    if (newStatus === task.status && newPosition === task.position) return;

    const previousTasks = [...tasks];
    const updatedTask = { ...task, status: newStatus, position: newPosition };
    setTasks(
      [...tasks.map((t) => (t.id === taskId ? updatedTask : t))].sort((a, b) => a.position - b.position)
    );

    updateTask.mutate(
      { id: taskId, data: { status: newStatus, position: newPosition } },
      {
        onError: () => {
          setTasks(previousTasks);
        },
      }
    );
  }

  if (sections.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#202124]">Board</p>
            <p className="text-xs text-[#5f6368]">Add a task right from the board.</p>
          </div>
        </div>

        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          No tasks yet. Create one to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">Board</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setShowAllGoals(false)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${showAllGoals ? "text-slate-600 hover:bg-slate-200" : "bg-white text-slate-900 shadow-sm"}`}
          >
            Goals with tasks
          </button>
          <button
            type="button"
            onClick={() => setShowAllGoals(true)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${showAllGoals ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-200"}`}
          >
            All goals
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.id}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className={`font-extrabold text-lg ${section.completed ? "text-gray-400 line-through" : "text-[#c4688a]"}`}>{section.title}</h2>
                  {section.goalKey && (
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${section.completed ? "bg-gray-50 text-gray-400 border-gray-200" : "bg-[#fdf2f5] text-[#c4688a] border-[#f0c4cf]"}`}>
                      {section.goalKey}
                    </span>
                  )}
                  {section.completed && (
                    <span className="text-xs text-green-600 font-medium">Achieved</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {section.tasks.length} task{section.tasks.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div
                  className="grid overflow-x-auto pb-2"
                  style={{
                    gridTemplateColumns: `repeat(${STATUSES.length}, minmax(13rem, 1fr))`,
                    borderLeft: "1px solid #dadce0",
                  }}
                >
                  {STATUSES.map(({ value, label }) => {
                    const col = section.tasks.filter((t) => t.status === value);
                    const droppableId = `${section.id}::${value}`;
                    const colors = STATUS_COLORS[value];
                    const isTodoColumn = value === "TODO";
                    const showCreateInThisColumn = isTodoColumn && creatingGoalId === section.id;
                    const showPlusInThisColumn = isTodoColumn && !!section.goalKey && !showCreateInThisColumn;
                    return (
                      <DroppableColumn
                        key={droppableId}
                        id={droppableId}
                        label={label}
                        count={col.length}
                        headerColor={colors?.header ?? "text-[#5f6368]"}
                        pillColor={colors?.pill ?? ""}
                        showCreateForm={showCreateInThisColumn}
                        onCreateFormClose={() => setCreatingGoalId(null)}
                        onTaskCreated={handleTaskCreated}
                        projectId={projectId}
                        members={members}
                        currentUserId={currentUserId}
                        goalId={section.id}
                        showPlusButton={showPlusInThisColumn}
                        onPlusClick={() => setCreatingGoalId(section.id)}
                      >
                        <SortableContext items={col.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                          {col.map((task) => (
                            <DraggableCard
                              key={task.id}
                              task={task}
                              onOpen={() => open(task.id)}
                            />
                          ))}
                        </SortableContext>
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
      </div>
    );
}

function DroppableColumn({
  id, label, count, children, headerColor, pillColor, showCreateForm, onCreateFormClose, onTaskCreated, projectId, members, currentUserId, goalId, showPlusButton, onPlusClick,
}: {
  id: string; label: string; count: number; children: React.ReactNode;
  headerColor: string; pillColor: string;
  showCreateForm?: boolean;
  onCreateFormClose?: () => void;
  onTaskCreated?: (task: any) => void;
  projectId?: string;
  members?: Member[];
  currentUserId?: string;
  goalId?: string;
  showPlusButton?: boolean;
  onPlusClick?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className="flex flex-col"
      style={{ borderRight: "1px solid #dadce0" }}
    >
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid #dadce0" }}>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pillColor}`}>
          {label}
        </span>
        <span className="text-xs text-[#5f6368]">{count}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-1.5 min-h-[80px] p-2 transition-colors ${
          isOver ? "bg-[#e8f0fe]" : "bg-white"
        }`}
      >
        {children}
        {showCreateForm && onCreateFormClose && onTaskCreated && projectId && members && currentUserId && goalId && (
          <CreateTaskForm
            projectId={projectId}
            members={members}
            currentUserId={currentUserId}
            defaultGoalId={goalId}
            onClose={onCreateFormClose}
            onCreate={onTaskCreated}
          />
        )}
        {showPlusButton && onPlusClick && !showCreateForm && (
          <button
            onClick={onPlusClick}
            className="w-full flex items-center justify-center p-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
            title="Add task"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
    >
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task, isDragging }: { task: Task; isDragging?: boolean }) {
  const colors = PRIORITY_CARD[task.priority] ?? PRIORITY_CARD.LOW;

  return (
    <div
      className={`${colors.bg} border ${colors.border} rounded-lg px-2.5 py-1.5 cursor-grab active:cursor-grabbing select-none transition ${
        isDragging ? "shadow-xl rotate-1 opacity-90" : "hover:shadow-sm"
      }`}
    >
      <p className={`text-xs font-medium leading-snug ${colors.text}`}>{task.title}</p>
      {task.dueDate && (
        <p className={`text-[10px] italic mt-0.5 ${colors.sub}`}>
          {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      )}
    </div>
  );
}

function CreateTaskForm({ projectId, members, currentUserId, defaultGoalId, onClose, onCreate }: {
  projectId: string;
  members: Member[];
  currentUserId: string;
  defaultGoalId?: string | null;
  onClose: () => void;
  onCreate: (task: any) => void;
}) {
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState(defaultGoalId ?? "");
  const [showSuccess, setShowSuccess] = useState(false);
  const createTask = useCreateTask();
  const { data: goals = [] } = useGoals();
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createTask.mutate(
      {
        title: title.trim(),
        projectId,
        status: "TODO" as const,
        priority: "MEDIUM" as const,
        type: "TASK" as const,
        goalId: goalId || null,
        assigneeId: null,
        dueDate: null,
        recurrence: "NONE",
        labels: [],
      },
      {
        onSuccess: (task) => {
          onCreate(task);
          setShowSuccess(true);
          setTitle("");
          setGoalId(defaultGoalId ?? "");
          setTimeout(() => {
            setShowSuccess(false);
            onClose();
          }, 2000);
        },
      }
    );
  }

  if (showSuccess) {
    return (
      <div className="bg-[#e6f4ea] border border-[#188038] rounded-lg px-2.5 py-1.5 text-center">
        <p className="text-xs font-medium text-[#188038]">✓ Task created</p>
      </div>
    );
  }

  const colors = PRIORITY_CARD.LOW;

  return (
    <form onSubmit={handleSubmit} className={`${colors.bg} border ${colors.border} rounded-lg px-2.5 py-1.5 transition`}>
      <div className="flex items-center gap-1.5">
        <input autoFocus required placeholder="New task…" value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
          className={`flex-1 text-xs font-medium ${colors.text} bg-transparent placeholder:text-[#5f6368] outline-none`} />
        <button type="submit" disabled={createTask.isPending} className="p-0.5 text-gray-400 hover:text-blue-600 transition" title="Save">
          <Save className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onClose} className="p-0.5 text-gray-400 hover:text-red-600 transition" title="Cancel">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
