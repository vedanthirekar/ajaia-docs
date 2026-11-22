import { handle, readJson, requireUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { createShare, listShares } from "@/lib/services/shares";
import { createShareSchema, parseOrThrow } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    return Response.json(await listShares(getDb(), user, id));
  });
}

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const input = parseOrThrow(createShareSchema, await readJson(req));
    return Response.json(await createShare(getDb(), user, id, input), { status: 201 });
  });
}
