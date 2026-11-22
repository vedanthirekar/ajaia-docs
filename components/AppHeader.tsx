import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";

export function AppHeader({
  user,
  children,
  signInCallback,
}: {
  /** null for a signed-out visitor viewing a public document. */
  user: { name: string; email: string } | null;
  children?: React.ReactNode;
  /** Where to return after signing in (signed-out visitors only). */
  signInCallback?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex h-[68px] max-w-[1120px] items-center gap-3 px-4 sm:gap-6 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Ajaia Docs home">
          <Image src="/logo.png" alt="" width={32} height={32} priority />
          <span className="hidden font-display text-xl font-medium sm:inline">Ajaia Docs</span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
        {user ? (
          <UserMenu name={user.name} email={user.email} />
        ) : (
          <Link
            href={`/login${signInCallback ? `?callbackUrl=${encodeURIComponent(signInCallback)}` : ""}`}
            className={buttonVariants({ size: "sm" })}
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
