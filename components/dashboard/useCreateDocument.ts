"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/client/api";

/** Create an empty document and open it. Shared by "New document" and the "Blank document" tile. */
export function useCreateDocument() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function create() {
    if (pending) return;
    setPending(true);
    try {
      const doc = await apiFetch<{ id: string }>("/api/documents", { method: "POST" });
      router.push(`/documents/${doc.id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't create a document");
      setPending(false);
    }
  }

  return { create, pending };
}
