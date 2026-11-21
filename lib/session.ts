import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { User } from "./services/users";

/** For server components: the signed-in user, or redirect to /login (preserving the target). */
export async function getPageUser(callbackPath?: string): Promise<User> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.email) {
    redirect(callbackPath ? `/login?callbackUrl=${encodeURIComponent(callbackPath)}` : "/login");
  }
  return { id: u.id, email: u.email.toLowerCase(), name: u.name ?? u.email.split("@")[0] };
}
