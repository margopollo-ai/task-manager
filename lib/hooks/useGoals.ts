"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Goal {
  id: string;
  title: string;
  description?: string | null;
  key: string;
  position: number;
  _count: { tasks: number };
}

export interface GoalTask {
  id: string;
  title: string;
  sequenceNumber: number;
  goalSequenceNumber?: number | null;
  status: string;
  priority: string;
  project: { key: string; organization: { slug: string } };
  assignee: { name: string | null; image: string | null } | null;
}

export interface GoalDetail extends Goal {
  tasks: GoalTask[];
}

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: () => fetch("/api/goals").then((r) => r.json()),
  });
}

export function useGoal(id: string, enabled: boolean) {
  return useQuery<GoalDetail>({
    queryKey: ["goal", id],
    queryFn: () => fetch(`/api/goals/${id}`).then((r) => r.json()),
    enabled,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; description?: string; key?: string } }) =>
      fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/goals/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useReorderGoals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ordered: { id: string; position: number }[]) =>
      Promise.all(
        ordered.map(({ id, position }) =>
          fetch(`/api/goals/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position }),
          })
        )
      ),
    onMutate: async (ordered) => {
      await queryClient.cancelQueries({ queryKey: ["goals"] });
      const previous = queryClient.getQueryData<Goal[]>(["goals"]);
      queryClient.setQueryData<Goal[]>(["goals"], (old) => {
        if (!old) return old;
        const posMap = new Map(ordered.map(({ id, position }) => [id, position]));
        return [...old]
          .map((g) => ({ ...g, position: posMap.get(g.id) ?? g.position }))
          .sort((a, b) => a.position - b.position);
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["goals"], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });
}
