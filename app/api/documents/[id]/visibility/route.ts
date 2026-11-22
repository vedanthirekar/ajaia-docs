import { handle, readJson, requireUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { setVisibility } from "@/lib/services/documents";
import { parseOrThrow, visibilitySchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/** Owner-only: set "anyone with the link can view" on or off. */
export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const { isPublic } = parseOrThrow(visibilitySchema, await readJson(req));
    return Response.json(await setVisibility(getDb(), user, id, isPublic));
  });
}
