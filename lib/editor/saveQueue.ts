import type { DocContent } from "../db/schema";

/**
 * Framework-free autosave state machine.
 *
 * Guarantees:
 * - At most one save request in flight; edits made meanwhile are merged and sent
 *   afterwards with the version the previous save returned (nothing is lost).
 * - Terminal (no further saves): 409 → `conflict`, 403/404 → `forbidden`,
 *   401 → `unauthenticated`, 400/413 → `rejected` (e.g. document too large).
 * - Other failures (5xx, network) → `error`, retried with backoff while keeping edits.
 * - On page unload, edits typed during an in-flight save are sent immediately
 *   (speculatively at version+1) rather than waiting for a response that may never arrive.
 */
export type SaveState =
  | "saved"
  | "dirty"
  | "saving"
  | "error"
  | "conflict"
  | "forbidden"
  | "unauthenticated"
  | "rejected";
export type SavePayload = { content?: DocContent; title?: string; version: number };
export type SaveResult = { ok: true; version: number } | { ok: false; status: number };
export type SaveOptions = { keepalive: boolean };
export type FlushOptions = { keepalive?: boolean; unloading?: boolean };

/** Browsers reject keepalive requests whose body exceeds 64 KiB; stay safely under it. */
export const KEEPALIVE_MAX_BYTES = 60_000;
export function canKeepalive(body: string): boolean {
  return new TextEncoder().encode(body).length <= KEEPALIVE_MAX_BYTES;
}

export type SaveQueue = {
  setContent(content: DocContent): void;
  setTitle(title: string): void;
  /** Save pending edits now (skips the debounce). Resolves when that save settles. */
  flush(opts?: FlushOptions): Promise<void>;
  /** True while there are edits the server hasn't accepted yet (and saving is still possible). */
  hasUnsavedChanges(): boolean;
  dispose(): void;
};

const RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 30000];

type Pending = { content?: DocContent; title?: string };

export function createSaveQueue(opts: {
  initialVersion: number;
  save: (payload: SavePayload, options: SaveOptions) => Promise<SaveResult>;
  onState: (state: SaveState) => void;
  debounceMs?: number;
}): SaveQueue {
  const debounceMs = opts.debounceMs ?? 1000;
  let version = opts.initialVersion;
  let pending: Pending | null = null;
  let inFlight: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let terminal = false;
  let disposed = false;

  const setState = (s: SaveState) => {
    if (!disposed) opts.onState(s);
  };

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const schedule = (delay: number) => {
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      void run({ keepalive: false });
    }, delay);
  };

  const merge = (older: Pending | null, newer: Pending | null): Pending | null => {
    if (!older) return newer;
    if (!newer) return older;
    return { ...older, ...newer };
  };

  async function run(options: SaveOptions): Promise<void> {
    if (terminal || disposed || inFlight || !pending) return;
    const payload = pending;
    pending = null;
    setState("saving");

    inFlight = (async () => {
      let result: SaveResult;
      try {
        result = await opts.save({ ...payload, version }, options);
      } catch {
        result = { ok: false, status: 0 };
      }
      inFlight = null;
      if (disposed) return;

      if (result.ok) {
        version = result.version;
        failures = 0;
        if (pending) {
          setState("dirty");
          schedule(debounceMs);
        } else {
          setState("saved");
        }
        return;
      }

      // Failed: put the edits back underneath anything typed since.
      pending = merge(payload, pending);
      const terminalState: SaveState | null =
        result.status === 409
          ? "conflict"
          : result.status === 403 || result.status === 404
            ? "forbidden"
            : result.status === 401
              ? "unauthenticated"
              : result.status === 400 || result.status === 413
                ? "rejected"
                : null;
      if (terminalState) {
        terminal = true;
        clearTimer();
        setState(terminalState);
      } else {
        const delay = RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)];
        failures++;
        setState("error");
        schedule(delay);
      }
    })();
    return inFlight;
  }

  const edit = (patch: Pending) => {
    if (terminal || disposed) return;
    pending = merge(pending, patch);
    if (inFlight) return; // will be picked up when the current save settles
    if (failures > 0 && timer) return; // keep the backoff timer; edits ride along
    setState("dirty");
    schedule(debounceMs);
  };

  return {
    setContent: (content) => edit({ content }),
    setTitle: (title) => edit({ title }),
    async flush(o) {
      clearTimer();
      const keepalive = o?.keepalive ?? false;
      if (inFlight && o?.unloading && pending && !terminal && !disposed) {
        // The page is going away: JS may never see the in-flight response, so send the
        // newer edits now at the version that save will produce. If that save fails,
        // this one gets a 409 — nothing newer is ever overwritten.
        const payload = pending;
        void opts.save({ ...payload, version: version + 1 }, { keepalive }).catch(() => undefined);
        return;
      }
      if (inFlight) await inFlight;
      await run({ keepalive });
    },
    hasUnsavedChanges: () => !terminal && (pending !== null || inFlight !== null),
    dispose() {
      disposed = true;
      clearTimer();
    },
  };
}
