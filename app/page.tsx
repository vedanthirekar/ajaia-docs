import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { DocList } from "@/components/dashboard/DocList";
import { ImportButton } from "@/components/dashboard/ImportButton";
import { NewDocButton } from "@/components/dashboard/NewDocButton";
import { getDb } from "@/lib/db";
import { SUPPORTED_LABEL } from "@/lib/import/constants";
import { listDocuments } from "@/lib/services/documents";
import { getPageUser } from "@/lib/session";

export const metadata: Metadata = { title: "Documents" };

export default async function DashboardPage() {
  const user = await getPageUser();
  const { owned, shared } = await listDocuments(getDb(), user);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
            <p className="text-sm text-muted-foreground">Create, import and share your work.</p>
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <ImportButton />
              <NewDocButton />
            </div>
            <span className="text-xs text-muted-foreground">{SUPPORTED_LABEL}</span>
          </div>
        </div>

        <section aria-labelledby="owned-heading" className="space-y-3">
          <h2 id="owned-heading" className="text-sm font-medium text-muted-foreground">
            My documents <span className="tabular-nums">({owned.length})</span>
          </h2>
          <DocList docs={owned} emptyText="No documents yet. Create one or import a file." />
        </section>

        <section aria-labelledby="shared-heading" className="space-y-3">
          <h2 id="shared-heading" className="text-sm font-medium text-muted-foreground">
            Shared with me <span className="tabular-nums">({shared.length})</span>
          </h2>
          <DocList docs={shared} emptyText="Nothing shared with you yet." />
        </section>
      </main>
    </>
  );
}
