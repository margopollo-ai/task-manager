import { z } from "zod";

const keyRegex = /^[A-Z][A-Z0-9]{1,9}$/;

export const createProjectSchema = z.object({
  name: z.string().min(1).max(80),
  key: z
    .string()
    .regex(keyRegex, "Key must be 2-10 uppercase letters/digits starting with a letter"),
  description: z.string().max(500).optional(),
  organizationId: z.string().cuid(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
