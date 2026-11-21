import "server-only";
import { auth } from "@/auth";
import { AppError, errorResponse } from "./errors";
import type { User } from "./services/users";

/** The signed-in user, or throws UNAUTHENTICATED. */
export async function requireUser(): Promise<User> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.email) throw new AppError("UNAUTHENTICATED", "Please sign in");
  return { id: u.id, email: u.email.toLowerCase(), name: u.name ?? u.email.split("@")[0] };
}

/** Run a route body, mapping thrown errors to the `{ error: { code, message } }` contract. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    return errorResponse(e);
  }
}

/** Parse a JSON request body; malformed JSON becomes a 400 VALIDATION error. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("VALIDATION", "Request body must be valid JSON");
  }
}
