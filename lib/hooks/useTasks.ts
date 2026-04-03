"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateTaskInput, CreateTaskInput } from "@/lib/validations/task";

export function useTasks(projectId: string, filters?: Record<string, string>) {
  const params = new URLSearchParams({ projectId, ...filters });
  return useQuery({
    queryKey: ["tasks", projectId, filters],
    queryFn: () => fetch(`/api/tasks?${params}`).then((r) => r.json()),
    enabled: !!projectId,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => fetch(`/api/tasks/${id}`).then((r) => r.json()),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskInput) =>
      fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", task.projectId] });
    },
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", projectId] });
      await queryClient.cancelQueries({ queryKey: ["task", id] });
      const previousList = queryClient.getQueryData(["tasks", projectId]);
      const previousTask = queryClient.getQueryData(["task", id]);
      queryClient.setQueryData(["tasks", projectId], (old: never[]) =>
        old?.map((t: { id: string }) => (t.id === id ? { ...t, ...data } : t))
      );
      queryClient.setQueryData(["task", id], (old: unknown) =>
        old ? { ...(old as object), ...data } : old
      );
      return { previousList, previousTask, id };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousList) queryClient.setQueryData(["tasks", projectId], ctx.previousList);
      if (ctx?.previousTask) queryClient.setQueryData(["task", ctx.id], ctx.previousTask);
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["task", id] });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });
}
