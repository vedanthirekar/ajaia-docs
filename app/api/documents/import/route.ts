import { handle, requireUser } from "@/lib/api";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { fileToDoc, MAX_IMPORT_BYTES } from "@/lib/import/convert";
import { createDocument } from "@/lib/services/documents";

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new AppError("VALIDATION", "Expected a multipart form upload with a 'file' field");
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("VALIDATION", "Choose a file to import");
    if (file.size > MAX_IMPORT_BYTES) throw new AppError("FILE_TOO_LARGE", "File is too large (max 4 MB)");

    const { title, content } = await fileToDoc(file.name, Buffer.from(await file.arrayBuffer()));
    const doc = await createDocument(getDb(), user, { title, content });
    return Response.json(doc, { status: 201 });
  });
}
