import Link from "next/link";
import { FileText } from "lucide-react";
import { UserMenu } from "./UserMenu";

export function AppHeader({
  user,
  children,
}: {
  user: { name: string; email: string };
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 print:hidden border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold" aria-label="Ajaia Docs home">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileText className="size-4" />
          </span>
          <span className="hidden sm:inline">Ajaia Docs</span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
        <UserMenu name={user.name} email={user.email} />
      </div>
    </header>
  );
}
