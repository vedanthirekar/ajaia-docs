import { handle, readJson, requireUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { deleteDocument, getDocument, updateDocument } from "@/lib/services/documents";
import { parseOrThrow, updateDocSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    return Response.json(await getDocument(getDb(), user, id));
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const input = parseOrThrow(updateDocSchema, await readJson(req));
    return Response.json(await updateDocument(getDb(), user, id, input));
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    await deleteDocument(getDb(), user, id);
    return new Response(null, { status: 204 });
  });
}
