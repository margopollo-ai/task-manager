import { z } from "zod";

export const taskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
]);

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const taskTypeSchema = z.enum(["TASK", "BUG", "STORY", "EPIC"]);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: taskStatusSchema.default("TODO"),
  priority: taskPrioritySchema.default("MEDIUM"),
  type: taskTypeSchema.default("TASK"),
  projectId: z.string().cuid(),
  assigneeId: z.string().cuid().nullable().optional(),
  goalId: z.string().cuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  scheduledStart: z.string().datetime().nullable().optional(),
  scheduledEnd: z.string().datetime().nullable().optional(),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
  labels: z.array(z.string()).default([]),
});

export const updateTaskSchema = createTaskSchema
  .omit({ projectId: true })
  .extend({ position: z.number().optional() })
  .partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
