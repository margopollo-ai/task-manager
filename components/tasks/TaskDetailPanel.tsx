"use client";

import { useTaskPanel } from "@/lib/store";
import { useTask, useUpdateTask, useDeleteTask } from "@/lib/hooks/useTasks";
import { useGoals } from "@/lib/hooks/useGoals";
import { useQuery } from "@tanstack/react-query";
import { X, Trash2, Plus, CalendarPlus } from "lucide-react";
import { useState, useEffect } from "react";

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  projectId?: string;
  members?: Member[];
}

export function TaskDetailPanel({ projectId: projectIdProp, members: membersProp }: Props) {
  const { taskId, close } = useTaskPanel();
  const { data: task, isLoading } = useTask(taskId ?? "");

  const projectId = projectIdProp ?? task?.projectId ?? "";

  const { data: fetchedMembers } = useQuery<Member[]>({
    queryKey: ["project-members", projectId],
    queryFn: () => fetch(`/api/projects/${projectId}/members`).then((r) => r.json()),
    enabled: !membersProp && !!projectId,
  });
  const members = membersProp ?? fetchedMembers ?? [];

  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const { data: goals } = useGoals();

  // Local draft state for all editable fields
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [goalId, setGoalId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [recurrence, setRecurrence] = useState("NONE");
  const [labelInput, setLabelInput] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Sync local state when task loads or taskId changes
  useEffect(() => {
    if (task) {
      setTitle(task.title ?? "");
      setStatus(task.status ?? "TODO");
      setPriority(task.priority ?? "MEDIUM");

      setAssigneeId(task.assigneeId ?? "");
      setGoalId(task.goalId ?? "");
      setDueDate(task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-CA", { timeZone: "UTC" }) : "");
      setScheduledStart(task.scheduledStart ? toLocalDateTimeInput(task.scheduledStart) : "");
      setScheduledEnd(task.scheduledEnd ? toLocalDateTimeInput(task.scheduledEnd) : "");
      setRecurrence(task.recurrence ?? "NONE");
      setLabels(task.labels ?? []);
      setDescription(task.description ?? "");
      setSaveState("idle");
    }
  }, [task, taskId]);

  if (!taskId) return null;

  function handleDelete() {
    if (!confirm("Delete this task?")) return;
    deleteTask.mutate(taskId!, { onSuccess: close });
  }

  function addLabel() {
    const val = labelInput.trim();
    if (val && !labels.includes(val)) {
      setLabels([...labels, val]);
    }
    setLabelInput("");
  }

  function removeLabel(l: string) {
    setLabels(labels.filter((x) => x !== l));
  }

  function handleSave() {
    if (!task) return;
    setSaveState("saving");
    updateTask.mutate(
      {
        id: task.id,
        data: {
          title: title.trim() || task.title,
          status: status as never,
          priority: priority as never,

          assigneeId: assigneeId || null,
          goalId: goalId || null,
          dueDate: dueDate ? new Date(dueDate + "T12:00:00").toISOString() : null,
          scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
          scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
          recurrence: recurrence as never,
          labels,
          description,
        },
      },
      {
        onSuccess: () => {
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 2000);
        },
        onError: () => setSaveState("error"),
      }
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={close} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden" style={{ borderLeft: "1px solid var(--gc-border)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          {isLoading || !task ? (
            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
          ) : (
            <span className="text-xs font-mono text-gray-400">
              {task.goal?.key && task.goalSequenceNumber
                ? `${task.goal.key}-${task.goalSequenceNumber}`
                : `${task.project?.key ?? ""}-${task.sequenceNumber}`}
            </span>
          )}
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={close} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 transition" title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading || !task ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* Title */}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl font-semibold text-[#202124] border-b border-transparent hover:border-[#dadce0] focus:border-[#1a73e8] outline-none bg-transparent pb-1"
              />

              {/* Attributes grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Field label="Status">
                  <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="w-full border border-[#dadce0] rounded-lg px-2 py-1 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]">
                    {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                </Field>

                <Field label="Priority">
                  <select value={priority} onChange={(e) => setPriority(e.target.value)}
                    className="w-full border border-[#dadce0] rounded-lg px-2 py-1 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>

<Field label="Assignee">
                  <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full border border-[#dadce0] rounded-lg px-2 py-1 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]">
                    <option value="">Unassigned</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.id}</option>)}
                  </select>
                </Field>

                <Field label="Goal">
                  <select value={goalId} onChange={(e) => setGoalId(e.target.value)}
                    className="w-full border border-[#dadce0] rounded-lg px-2 py-1 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]">
                    <option value="">No goal</option>
                    {goals?.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </select>
                </Field>

                <Field label="Due date">
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-[#dadce0] rounded-lg px-2 py-1 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]" />
                </Field>

                <Field label="Labels">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      {labels.map((l) => (
                        <span key={l} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                          {l}
                          <button onClick={() => removeLabel(l)} className="text-gray-400 hover:text-red-500 leading-none">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLabel())}
                        placeholder="Add label…"
                        className="flex-1 border border-[#dadce0] rounded-lg px-2 py-1 text-xs text-[#202124] placeholder:text-[#5f6368] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                      />
                      <button onClick={addLabel} className="p-1 text-gray-400 hover:text-blue-600 border border-gray-200 rounded-md">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Field>
              </div>

              {/* Save button */}
              <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  disabled={saveState === "saving"}
                  className="bg-[#1a73e8] text-white text-sm px-4 py-1.5 rounded-lg hover:bg-[#1765cc] disabled:opacity-50 transition"
                >
                  {saveState === "saving" ? "Saving…" : "Save changes"}
                </button>
                {saveState === "saved" && <span className="text-xs text-green-600">✓ Saved</span>}
                {saveState === "error" && <span className="text-xs text-red-500">Save failed — try again</span>}
              </div>

              {/* Scheduling */}
              <div className="space-y-3 pt-1 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Schedule</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="Start">
                    <input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)}
                      className="w-full border border-[#dadce0] rounded-lg px-2 py-1 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]" />
                  </Field>
                  <Field label="End">
                    <input type="datetime-local" value={scheduledEnd} onChange={(e) => setScheduledEnd(e.target.value)}
                      className="w-full border border-[#dadce0] rounded-lg px-2 py-1 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]" />
                  </Field>
                  <Field label="Repeats">
                    <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}
                      className="w-full border border-[#dadce0] rounded-lg px-2 py-1 text-xs text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]">
                      <option value="NONE">Does not repeat</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </Field>
                  {scheduledStart && scheduledEnd && (
                    <Field label="Google Calendar">
                      <a
                        href={buildGoogleCalendarUrl({ title, description, scheduledStart, scheduledEnd, recurrence })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs bg-[#1a73e8] text-white px-3 py-1.5 rounded-lg hover:bg-[#1765cc] transition"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        Add to Calendar
                      </a>
                    </Field>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description…"
                  className="w-full text-sm text-[#202124] border border-[#dadce0] rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#1a73e8] resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">Description saves with the Save button above.</p>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      {children}
    </div>
  );
}

function statusLabel(s: string) {
  return { TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "Follow Up", DONE: "Done", CANCELLED: "Cancelled" }[s] ?? s;
}

function toLocalDateTimeInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildGoogleCalendarUrl({ title, description, scheduledStart, scheduledEnd, recurrence }: {
  title: string; description: string; scheduledStart: string; scheduledEnd: string; recurrence: string;
}) {
  const fmt = (s: string) => new Date(s).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(scheduledStart)}/${fmt(scheduledEnd)}`,
    details: description,
  });
  if (recurrence !== "NONE") params.append("recur", `RRULE:FREQ=${recurrence}`);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export { };
