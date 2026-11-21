import type { DocContent } from "../db/schema";

/**
 * Framework-free autosave state machine.
 *
 * Guarantees:
 * - At most one save request in flight; edits made meanwhile are merged and sent
 *   afterwards with the version the previous save returned (nothing is lost).
 * - 409 → `conflict` and 403/404 → `forbidden` are terminal: no further saves.
 * - Other failures (5xx, network) → `error`, retried with backoff while keeping edits.
 */
export type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict" | "forbidden";
export type SavePayload = { content?: DocContent; title?: string; version: number };
export type SaveResult = { ok: true; version: number } | { ok: false; status: number };
export type SaveOptions = { keepalive: boolean };

export type SaveQueue = {
  setContent(content: DocContent): void;
  setTitle(title: string): void;
  /** Save pending edits now (skips the debounce). Resolves when that save settles. */
  flush(opts?: Partial<SaveOptions>): Promise<void>;
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
      if (result.status === 409) {
        terminal = true;
        clearTimer();
        setState("conflict");
      } else if (result.status === 403 || result.status === 404) {
        terminal = true;
        clearTimer();
        setState("forbidden");
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
      if (inFlight) await inFlight;
      await run({ keepalive: o?.keepalive ?? false });
    },
    hasUnsavedChanges: () => !terminal && (pending !== null || inFlight !== null),
    dispose() {
      disposed = true;
      clearTimer();
    },
  };
}
