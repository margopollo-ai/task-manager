"use client";

import { useState, useRef } from "react";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/lib/hooks/useTasks";
import { useGoals } from "@/lib/hooks/useGoals";
import { useTaskPanel } from "@/lib/store";
import { StatusBadge, PriorityBadge } from "@/components/tasks/TaskBadges";
import { Plus, X, Pencil, Trash2, CalendarPlus, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  projectId: string;
  projectKey: string;
  members: Member[];
  currentUserId: string;
}

interface TaskRow {
  id: string;
  sequenceNumber: number;
  goalSequenceNumber?: number | null;
  title: string;
  status: string;
  priority: string;
  assignee?: { id: string; name: string | null } | null;
  assigneeText?: string | null;
  goal?: { key: string } | null;
  dueDate?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  recurrence?: string | null;
}

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const STATUS_ORDER: Record<string, number> = { TODO: 0, IN_PROGRESS: 1, IN_REVIEW: 2, DONE: 3, CANCELLED: 4 };
const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

type SortKey = "id" | "title" | "status" | "priority" | "assignee" | "dueDate" | "schedule";
type SortDir = "asc" | "desc";

function sortTasks(tasks: TaskRow[], key: SortKey, dir: SortDir): TaskRow[] {
  return [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "id":        cmp = a.sequenceNumber - b.sequenceNumber; break;
      case "title":     cmp = a.title.localeCompare(b.title); break;
      case "status":    cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99); break;
      case "priority":  cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99); break;
      case "assignee":  cmp = (a.assignee?.name ?? "").localeCompare(b.assignee?.name ?? ""); break;
      case "dueDate":   cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? ""); break;
      case "schedule":  cmp = (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? ""); break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "Follow Up", DONE: "Done", CANCELLED: "Cancelled",
};

export function BacklogClient({ projectId, projectKey, members, currentUserId }: Props) {
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const filters = Object.fromEntries(
    Object.entries({ status: statusFilter, priority: priorityFilter, assigneeId: assigneeFilter }).filter(([, v]) => v)
  );

  const { data: rawTasks = [], isLoading } = useTasks(projectId, filters);
  const tasks = sortKey ? sortTasks(rawTasks as TaskRow[], sortKey, sortDir) : rawTasks;
  const { open } = useTaskPanel();
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const activeFilters = [statusFilter, priorityFilter, assigneeFilter].filter(Boolean).length;

  function save(id: string, data: Record<string, unknown>) {
    updateTask.mutate({ id, data: data as never });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs text-[#202124] border border-[#dadce0] rounded-full px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a73e8]">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs text-[#202124] border border-[#dadce0] rounded-full px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a73e8]">
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-xs text-[#202124] border border-[#dadce0] rounded-full px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a73e8]">
            <option value="">All assignees</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.id}</option>)}
          </select>

          {activeFilters > 0 && (
            <button onClick={() => { setStatusFilter(""); setPriorityFilter(""); setAssigneeFilter(""); }}
              className="text-xs text-[#5f6368] flex items-center gap-1 hover:text-gray-600">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        <button onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1.5 text-sm bg-[#1a73e8] text-white px-3 py-1.5 rounded-lg hover:bg-[#1765cc] transition shrink-0">
          <Plus className="w-4 h-4" /> New task
        </button>
      </div>

      {showCreateForm && (
        <CreateTaskForm projectId={projectId} members={members} currentUserId={currentUserId}
          onClose={() => setShowCreateForm(false)} />
      )}

      {/* Table */}
      <div className="bg-white border border-[#dadce0] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[#5f6368] font-medium border-b border-[#f1f3f4] bg-[#f1f3f4]">
              <SortTh label="ID"       col="id"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-24" />
              <SortTh label="Title"    col="title"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="Status"   col="status"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-32" />
              <SortTh label="Priority" col="priority" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-28" />
              <SortTh label="Assignee" col="assignee" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-32" />
              <SortTh label="Due date" col="dueDate"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-28" />
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-[#f1f3f4]">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-gray-100 animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-[#5f6368] text-sm">
                  No tasks found. Create your first task above.
                </td>
              </tr>
            ) : (
              tasks.map((task: TaskRow) => (
                <tr key={task.id} className="border-b border-[#f1f3f4] hover:bg-[#f1f3f4]/60 group">
                  <td className="px-4 py-2 font-mono text-xs text-[#5f6368] whitespace-nowrap">
                    {task.goal?.key && task.goalSequenceNumber
                      ? `${task.goal.key}-${task.goalSequenceNumber}`
                      : `${projectKey}-${task.sequenceNumber}`}
                  </td>

                  <td className="px-4 py-2 max-w-xs">
                    <InlineText
                      value={task.title}
                      onSave={(v) => save(task.id, { title: v })}
                      className="font-medium text-[#202124]"
                    />
                  </td>

                  <td className="px-4 py-2">
                    <InlineSelect
                      value={task.status}
                      options={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                      onChange={(v) => save(task.id, { status: v })}
                      renderDisplay={<StatusBadge status={task.status} />}
                    />
                  </td>

                  <td className="px-4 py-2">
                    <InlineSelect
                      value={task.priority}
                      options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
                      onChange={(v) => save(task.id, { priority: v })}
                      renderDisplay={<PriorityBadge priority={task.priority} />}
                    />
                  </td>

                  <td className="px-4 py-2">
                    <InlineAssignee
                      assignee={task.assignee ?? null}
                      assigneeText={task.assigneeText ?? null}
                      members={members}
                      onChange={(id, text) => save(task.id, { assigneeId: id || null, assigneeText: text || null })}
                    />
                  </td>

                  <td className="px-4 py-2">
                    <InlineDate
                      value={task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-CA", { timeZone: "UTC" }) : ""}
                      onSave={(v) => save(task.id, { dueDate: v ? new Date(v + "T12:00:00").toISOString() : null })}
                    />
                  </td>

                  <td className="px-2 py-2">
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      <button
                        onClick={() => open(task.id)}
                        className="p-1 rounded hover:bg-[#e8f0fe] text-[#5f6368] hover:text-[#1a73e8] transition"
                        title="Edit task"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this task?")) deleteTask.mutate(task.id);
                        }}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && tasks.length > 0 && (
        <p className="text-xs text-[#5f6368]">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
      )}
    </div>
  );
}

// ── Sortable header cell ────────────────────────────────────────────────────

function SortTh({ label, col, sortKey, sortDir, onSort, className }: {
  label: string; col: SortKey; sortKey: SortKey | null; sortDir: SortDir;
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = sortKey === col;
  const Icon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th
      className={`text-left px-4 py-2.5 cursor-pointer select-none hover:bg-[#e8eaed] transition ${className ?? ""}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={`w-3 h-3 ${active ? "text-[#1a73e8]" : "text-gray-300"}`} />
      </span>
    </th>
  );
}

// ── Inline editing cells ────────────────────────────────────────────────────

function InlineText({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
        className="w-full border border-[#1a73e8] rounded px-2 py-0.5 text-sm text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`block cursor-text truncate rounded px-2 py-0.5 hover:bg-[#f1f3f4] transition ${className ?? ""}`}
    >
      {value}
    </span>
  );
}

function InlineSelect({ value, options, onChange, renderDisplay }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  renderDisplay: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <select
        autoFocus
        value={value}
        onChange={(e) => { onChange(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
        className="border border-[#1a73e8] rounded px-1.5 py-0.5 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-pointer rounded px-1 py-0.5 hover:bg-[#f1f3f4] transition inline-flex"
    >
      {renderDisplay}
    </span>
  );
}

function InlineAssignee({ assignee, assigneeText, members, onChange }: {
  assignee: { id: string; name: string | null } | null;
  assigneeText: string | null;
  members: Member[];
  onChange: (id: string, text: string) => void;
}) {
  const displayName = assigneeText || assignee?.name || null;
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const listId = "assignee-members";

  function commit(value: string) {
    const trimmed = value.trim();
    setEditing(false);
    setQuery("");
    if (!trimmed) { onChange("", ""); return; }
    const match = members.find((m) => m.name?.toLowerCase() === trimmed.toLowerCase());
    if (match) onChange(match.id, "");       // known member → use assigneeId, clear text
    else onChange("", trimmed);              // unknown name → store as free text
  }

  if (editing) {
    return (
      <>
        <datalist id={listId}>
          {members.map((m) => <option key={m.id} value={m.name ?? ""} />)}
        </datalist>
        <input
          autoFocus
          list={listId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(query); }
            if (e.key === "Escape") { setEditing(false); setQuery(""); }
          }}
          placeholder="Type any name…"
          className="w-36 border border-[#1a73e8] rounded px-2 py-0.5 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
        />
      </>
    );
  }

  return (
    <span
      onClick={() => { setQuery(displayName ?? ""); setEditing(true); }}
      className="block cursor-pointer text-xs text-[#5f6368] rounded px-2 py-0.5 hover:bg-[#f1f3f4] transition"
    >
      {displayName ?? <span className="text-gray-300">—</span>}
    </span>
  );
}

const RECURRENCE_LABELS: Record<string, string> = {
  NONE: "No repeat", DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly",
};

function toDateTimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildGCalUrl(title: string, start: string, end: string, recurrence: string) {
  const fmt = (s: string) => new Date(s).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${fmt(start)}/${fmt(end)}` });
  if (recurrence !== "NONE") params.append("recur", `RRULE:FREQ=${recurrence}`);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function InlineSchedule({ scheduledStart, scheduledEnd, recurrence, title, onSave }: {
  scheduledStart: string | null;
  scheduledEnd: string | null;
  recurrence: string;
  title: string;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [repeat, setRepeat] = useState("NONE");

  function openEditor() {
    setStart(scheduledStart ? toDateTimeLocal(scheduledStart) : "");
    setEnd(scheduledEnd ? toDateTimeLocal(scheduledEnd) : "");
    setRepeat(recurrence ?? "NONE");
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    onSave({
      scheduledStart: start ? new Date(start).toISOString() : null,
      scheduledEnd: end ? new Date(end).toISOString() : null,
      recurrence: repeat,
    });
  }

  if (editing) {
    return (
      <div className="space-y-1.5 py-1">
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)}
          className="w-full border border-[#1a73e8] rounded px-1.5 py-0.5 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]" />
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)}
          className="w-full border border-[#1a73e8] rounded px-1.5 py-0.5 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]" />
        <select value={repeat} onChange={(e) => setRepeat(e.target.value)}
          className="w-full border border-[#1a73e8] rounded px-1.5 py-0.5 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]">
          {Object.entries(RECURRENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <button onClick={commit}
            className="text-xs bg-[#1a73e8] text-white px-2.5 py-0.5 rounded hover:bg-[#1765cc] transition">
            Save
          </button>
          <button onClick={() => setEditing(false)}
            className="text-xs text-[#5f6368] hover:text-gray-600 px-1">
            Cancel
          </button>
          {start && end && (
            <a href={buildGCalUrl(title, start, end, repeat)} target="_blank" rel="noopener noreferrer"
              className="ml-auto text-[#1a73e8] hover:text-[#1765cc]" title="Add to Google Calendar">
              <CalendarPlus className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  if (scheduledStart) {
    const fmt = (s: string) => new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    return (
      <div onClick={openEditor} className="cursor-pointer rounded px-2 py-0.5 hover:bg-[#f1f3f4] transition">
        <p className="text-xs text-gray-700">{fmt(scheduledStart)}</p>
        {scheduledEnd && <p className="text-xs text-[#5f6368]">→ {fmt(scheduledEnd)}</p>}
        {recurrence && recurrence !== "NONE" && (
          <p className="text-xs text-[#1a73e8]">{RECURRENCE_LABELS[recurrence]}</p>
        )}
      </div>
    );
  }

  return (
    <span onClick={openEditor}
      className="block cursor-pointer text-xs text-gray-200 rounded px-2 py-0.5 hover:bg-[#f1f3f4] hover:text-[#5f6368] transition">
      —
    </span>
  );
}

function InlineDate({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit(v: string) {
    setEditing(false);
    if (v !== value) onSave(v);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => { if (e.key === "Enter") commit(draft); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
        className="border border-[#1a73e8] rounded px-1.5 py-0.5 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className="block cursor-pointer text-xs text-[#5f6368] rounded px-2 py-0.5 hover:bg-[#f1f3f4] transition"
    >
      {value ? new Date(value + "T12:00:00").toLocaleDateString("en-US") : <span className="text-gray-200">—</span>}
    </span>
  );
}

// ── Create form ─────────────────────────────────────────────────────────────

function CreateTaskForm({ projectId, members, currentUserId, onClose }: {
  projectId: string; members: Member[]; currentUserId: string; onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [dueDate, setDueDate] = useState("");
  const [isDaily, setIsDaily] = useState(false);
  const createTask = useCreateTask();
  const { data: goals } = useGoals();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createTask.mutate(
      {
        title: title.trim(), projectId,
        status: "TODO" as const,
        priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
        type: "TASK" as const,
        goalId: goalId || null,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate + "T12:00:00").toISOString() : null,
        recurrence: isDaily ? "DAILY" : "NONE",
        labels: [],
      },
      { onSuccess: onClose }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#f8f9fa] border border-[#dadce0] rounded-xl p-4 space-y-3">
      <input autoFocus required placeholder="Task title…" value={title} onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm text-[#202124] placeholder:text-[#5f6368] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]" />
      <div className="flex gap-2 flex-wrap items-center">
        <select value={goalId} onChange={(e) => setGoalId(e.target.value)}
          className="text-xs text-[#202124] border border-[#dadce0] rounded-full px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a73e8]">
          <option value="">No goal</option>
          {goals?.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}
          className="text-xs text-[#202124] border border-[#dadce0] rounded-full px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a73e8]">
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
          className="text-xs text-[#202124] border border-[#dadce0] rounded-full px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a73e8]">
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
          className="text-xs text-[#202124] border border-[#dadce0] rounded-full px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a73e8]" />
        <label className="flex items-center gap-2 text-xs text-[#5f6368] cursor-pointer">
          <input type="checkbox" checked={isDaily} onChange={(e) => setIsDaily(e.target.checked)}
            className="w-4 h-4 rounded border border-[#dadce0] cursor-pointer accent-[#1a73e8]" />
          Daily
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={createTask.isPending}
          className="text-sm bg-[#1a73e8] text-white px-4 py-1.5 rounded-lg hover:bg-[#1765cc] disabled:opacity-50 transition">
          {createTask.isPending ? "Creating…" : "Create task"}
        </button>
        <button type="button" onClick={onClose}
          className="text-sm text-[#5f6368] px-4 py-1.5 rounded-lg hover:bg-[#f1f3f4] transition">
          Cancel
        </button>
      </div>
    </form>
  );
}
