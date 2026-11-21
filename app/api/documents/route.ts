import { handle, readJson, requireUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { createDocument, listDocuments } from "@/lib/services/documents";
import { createDocSchema, parseOrThrow } from "@/lib/validation";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return Response.json(await listDocuments(getDb(), user));
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const hasBody = (req.headers.get("content-length") ?? "0") !== "0";
    const input = parseOrThrow(createDocSchema, hasBody ? await readJson(req) : {});
    const doc = await createDocument(getDb(), user, input);
    return Response.json(doc, { status: 201 });
  });
}
