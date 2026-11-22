import { z } from "zod";
import { AppError } from "./errors";

export const MAX_CONTENT_CHARS = 1_000_000;

export const emailSchema = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }));

export const titleSchema = z
  .string({ error: "Title is required" })
  .trim()
  .min(1, { error: "Title can't be empty" })
  .max(200, { error: "Title must be 200 characters or fewer" });

export const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, { error: "Password must be at least 8 characters" })
  // bcrypt only uses the first 72 bytes
  .max(72, { error: "Password must be 72 characters or fewer" });

export const signupSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, { error: "Name is required" })
    .max(100, { error: "Name must be 100 characters or fewer" }),
  email: emailSchema,
  password: passwordSchema,
});

export const docContentSchema = z
  .looseObject({ type: z.literal("doc", { error: "Content must be a document" }) })
  .refine((c) => JSON.stringify(c).length <= MAX_CONTENT_CHARS, {
    error: "Document is too large (max 1 MB)",
  })
  // Postgres jsonb cannot store U+0000; reject instead of failing with a 500.
  .refine((c) => !JSON.stringify(c).includes("\\u0000"), {
    error: "Document contains invalid characters",
  });

export const updateDocSchema = z
  .object({
    title: titleSchema.optional(),
    content: docContentSchema.optional(),
    version: z.number({ error: "version is required" }).int().min(1),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    error: "Nothing to update",
  });

export const createDocSchema = z.object({ title: titleSchema.optional() });

export const shareRoleSchema = z.enum(["viewer", "editor"], { error: "Role must be viewer or editor" });

export const createShareSchema = z.object({ email: emailSchema, role: shareRoleSchema });

export const updateShareSchema = z.object({ role: shareRoleSchema });

/** Parse or throw AppError(VALIDATION) carrying the first issue's message. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) {
    const issue = r.error.issues[0];
    const tooLarge = issue?.message.includes("too large");
    throw new AppError(tooLarge ? "CONTENT_TOO_LARGE" : "VALIDATION", issue?.message ?? "Invalid input");
  }
  return r.data;
}
