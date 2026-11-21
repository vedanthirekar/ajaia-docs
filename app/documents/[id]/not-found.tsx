import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function DocumentNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="size-6 text-muted-foreground" />
      </span>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Document not found or you don’t have access</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          It may have been deleted, or the owner hasn’t shared it with this account. If you were invited, make sure
          you’re signed in with the email it was shared to.
        </p>
      </div>
      <Link href="/" className={buttonVariants()}>
        Back to documents
      </Link>
    </main>
  );
}
