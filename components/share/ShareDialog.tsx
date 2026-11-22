"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Globe, Link2, Loader2, Lock, SquareArrowRight, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, ApiError } from "@/lib/client/api";
import type { ShareRole, ShareView } from "@/lib/services/shares";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<ShareRole, string> = { viewer: "Viewer", editor: "Editor" };

function RoleSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: ShareRole;
  onChange: (r: ShareRole) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v as ShareRole)} disabled={disabled}>
      <SelectTrigger
        size="sm"
        aria-label={label}
        className="h-8 w-auto shrink-0 gap-1 border-0 bg-transparent px-1.5 text-[13px] font-medium text-ink-2 shadow-none hover:bg-cream dark:bg-transparent"
      >
        <SelectValue>{(v: ShareRole) => ROLE_LABEL[v]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="viewer">Viewer</SelectItem>
        <SelectItem value="editor">Editor</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** Collaborator pastels (spec: sky, blush, butter, mint). The owner is always sky. */
const AVATAR_FILLS = ["bg-butter", "bg-blush", "bg-mint", "bg-sky-soft"] as const;

function Avatar({ name, fill }: { name: string; fill: string }) {
  const initials =
    name
      .replace(/@.*/, "")
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span
      aria-hidden
      className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-ink", fill)}
    >
      {initials}
    </span>
  );
}

export function ShareDialog({
  docId,
  docTitle,
  initialOpen = false,
  hideTrigger = false,
  onClosed,
  owner,
}: {
  docId: string;
  docTitle: string;
  /** Open immediately on mount (used when opened from the dashboard's ⋮ menu). */
  initialOpen?: boolean;
  /** Don't render the "Share" button (the caller opens it another way). */
  hideTrigger?: boolean;
  onClosed?: () => void;
  /** The signed-in owner, shown as the first "(you)" row. */
  owner?: { name: string; email: string };
}) {
  const [open, setOpen] = useState(initialOpen);
  const [shares, setShares] = useState<ShareView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("viewer");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [savingAccess, setSavingAccess] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ shares: ShareView[]; isPublic: boolean }>(`/api/documents/${docId}/shares`);
      setShares(res.shares);
      setIsPublic(res.isPublic);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Couldn't load sharing settings");
    }
  }, [docId]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void load();
    else onClosed?.();
  };

  // When mounted already open, fetch the share list once (state is only set after the await).
  useEffect(() => {
    // load() only sets state after its network await, so this can't cascade renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialOpen) void load();
  }, [initialOpen, load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!email.trim()) {
      setFormError("Enter an email address");
      return;
    }
    setSubmitting(true);
    try {
      const share = await apiFetch<ShareView>(`/api/documents/${docId}/shares`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      setShares((s) => [...(s ?? []), share]);
      setEmail("");
      toast.success(
        share.status === "pending"
          ? `Invited ${share.email}. They'll get access when they sign up.`
          : `Shared with ${share.name ?? share.email}`,
      );
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't share the document");
    } finally {
      setSubmitting(false);
    }
  }

  async function changeRole(share: ShareView, next: ShareRole) {
    if (next === share.role) return;
    setBusyId(share.id);
    try {
      const updated = await apiFetch<ShareView>(`/api/documents/${docId}/shares/${share.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: next }),
      });
      setShares((s) => s?.map((x) => (x.id === share.id ? updated : x)) ?? null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't change access");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(share: ShareView) {
    setBusyId(share.id);
    try {
      await apiFetch(`/api/documents/${docId}/shares/${share.id}`, { method: "DELETE" });
      setShares((s) => s?.filter((x) => x.id !== share.id) ?? null);
      toast.success(`Removed access for ${share.name ?? share.email}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't remove access");
    } finally {
      setBusyId(null);
    }
  }

  async function changeAccess(next: boolean) {
    if (next === isPublic) return;
    setSavingAccess(true);
    try {
      const res = await apiFetch<{ isPublic: boolean }>(`/api/documents/${docId}/visibility`, {
        method: "PUT",
        body: JSON.stringify({ isPublic: next }),
      });
      setIsPublic(res.isPublic);
      toast.success(res.isPublic ? "Anyone with the link can now view" : "Only people with access can open it now");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't change link access");
    } finally {
      setSavingAccess(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/documents/${docId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <DialogTrigger
          render={<Button variant="primary" size="cta" className="h-[38px] px-3 sm:px-4" aria-label="Share" />}
        >
          <SquareArrowRight strokeWidth={1.8} />
          <span className="hidden sm:inline">Share</span>
        </DialogTrigger>
      )}
      <DialogContent className="gap-0 sm:max-w-[480px]">
        <DialogHeader className="gap-1 pr-10">
          <DialogTitle className="font-display text-2xl leading-tight font-medium">Share document</DialogTitle>
          <DialogDescription className="truncate text-[13px] text-meta">{docTitle}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="mt-5" noValidate>
          <div className="flex gap-2">
            <div
              className={cn(
                "flex h-10 min-w-0 flex-1 items-center rounded-lg border bg-page pr-1 pl-3 focus-within:border-ink-2 focus-within:ring-3 focus-within:ring-ring/20",
                formError ? "border-destructive" : "border-field",
              )}
            >
              <input
                id="share-email"
                type="email"
                placeholder="Add people by email"
                aria-label="Add people by email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formError) setFormError(null);
                }}
                aria-invalid={formError ? true : undefined}
                aria-describedby={formError ? "share-error" : undefined}
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-meta"
              />
              <RoleSelect value={role} onChange={setRole} label="Role for new person" />
            </div>
            <Button type="submit" disabled={submitting} className="h-10 border-[1.5px] border-ink px-4 text-[13px]">
              {submitting ? <Loader2 className="animate-spin" /> : null}
              Invite
            </Button>
          </div>
          {formError && (
            <p id="share-error" role="alert" className="mt-1.5 text-xs text-destructive">
              {formError}
            </p>
          )}
        </form>

        <h3 className="mt-[22px] mb-1.5 text-xs font-semibold text-meta">People with access</h3>
        {loadError ? (
          <p className="text-sm text-destructive">
            {loadError}{" "}
            <button className="underline" onClick={() => void load()}>
              Retry
            </button>
          </p>
        ) : shares === null ? (
          <p className="flex h-[52px] items-center gap-2 text-sm text-meta">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : (
          <ul className="max-h-64 overflow-y-auto" data-testid="share-list">
            {owner && (
              <li className="flex h-[52px] items-center gap-3 border-b border-[#f0eadf]">
                <Avatar name={owner.name} fill="bg-sky" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{owner.name} (you)</span>
                  <span className="block truncate text-xs text-meta">{owner.email}</span>
                </span>
                <span className="px-1.5 text-[13px] text-ink-2">Owner</span>
                <span className="w-7" aria-hidden />
              </li>
            )}
            {shares.length === 0 && !owner && (
              <li className="py-3 text-sm text-meta">Only you have access.</li>
            )}
            {shares.map((s, i) => (
              <li key={s.id} className="flex min-h-[52px] items-center gap-3 border-b border-[#f0eadf] py-1.5">
                <Avatar name={s.name ?? s.email} fill={AVATAR_FILLS[i % AVATAR_FILLS.length]} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name ?? s.email}</span>
                  <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-meta">
                    {s.name && <span className="truncate">{s.email}</span>}
                    {s.status === "pending" && (
                      <span
                        className="rounded-full border border-dashline px-1.5 text-[11px]"
                        title="Will get access when they sign up"
                      >
                        Pending — will get access when they sign up
                      </span>
                    )}
                  </span>
                </span>
                <RoleSelect
                  value={s.role}
                  onChange={(r) => void changeRole(s, r)}
                  disabled={busyId === s.id}
                  label={`Role for ${s.email}`}
                />
                <button
                  type="button"
                  aria-label={`Remove ${s.email}`}
                  disabled={busyId === s.id}
                  onClick={() => void remove(s)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-meta outline-none hover:bg-cream hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-[18px] flex flex-wrap items-center gap-3 rounded-xl bg-cream p-3">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-[9px] border-[1.5px] border-ink text-ink",
              isPublic ? "bg-mint" : "bg-butter",
            )}
          >
            {isPublic ? <Globe className="size-[15px]" strokeWidth={1.8} /> : <Lock className="size-[15px]" strokeWidth={1.8} />}
          </span>
          <span className="min-w-0 flex-1">
            <Select
              // Always controlled (never undefined): switching uncontrolled→controlled made Base UI
              // keep showing "Restricted" for public docs. Disabled until the real value loads.
              value={isPublic ? "public" : "restricted"}
              onValueChange={(v) => v && void changeAccess(v === "public")}
              disabled={isPublic === null || savingAccess}
            >
              <SelectTrigger
                size="sm"
                aria-label="General access"
                className="-ml-1.5 h-6 w-auto gap-1 border-0 bg-transparent px-1.5 text-[13px] font-medium text-ink shadow-none hover:bg-surface dark:bg-transparent"
              >
                <SelectValue>{(v: string) => (v === "public" ? "Anyone with the link" : "Restricted")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restricted">Restricted</SelectItem>
                <SelectItem value="public">Anyone with the link</SelectItem>
              </SelectContent>
            </Select>
            <span className="block text-xs text-meta">
              {isPublic === null
                ? "Loading…"
                : isPublic
                  ? "Anyone with the link can view — no sign-in needed"
                  : "Only people added above can open this"}
            </span>
          </span>
          <Button variant="ink-outline" className="h-9 px-3.5 text-[13px]" onClick={copyLink}>
            {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" strokeWidth={1.8} />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>

        <p className="mt-3 text-xs text-meta">
          Viewers can read; editors can also edit and rename. People you share with won’t get an email — send them the
          link.
        </p>
      </DialogContent>
    </Dialog>
  );
}
