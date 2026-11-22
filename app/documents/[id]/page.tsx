import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { getDb } from "@/lib/db";
import { isAppError } from "@/lib/errors";
import { getDocument } from "@/lib/services/documents";
import { getOptionalPageUser } from "@/lib/session";

/** Deduped per request so metadata and the page share one lookup. */
const loadDoc = cache(async (id: string) => {
  // Signed-out visitors may view public documents; everything else needs a session.
  const user = await getOptionalPageUser();
  try {
    return { user, doc: await getDocument(getDb(), user, id) };
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") {
      if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/documents/${id}`)}`);
      notFound();
    }
    throw e;
  }
});

export async function generateMetadata({ params }: PageProps<"/documents/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { doc } = await loadDoc(id);
  return { title: doc.title };
}

export default async function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const { user, doc } = await loadDoc(id);

  return (
    <DocumentEditor
      // Remount on a newer server version (e.g. after a reload) so the editor state resets.
      key={`${doc.id}:${doc.version}`}
      doc={{
        id: doc.id,
        title: doc.title,
        content: doc.content,
        version: doc.version,
        role: doc.role,
        ownerName: doc.ownerName,
        isPublic: doc.isPublic,
      }}
      user={user}
    />
  );
}
