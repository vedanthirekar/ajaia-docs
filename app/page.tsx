import type { Metadata } from "next";
import { DocumentsView } from "@/components/dashboard/DocumentsView";
import { getDb } from "@/lib/db";
import { listDocuments } from "@/lib/services/documents";
import { getPageUser } from "@/lib/session";

export const metadata: Metadata = { title: "Documents" };

export default async function DashboardPage() {
  const user = await getPageUser();
  const { owned, shared } = await listDocuments(getDb(), user);
  return <DocumentsView user={user} owned={owned} shared={shared} />;
}
