/** Short relative time for doc lists ("5m ago"), falling back to a date after a week. */
export function timeAgo(input: Date | string, now: Date = new Date()): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const secs = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Only allow same-origin relative redirect targets (prevents open redirects after login). */
export function safeCallbackUrl(raw: string | string[] | undefined): string {
  if (typeof raw !== "string") return "/";
  // Control chars (tab/CR/LF/NUL…) are stripped by URL parsers, so "/\t/evil.com" would become "//evil.com".
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  // Final check: resolving against a dummy origin must stay on that origin.
  const base = "http://same-origin.invalid";
  const u = new URL(raw, base);
  return u.origin === base ? u.pathname + u.search + u.hash : "/";
}

/** Human-readable message for an Auth.js `?error=` code on the login/signup pages. */
export function authErrorMessage(code: string | string[] | undefined): string | null {
  if (code === undefined) return null;
  if (code === "OAuthAccountNotLinked") {
    return "An account with this email already exists with a password. Sign in with your email and password instead.";
  }
  return "We couldn't sign you in. Please try again.";
}
