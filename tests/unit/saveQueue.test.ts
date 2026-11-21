import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSaveQueue, type SavePayload, type SaveResult, type SaveState } from "@/lib/editor/saveQueue";

type Call = { payload: SavePayload; resolve: (r: SaveResult) => void; reject: (e: unknown) => void };

function harness(initialVersion = 1) {
  const calls: Call[] = [];
  const states: SaveState[] = [];
  const save = vi.fn(
    (payload: SavePayload) =>
      new Promise<SaveResult>((resolve, reject) => {
        calls.push({ payload, resolve, reject });
      }),
  );
  const q = createSaveQueue({ initialVersion, save, onState: (s) => states.push(s) });
  return { q, calls, states, save, last: () => states[states.length - 1] };
}

const doc = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

/** Let resolved promises' continuations run. */
const flushMicrotasks = () => vi.advanceTimersByTimeAsync(0);

describe("createSaveQueue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("debounces rapid edits into a single save with the latest content", async () => {
    const h = harness();
    h.q.setContent(doc("a"));
    await vi.advanceTimersByTimeAsync(300);
    h.q.setContent(doc("ab"));
    await vi.advanceTimersByTimeAsync(300);
    h.q.setContent(doc("abc"));
    expect(h.last()).toBe("dirty");
    await vi.advanceTimersByTimeAsync(999);
    expect(h.save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(h.save).toHaveBeenCalledTimes(1);
    expect(h.calls[0].payload).toEqual({ content: doc("abc"), version: 1 });
    expect(h.last()).toBe("saving");
    h.calls[0].resolve({ ok: true, version: 2 });
    await flushMicrotasks();
    expect(h.last()).toBe("saved");
  });

  it("edits made during an in-flight save are sent afterwards with the new version (none lost)", async () => {
    const h = harness();
    h.q.setContent(doc("first"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.save).toHaveBeenCalledTimes(1);

    h.q.setContent(doc("second")); // typed while saving
    await vi.advanceTimersByTimeAsync(5000); // must NOT start a parallel save
    expect(h.save).toHaveBeenCalledTimes(1);

    h.calls[0].resolve({ ok: true, version: 2 });
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.save).toHaveBeenCalledTimes(2);
    expect(h.calls[1].payload).toEqual({ content: doc("second"), version: 2 });
    h.calls[1].resolve({ ok: true, version: 3 });
    await flushMicrotasks();
    expect(h.last()).toBe("saved");
    expect(h.q.hasUnsavedChanges()).toBe(false);
  });

  it("merges a title change and a content change into one save", async () => {
    const h = harness(4);
    h.q.setContent(doc("x"));
    h.q.setTitle("New title");
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.calls[0].payload).toEqual({ content: doc("x"), title: "New title", version: 4 });
  });

  it("409 → 'conflict' and stops sending further edits", async () => {
    const h = harness();
    h.q.setContent(doc("a"));
    await vi.advanceTimersByTimeAsync(1000);
    h.calls[0].resolve({ ok: false, status: 409 });
    await flushMicrotasks();
    expect(h.last()).toBe("conflict");
    h.q.setContent(doc("b"));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.save).toHaveBeenCalledTimes(1);
    expect(h.last()).toBe("conflict");
  });

  it("403/404 → 'forbidden', terminal, with no retries", async () => {
    for (const status of [403, 404]) {
      const h = harness();
      h.q.setContent(doc("a"));
      await vi.advanceTimersByTimeAsync(1000);
      h.calls[0].resolve({ ok: false, status });
      await flushMicrotasks();
      expect(h.last()).toBe("forbidden");
      await vi.advanceTimersByTimeAsync(120_000);
      expect(h.save).toHaveBeenCalledTimes(1);
    }
  });

  it("server error → 'error', retries after 2s with the same edits, then 'saved'", async () => {
    const h = harness();
    h.q.setContent(doc("keep me"));
    await vi.advanceTimersByTimeAsync(1000);
    h.calls[0].resolve({ ok: false, status: 500 });
    await flushMicrotasks();
    expect(h.last()).toBe("error");
    expect(h.q.hasUnsavedChanges()).toBe(true);
    await vi.advanceTimersByTimeAsync(1999);
    expect(h.save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.save).toHaveBeenCalledTimes(2);
    expect(h.calls[1].payload).toEqual({ content: doc("keep me"), version: 1 });
    h.calls[1].resolve({ ok: true, version: 2 });
    await flushMicrotasks();
    expect(h.last()).toBe("saved");
  });

  it("backs off on repeated failures (2s, then 4s)", async () => {
    const h = harness();
    h.q.setContent(doc("a"));
    await vi.advanceTimersByTimeAsync(1000);
    h.calls[0].resolve({ ok: false, status: 500 });
    await vi.advanceTimersByTimeAsync(2000);
    expect(h.save).toHaveBeenCalledTimes(2);
    h.calls[1].resolve({ ok: false, status: 503 });
    await vi.advanceTimersByTimeAsync(3999);
    expect(h.save).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.save).toHaveBeenCalledTimes(3);
  });

  it("a network failure (save rejects) is treated as a retryable error", async () => {
    const h = harness();
    h.q.setContent(doc("a"));
    await vi.advanceTimersByTimeAsync(1000);
    h.calls[0].reject(new TypeError("Failed to fetch"));
    await flushMicrotasks();
    expect(h.last()).toBe("error");
    await vi.advanceTimersByTimeAsync(2000);
    expect(h.save).toHaveBeenCalledTimes(2);
  });

  it("edits made while a failed save waits to retry are merged, newest wins", async () => {
    const h = harness();
    h.q.setContent(doc("old"));
    h.q.setTitle("T1");
    await vi.advanceTimersByTimeAsync(1000);
    h.calls[0].resolve({ ok: false, status: 500 });
    await flushMicrotasks();
    h.q.setContent(doc("new"));
    await vi.advanceTimersByTimeAsync(2000);
    const sent = h.calls[h.calls.length - 1].payload;
    expect(sent).toEqual({ content: doc("new"), title: "T1", version: 1 });
  });

  it("flush() saves immediately without waiting for the debounce", async () => {
    const h = harness();
    h.q.setContent(doc("now"));
    void h.q.flush();
    await flushMicrotasks();
    expect(h.save).toHaveBeenCalledTimes(1);
  });

  it("flush() passes keepalive through to save", async () => {
    const h = harness();
    h.q.setContent(doc("bye"));
    void h.q.flush({ keepalive: true });
    await flushMicrotasks();
    expect(h.save).toHaveBeenCalledWith({ content: doc("bye"), version: 1 }, { keepalive: true });
  });

  it("flush() with nothing pending does not save", async () => {
    const h = harness();
    await h.q.flush();
    expect(h.save).not.toHaveBeenCalled();
  });

  it("dispose() cancels a pending debounce", async () => {
    const h = harness();
    h.q.setContent(doc("a"));
    h.q.dispose();
    await vi.advanceTimersByTimeAsync(5000);
    expect(h.save).not.toHaveBeenCalled();
  });
});
