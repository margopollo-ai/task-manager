"use client";

import { useState, useRef } from "react";
import { useTasks, useCreateTask, useUpdateTask } from "@/lib/hooks/useTasks";
import { useGoals } from "@/lib/hooks/useGoals";
import { useTaskPanel } from "@/lib/store";
import { StatusBadge, PriorityBadge } from "@/components/tasks/TaskBadges";
import { Plus, X, MoreHorizontal, CalendarPlus } from "lucide-react";

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
  title: string;
  status: string;
  priority: string;
  assignee?: { id: string; name: string | null } | null;
  dueDate?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  recurrence?: string | null;
}

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "In Review", DONE: "Done", CANCELLED: "Cancelled",
};

export function BacklogClient({ projectId, projectKey, members, currentUserId }: Props) {
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const filters = Object.fromEntries(
    Object.entries({ status: statusFilter, priority: priorityFilter, assigneeId: assigneeFilter }).filter(([, v]) => v)
  );

  const { data: tasks = [], isLoading } = useTasks(projectId, filters);
  const { open } = useTaskPanel();
  const updateTask = useUpdateTask(projectId);
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
            className="text-xs text-blue-900 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs text-blue-900 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-xs text-blue-900 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">All assignees</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.id}</option>)}
          </select>

          {activeFilters > 0 && (
            <button onClick={() => { setStatusFilter(""); setPriorityFilter(""); setAssigneeFilter(""); }}
              className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        <button onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition shrink-0">
          <Plus className="w-4 h-4" /> New task
        </button>
      </div>

      {showCreateForm && (
        <CreateTaskForm projectId={projectId} members={members} currentUserId={currentUserId}
          onClose={() => setShowCreateForm(false)} />
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 font-medium border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2.5 w-24">ID</th>
              <th className="text-left px-4 py-2.5">Title</th>
              <th className="text-left px-4 py-2.5 w-32">Status</th>
              <th className="text-left px-4 py-2.5 w-28">Priority</th>
              <th className="text-left px-4 py-2.5 w-32">Assignee</th>
              <th className="text-left px-4 py-2.5 w-28">Due date</th>
              <th className="text-left px-4 py-2.5 w-44">Schedule</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-gray-100 animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                  No tasks found. Create your first task above.
                </td>
              </tr>
            ) : (
              tasks.map((task: TaskRow) => (
                <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-50/60 group">
                  <td className="px-4 py-2 font-mono text-xs text-gray-400 whitespace-nowrap">
                    {projectKey}-{task.sequenceNumber}
                  </td>

                  <td className="px-4 py-2 max-w-xs">
                    <InlineText
                      value={task.title}
                      onSave={(v) => save(task.id, { title: v })}
                      className="font-medium text-gray-800"
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
                      members={members}
                      onChange={(id) => save(task.id, { assigneeId: id || null })}
                    />
                  </td>

                  <td className="px-4 py-2">
                    <InlineDate
                      value={task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-CA", { timeZone: "UTC" }) : ""}
                      onSave={(v) => save(task.id, { dueDate: v ? new Date(v + "T12:00:00").toISOString() : null })}
                    />
                  </td>

                  <td className="px-4 py-2">
                    <InlineSchedule
                      scheduledStart={task.scheduledStart ?? null}
                      scheduledEnd={task.scheduledEnd ?? null}
                      recurrence={task.recurrence ?? "NONE"}
                      title={task.title}
                      onSave={(data) => save(task.id, data)}
                    />
                  </td>

                  <td className="px-2 py-2">
                    <button
                      onClick={() => open(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition"
                      title="Edit labels & description"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && tasks.length > 0 && (
        <p className="text-xs text-gray-400">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
      )}
    </div>
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
        className="w-full border border-blue-400 rounded px-2 py-0.5 text-sm text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`block cursor-text truncate rounded px-2 py-0.5 hover:bg-blue-50 transition ${className ?? ""}`}
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
        className="border border-blue-400 rounded px-1.5 py-0.5 text-xs text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-pointer rounded px-1 py-0.5 hover:bg-blue-50 transition inline-flex"
    >
      {renderDisplay}
    </span>
  );
}

function InlineAssignee({ assignee, members, onChange }: {
  assignee: { id: string; name: string | null } | null;
  members: Member[];
  onChange: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? members.filter((m) => m.name?.toLowerCase().includes(query.toLowerCase()))
    : members;

  function select(id: string) {
    onChange(id);
    setEditing(false);
    setQuery("");
  }

  function commit() {
    const trimmed = query.trim();
    if (!trimmed) {
      select("");
    } else {
      const match = filtered[0];
      select(match ? match.id : (assignee?.id ?? ""));
    }
  }

  if (editing) {
    return (
      <div className="relative">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { setEditing(false); setQuery(""); }
          }}
          placeholder="Search name…"
          className="w-32 border border-blue-400 rounded px-2 py-0.5 text-xs text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {filtered.length > 0 && (
          <ul className="absolute z-50 top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden text-xs">
            <li>
              <button
                onMouseDown={(e) => { e.preventDefault(); select(""); }}
                className="w-full text-left px-3 py-1.5 text-gray-400 hover:bg-gray-50"
              >
                Unassigned
              </button>
            </li>
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); select(m.id); }}
                  className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-blue-50"
                >
                  {m.name ?? m.id}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="block cursor-pointer text-xs text-gray-500 rounded px-2 py-0.5 hover:bg-blue-50 transition"
    >
      {assignee?.name ?? <span className="text-gray-300">—</span>}
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
          className="w-full border border-blue-400 rounded px-1.5 py-0.5 text-xs text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)}
          className="w-full border border-blue-400 rounded px-1.5 py-0.5 text-xs text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <select value={repeat} onChange={(e) => setRepeat(e.target.value)}
          className="w-full border border-blue-400 rounded px-1.5 py-0.5 text-xs text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500">
          {Object.entries(RECURRENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <button onClick={commit}
            className="text-xs bg-blue-600 text-white px-2.5 py-0.5 rounded hover:bg-blue-700 transition">
            Save
          </button>
          <button onClick={() => setEditing(false)}
            className="text-xs text-gray-400 hover:text-gray-600 px-1">
            Cancel
          </button>
          {start && end && (
            <a href={buildGCalUrl(title, start, end, repeat)} target="_blank" rel="noopener noreferrer"
              className="ml-auto text-blue-500 hover:text-blue-700" title="Add to Google Calendar">
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
      <div onClick={openEditor} className="cursor-pointer rounded px-2 py-0.5 hover:bg-blue-50 transition">
        <p className="text-xs text-gray-700">{fmt(scheduledStart)}</p>
        {scheduledEnd && <p className="text-xs text-gray-400">→ {fmt(scheduledEnd)}</p>}
        {recurrence && recurrence !== "NONE" && (
          <p className="text-xs text-blue-400">{RECURRENCE_LABELS[recurrence]}</p>
        )}
      </div>
    );
  }

  return (
    <span onClick={openEditor}
      className="block cursor-pointer text-xs text-gray-200 rounded px-2 py-0.5 hover:bg-blue-50 hover:text-gray-400 transition">
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
        className="border border-blue-400 rounded px-1.5 py-0.5 text-xs text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className="block cursor-pointer text-xs text-gray-400 rounded px-2 py-0.5 hover:bg-blue-50 transition"
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
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        labels: [],
      },
      { onSuccess: onClose }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <input autoFocus required placeholder="Task title…" value={title} onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-blue-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <div className="flex gap-2 flex-wrap">
        <select value={goalId} onChange={(e) => setGoalId(e.target.value)}
          className="text-xs text-blue-900 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">No goal</option>
          {goals?.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}
          className="text-xs text-blue-900 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
          className="text-xs text-blue-900 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
          className="text-xs text-blue-900 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={createTask.isPending}
          className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
          {createTask.isPending ? "Creating…" : "Create task"}
        </button>
        <button type="button" onClick={onClose}
          className="text-sm text-gray-500 px-4 py-1.5 rounded-lg hover:bg-gray-100 transition">
          Cancel
        </button>
      </div>
    </form>
  );
}
