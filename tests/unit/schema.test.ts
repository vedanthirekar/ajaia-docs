import { describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { documents, users } from "@/lib/db/schema";

describe("schema", () => {
  it("applies migrations and defaults version=1 and empty doc content", async () => {
    const db = await createTestDb();
    const [u] = await db.insert(users).values({ email: "a@x.com", name: "A" }).returning();
    const [d] = await db.insert(documents).values({ ownerId: u.id }).returning();
    expect(d.version).toBe(1);
    expect(d.title).toBe("Untitled document");
    expect((d.content as { type: string }).type).toBe("doc");
  });
});
