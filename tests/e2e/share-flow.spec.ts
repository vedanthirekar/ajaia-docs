import { expect, test, type Page } from "@playwright/test";

const stamp = Date.now();
const alice = { name: "Alice E2E", email: `alice.${stamp}@e2e.test`, password: "password123" };
const bob = { name: "Bob E2E", email: `bob.${stamp}@e2e.test`, password: "password123" };

async function signUp(page: Page, u: { name: string; email: string; password: string }) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill(u.name);
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Password").fill(u.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
}

const editor = (page: Page) => page.getByTestId("editor");
const saved = (page: Page) => expect(page.getByTestId("save-status")).toHaveAttribute("data-state", "saved");

test("create, format, persist, share as viewer, and enforce read-only access", async ({ browser }) => {
  // --- Alice creates and formats a document ---
  const aliceCtx = await browser.newContext();
  const a = await aliceCtx.newPage();
  a.on("dialog", (d) => d.accept()); // accept any beforeunload prompt on reload
  await signUp(a, alice);

  await a.getByRole("button", { name: "New document" }).click();
  await expect(a).toHaveURL(/\/documents\/[0-9a-f-]{36}$/);
  await expect(editor(a)).toBeVisible();

  const title = a.getByTestId("doc-title");
  await title.fill("E2E Doc");
  await title.press("Enter");

  await editor(a).click();
  await a.keyboard.type("# Project Kickoff"); // markdown shortcut → Heading 1
  await a.keyboard.press("Enter");
  await a.keyboard.type("Status is ");
  await a.keyboard.press("Control+b");
  await a.keyboard.type("green");
  await a.keyboard.press("Control+b");
  await a.keyboard.press("Enter");
  await a.keyboard.type("- first item");
  await saved(a);

  // --- Persistence across reload ---
  await a.reload();
  await expect(editor(a).locator("h1")).toHaveText("Project Kickoff");
  await expect(editor(a).locator("strong")).toHaveText("green");
  await expect(editor(a).locator("ul li")).toHaveText("first item");
  await expect(a.getByTestId("doc-title")).toHaveValue("E2E Doc");

  // --- Reload immediately after typing must not lose the edit (flush on pagehide) ---
  await editor(a).click();
  await a.keyboard.press("Control+End");
  await a.keyboard.press("Enter");
  await a.keyboard.press("Enter"); // leave the list
  await a.keyboard.type("quick");
  await a.waitForTimeout(250);
  await a.reload();
  await expect(editor(a)).toContainText("quick");

  // --- Share with Bob (no account yet → pending) ---
  await a.getByRole("button", { name: "Share" }).first().click();
  const dialog = a.getByRole("dialog");
  await dialog.getByLabel("Add people by email").fill(bob.email);
  await dialog.getByRole("button", { name: "Share", exact: true }).click();
  await expect(dialog.getByText(/Pending/)).toBeVisible();
  const docUrl = a.url();

  // --- Bob signs up and sees the doc as a viewer ---
  const bobCtx = await browser.newContext();
  const b = await bobCtx.newPage();
  await signUp(b, bob);
  const sharedSection = b.getByRole("region", { name: /Shared with me/ });
  const card = sharedSection.getByRole("listitem").filter({ hasText: "E2E Doc" });
  await expect(card).toBeVisible();
  await expect(card.getByText("Viewer")).toBeVisible();

  await card.getByRole("link", { name: "E2E Doc" }).click();
  await expect(b).toHaveURL(docUrl);
  await expect(b.getByTestId("view-only")).toBeVisible();
  await expect(b.getByRole("toolbar", { name: "Formatting" })).toHaveCount(0);
  await expect(editor(b)).toHaveAttribute("contenteditable", "false");
  await expect(editor(b).locator("h1")).toHaveText("Project Kickoff");

  // --- Bob cannot write through the API either ---
  const res = await b.request.patch(docUrl.replace("/documents/", "/api/documents/"), {
    data: { title: "hacked", version: 1 },
  });
  expect(res.status()).toBe(403);

  // --- Account menu shows who's signed in and signs out ---
  await b.goto("/");
  await b.getByRole("button", { name: /Account menu for Bob E2E/ }).click();
  await expect(b.getByRole("menu")).toContainText(bob.email);
  await b.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(b).toHaveURL(/\/login/);
  await b.goto("/");
  await expect(b).toHaveURL(/\/login/);

  await aliceCtx.close();
  await bobCtx.close();
});
