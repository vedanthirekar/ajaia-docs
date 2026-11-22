#!/usr/bin/env node
/**
 * Capture product screenshots of a running deployment (uses the seeded demo accounts).
 *   node scripts/screenshots.mjs https://ajaia-docs-one-omega.vercel.app docs/screenshots
 * Requires Google Chrome (or set PW_CHANNEL=chromium after `npx playwright install chromium`).
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const out = process.argv[3] ?? "docs/screenshots";
const NAMES = { "maya@demo.example": "Sign in as Maya Chen", "priya@demo.example": "Sign in as Priya Patel" };
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
const viewport = { width: 1280, height: 820 };

async function signedIn(email) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(base + "/login");
  // One-click demo sign-in (the same buttons reviewers use).
  await page.getByRole("button", { name: new RegExp(`${NAMES[email]}`) }).click();
  await page.getByRole("heading", { name: "Documents", exact: true }).waitFor({ timeout: 60_000 });
  return { ctx, page };
}

const settle = (page) => page.waitForTimeout(1200);

// 1. Login with demo accounts
{
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(base + "/login");
  await settle(page);
  await page.screenshot({ path: `${out}/01-login-demo-accounts.png`, fullPage: true });
  await ctx.close();
}

// 2–4. Maya: dashboard, editor, share dialog
let publicUrl;
{
  const { ctx, page } = await signedIn("maya@demo.example");
  await settle(page);
  await page.screenshot({ path: `${out}/02-dashboard.png` });

  await page.getByRole("link", { name: /Q4 Product Roadmap/ }).first().click();
  await page.getByTestId("editor").waitFor();
  await settle(page);
  await page.screenshot({ path: `${out}/03-editor.png` });

  await page.getByRole("button", { name: "Share" }).first().click();
  await page.getByRole("dialog").getByText("People with access").waitFor();
  await settle(page);
  await page.screenshot({ path: `${out}/04-share-dialog.png` });
  await page.keyboard.press("Escape");

  await page.goto(base + "/");
  await page.getByRole("link", { name: /Team Offsite/ }).first().click();
  await page.getByTestId("editor").waitFor();
  publicUrl = page.url();
  await ctx.close();
}

// 5. Priya: view-only access to Maya's roadmap
{
  const { ctx, page } = await signedIn("priya@demo.example");
  await page.getByRole("button", { name: "Shared with me" }).click();
  await settle(page);
  await page.screenshot({ path: `${out}/05-shared-with-me.png` });
  await page.getByRole("link", { name: /Q4 Product Roadmap/ }).first().click();
  await page.getByTestId("view-only").waitFor();
  await settle(page);
  await page.screenshot({ path: `${out}/06-view-only.png` });
  await ctx.close();
}

// 6. Public link, signed out
{
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(publicUrl);
  await page.getByTestId("editor").waitFor();
  await settle(page);
  await page.screenshot({ path: `${out}/07-public-link-signed-out.png` });
  await ctx.close();
}

await browser.close();
console.log(`Saved screenshots to ${out}/`);
