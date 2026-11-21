import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeCallbackUrl } from "@/lib/format";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { callbackUrl } = await searchParams;
  const target = safeCallbackUrl(callbackUrl);
  if ((await auth())?.user) redirect(target);
  return <AuthForm mode="signup" callbackUrl={target} googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID)} />;
}
