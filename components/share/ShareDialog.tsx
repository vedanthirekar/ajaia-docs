"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Link2, Loader2, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, ApiError } from "@/lib/client/api";
import type { ShareRole, ShareView } from "@/lib/services/shares";

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
      <SelectTrigger className="w-28 shrink-0" aria-label={label}>
        <SelectValue>{(v: ShareRole) => ROLE_LABEL[v]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="viewer">Viewer</SelectItem>
        <SelectItem value="editor">Editor</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ShareDialog({
  docId,
  docTitle,
  initialOpen = false,
  hideTrigger = false,
  onClosed,
}: {
  docId: string;
  docTitle: string;
  /** Open immediately on mount (used when opened from the dashboard's ⋮ menu). */
  initialOpen?: boolean;
  /** Don't render the "Share" button (the caller opens it another way). */
  hideTrigger?: boolean;
  onClosed?: () => void;
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

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ shares: ShareView[] }>(`/api/documents/${docId}/shares`);
      setShares(res.shares);
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
        <DialogTrigger render={<Button size="sm" />}>
          <Share2 />
          Share
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">Share “{docTitle}”</DialogTitle>
          <DialogDescription>
            Viewers can read. Editors can edit and rename. Only you can share or delete.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-2" noValidate>
          <Label htmlFor="share-email">Add people by email</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="share-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formError) setFormError(null);
              }}
              aria-invalid={formError ? true : undefined}
              aria-describedby={formError ? "share-error" : undefined}
              autoComplete="off"
              className="flex-1"
            />
            <div className="flex gap-2">
              <RoleSelect value={role} onChange={setRole} label="Role for new person" />
              <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none">
                {submitting ? <Loader2 className="animate-spin" /> : null}
                Share
              </Button>
            </div>
          </div>
          {formError && (
            <p id="share-error" role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
        </form>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">People with access</h3>
          {loadError ? (
            <p className="text-sm text-destructive">
              {loadError}{" "}
              <button className="underline" onClick={() => void load()}>
                Retry
              </button>
            </p>
          ) : shares === null ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          ) : shares.length === 0 ? (
            <p className="text-sm text-muted-foreground">Only you have access.</p>
          ) : (
            <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border" data-testid="share-list">
              {shares.map((s) => (
                <li key={s.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.name ?? s.email}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {s.name && <span className="truncate">{s.email}</span>}
                      {s.status === "pending" && (
                        <Badge variant="outline" className="h-5 text-[11px]" title="Will get access when they sign up">
                          Pending — will get access when they sign up
                        </Badge>
                      )}
                    </div>
                  </div>
                  <RoleSelect
                    value={s.role}
                    onChange={(r) => void changeRole(s, r)}
                    disabled={busyId === s.id}
                    label={`Role for ${s.email}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${s.email}`}
                    disabled={busyId === s.id}
                    onClick={() => void remove(s)}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col-reverse items-start justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            People you share with won’t get an email — send them the link.
          </p>
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? <Check /> : <Link2 />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
