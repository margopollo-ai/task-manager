import { z } from "zod";

const slugRegex = /^[a-z0-9-]{2,48}$/;

export const createOrgSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .regex(slugRegex, "Slug must be 2-48 lowercase letters, digits, or hyphens"),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
