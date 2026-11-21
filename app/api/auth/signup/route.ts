import { handle, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { createUserWithPassword } from "@/lib/services/users";
import { parseOrThrow, signupSchema } from "@/lib/validation";

export async function POST(req: Request) {
  return handle(async () => {
    const input = parseOrThrow(signupSchema, await readJson(req));
    const user = await createUserWithPassword(getDb(), input);
    return Response.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
  });
}
