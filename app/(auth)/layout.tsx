import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/logo.png" alt="" width={36} height={36} priority />
        <span className="font-display text-2xl font-medium">Ajaia Docs</span>
      </Link>
      {children}
    </main>
  );
}
