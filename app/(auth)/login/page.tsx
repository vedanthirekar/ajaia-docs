import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeCallbackUrl } from "@/lib/format";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  const target = safeCallbackUrl(callbackUrl);
  if ((await auth())?.user) redirect(target);
  return <AuthForm mode="login" callbackUrl={target} googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID)} />;
}
