"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/client/api";

export function NewDocButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function create() {
    setPending(true);
    try {
      const doc = await apiFetch<{ id: string }>("/api/documents", { method: "POST" });
      router.push(`/documents/${doc.id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't create a document");
      setPending(false);
    }
  }

  return (
    <Button onClick={create} disabled={pending} size="lg">
      <Plus />
      {pending ? "Creating…" : "New document"}
    </Button>
  );
}
