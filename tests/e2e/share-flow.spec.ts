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
  await dialog.getByRole("button", { name: "Invite", exact: true }).click();
  await expect(dialog.getByText(/Pending/)).toBeVisible();
  const docUrl = a.url();

  // --- The owner can also manage sharing from the dashboard's ⋮ menu ---
  await a.goto("/");
  await a.getByRole("button", { name: "Actions for E2E Doc" }).click();
  await a.getByRole("menuitem", { name: "Share" }).click();
  const dashDialog = a.getByRole("dialog");
  await expect(dashDialog.getByText(bob.email)).toBeVisible();
  await expect(dashDialog.getByText(/Pending/)).toBeVisible();
  await a.keyboard.press("Escape");
  await expect(dashDialog).toHaveCount(0);

  // --- Bob signs up and sees the doc as a viewer ---
  const bobCtx = await browser.newContext();
  const b = await bobCtx.newPage();
  await signUp(b, bob);
  await b.getByRole("button", { name: "Shared with me" }).click();
  const sharedSection = b.getByRole("region", { name: "Shared with me" });
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

  // --- Public link: anyone with the link can view, even signed out ---
  const anonCtx = await browser.newContext();
  const anon = await anonCtx.newPage();
  await anon.goto(docUrl);
  await expect(anon).toHaveURL(/\/login/); // private by default

  await a.goto(docUrl);
  await a.getByRole("button", { name: "Share" }).first().click();
  const shareDialog = a.getByRole("dialog");
  await shareDialog.getByRole("combobox", { name: "General access" }).click();
  await a.getByRole("option", { name: "Anyone with the link" }).click();
  await expect(shareDialog.getByText(/Anyone with the link can view/)).toBeVisible();
  await a.keyboard.press("Escape");
  // After a fresh load, the dialog must show the saved setting (regression: selector stuck on "Restricted").
  await a.reload();
  await a.getByRole("button", { name: "Share" }).first().click();
  await expect(shareDialog.getByRole("combobox", { name: "General access" })).toHaveText(/Anyone with the link/);
  await a.keyboard.press("Escape");

  await anon.goto(docUrl);
  await expect(editor(anon).locator("h1")).toHaveText("Project Kickoff");
  await expect(editor(anon)).toHaveAttribute("contenteditable", "false");
  await expect(anon.getByRole("toolbar", { name: "Formatting" })).toHaveCount(0);
  await expect(anon.getByRole("link", { name: "Sign in" })).toBeVisible();
  const anonWrite = await anon.request.patch(docUrl.replace("/documents/", "/api/documents/"), {
    data: { title: "anon", version: 1 },
  });
  expect(anonWrite.status()).toBe(401);

  // Turning it back off removes anonymous access.
  await a.getByRole("button", { name: "Share" }).first().click();
  await shareDialog.getByRole("combobox", { name: "General access" }).click();
  await a.getByRole("option", { name: "Restricted" }).click();
  await expect(shareDialog.getByText(/Only people added above/)).toBeVisible();
  await a.keyboard.press("Escape");
  await anon.goto(docUrl);
  await expect(anon).toHaveURL(/\/login/);
  await anonCtx.close();

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
