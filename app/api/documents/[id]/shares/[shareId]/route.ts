import { handle, readJson, requireUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { deleteShare, updateShare } from "@/lib/services/shares";
import { parseOrThrow, updateShareSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string; shareId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { id, shareId } = await params;
    const input = parseOrThrow(updateShareSchema, await readJson(req));
    return Response.json(await updateShare(getDb(), user, id, shareId, input));
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { id, shareId } = await params;
    await deleteShare(getDb(), user, id, shareId);
    return new Response(null, { status: 204 });
  });
}
