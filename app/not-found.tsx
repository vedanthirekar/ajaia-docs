import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link href="/" className={buttonVariants()}>
        Go to documents
      </Link>
    </main>
  );
}
