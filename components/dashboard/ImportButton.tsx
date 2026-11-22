"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiFetch, ApiError } from "@/lib/client/api";
import { MAX_IMPORT_BYTES, SUPPORTED_EXTENSIONS, SUPPORTED_LABEL } from "@/lib/import/constants";

export function ImportButton() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after an error
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
      toast.error(`Unsupported file type. ${SUPPORTED_LABEL}`);
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error("File is too large (max 4 MB)");
      return;
    }

    setPending(true);
    const form = new FormData();
    form.set("file", file);
    try {
      const doc = await apiFetch<{ id: string; title: string }>("/api/documents/import", {
        method: "POST",
        body: form,
      });
      toast.success(`Imported “${doc.title}”`);
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Import failed");
      setPending(false);
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={SUPPORTED_EXTENSIONS.join(",")}
        className="sr-only"
        onChange={onFile}
        tabIndex={-1}
        aria-hidden
        data-testid="import-input"
      />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="ink-outline" size="cta" onClick={() => input.current?.click()} disabled={pending} />
          }
        >
          <Upload strokeWidth={1.8} />
          {pending ? "Importing…" : "Import"}
        </TooltipTrigger>
        <TooltipContent>Creates a new document from the file</TooltipContent>
      </Tooltip>
    </>
  );
}
