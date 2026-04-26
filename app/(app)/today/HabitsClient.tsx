"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import { useTaskPanel } from "@/lib/store";

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate?: string | null;
  recurrence?: string | null;
  goal?: { title: string } | null;
  project?: { name: string } | null;
}

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  tasks: Task[];
  members: User[];
  currentUserId: string;
}

export function HabitsClient({ tasks, members, currentUserId }: Props) {
  const { open } = useTaskPanel();

  const dailyTasks = tasks.filter((t) => t.recurrence === 'DAILY');

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Target className="w-6 h-6 text-[#c4688a]" />
        <h1 className="text-2xl font-bold text-[#202124]">Habits</h1>
      </div>

      <div className="space-y-4">
        {dailyTasks.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-12">
            No daily habits found. Create daily recurring tasks in your goals to see them here.
          </div>
        ) : (
          dailyTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white border border-[#dadce0] rounded-lg p-4 shadow-sm hover:shadow-md transition cursor-pointer"
              onClick={() => open(task.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#202124]">{task.title}</p>
                  {task.goal && (
                    <p className="text-xs text-[#5f6368] mt-1">
                      {task.goal.title} {task.project && `· ${task.project.name}`}
                    </p>
                  )}
                  {task.dueDate && (
                    <p className="text-[11px] text-[#5f6368] mt-1">
                      Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
                <span className="text-[10px] uppercase text-[#5f6368] tracking-wide bg-gray-100 px-2 py-1 rounded">
                  {task.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}