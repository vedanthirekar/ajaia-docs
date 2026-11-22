"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/client/api";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";

type Mode = "login" | "signup";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

export function AuthForm({
  mode,
  callbackUrl,
  googleEnabled,
  initialError = null,
}: {
  mode: Mode;
  callbackUrl: string;
  googleEnabled: boolean;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await submit(email, password);
  }

  async function submit(emailValue: string, passwordValue: string) {
    setError(null);
    setPending(true);
    try {
      if (mode === "signup") {
        await apiFetch("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ name, email: emailValue, password: passwordValue }),
        });
      }
      const res = await signIn("credentials", { email: emailValue, password: passwordValue, redirect: false });
      if (!res || res.error) {
        setError(
          mode === "signup"
            ? "Account created, but signing in failed. Try logging in."
            : "Invalid email or password",
        );
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const isSignup = mode === "signup";
  const altHref = `${isSignup ? "/login" : "/signup"}${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`;

  return (
    <div className="w-full max-w-sm rounded-card border border-card-border bg-surface p-6 sm:p-8">
      <div className="mb-6 space-y-1 text-center">
        <h1 className="font-display text-2xl font-medium">{isSignup ? "Create your account" : "Sign in to Ajaia Docs"}</h1>
        <p className="text-sm text-muted-foreground">
          {isSignup ? "Start writing and sharing documents." : "Welcome back."}
        </p>
      </div>

      {googleEnabled && (
        <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => signIn("google", { redirectTo: callbackUrl })}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {isSignup && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={isSignup ? "password-hint" : undefined}
            required
          />
          {isSignup && (
            <p id="password-hint" className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" size="cta" className="w-full" disabled={pending}>
          {pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
        </Button>
      </form>

      {!isSignup && (
        <section aria-labelledby="demo-heading" className="mt-6 rounded-xl bg-cream p-3">
          <h2 id="demo-heading" className="text-xs font-semibold text-meta">
            Try a demo account
          </h2>
          <p className="mt-0.5 text-xs text-meta">
            Mock data, shared between all three. Password: <code className="font-mono text-ink">{DEMO_PASSWORD}</code>
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(DEMO_PASSWORD);
                    void submit(a.email, DEMO_PASSWORD);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-card-border bg-surface px-2.5 py-2 text-left outline-none transition-colors hover:border-ink-2 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                  aria-label={`Sign in as ${a.name}, ${a.role}`}
                >
                  <span
                    aria-hidden
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink text-[11px] font-semibold ${a.fill}`}
                  >
                    {a.name.split(" ").map((w) => w[0]).join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{a.name}</span>
                    <span className="block truncate text-xs text-meta">
                      {a.role} · {a.email}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link href={altHref} className="font-medium text-foreground underline-offset-4 hover:underline">
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
