#!/usr/bin/env node
/**
 * Seed (or reset) the three public demo accounts with realistic, cross-shared documents.
 *
 *   npm run seed:demo                      # against http://localhost:3000
 *   npm run seed:demo -- https://your-app  # against a deployment
 *
 * It uses only the app's public HTTP API — the same steps a real user takes (sign up,
 * sign in, create, edit, import, share, make public) — so it works against any
 * deployment without database access. Re-running it deletes the demo users' own
 * documents and recreates them, restoring the demo to a known state.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.argv[2] ?? process.env.DEMO_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = "ajaia-demo-2026";
const here = path.dirname(fileURLToPath(import.meta.url));

export const PEOPLE = {
  maya: { name: "Maya Chen", email: "maya@demo.example" },
  leo: { name: "Leo Martins", email: "leo@demo.example" },
  priya: { name: "Priya Patel", email: "priya@demo.example" },
};
const PENDING_INVITE = "sam.newhire@demo.example"; // intentionally never signs up → shows "Pending"

// ---------- tiny TipTap JSON builders ----------
const t = (text, ...marks) => ({ type: "text", text, ...(marks.length ? { marks: marks.map((m) => (typeof m === "string" ? { type: m } : m)) } : {}) });
const link = (text, href) => t(text, { type: "link", attrs: { href } });
const color = (text, c) => t(text, { type: "textStyle", attrs: { color: c } });
const p = (...c) => ({ type: "paragraph", content: c.map((x) => (typeof x === "string" ? t(x) : x)) });
const h = (level, text) => ({ type: "heading", attrs: { level }, content: [t(text)] });
const bullets = (...items) => ({ type: "bulletList", content: items.map((i) => ({ type: "listItem", content: [Array.isArray(i) ? p(...i) : p(i)] })) });
const numbered = (...items) => ({ type: "orderedList", content: items.map((i) => ({ type: "listItem", content: [Array.isArray(i) ? p(...i) : p(i)] })) });
const tasks = (...items) => ({ type: "taskList", content: items.map(([done, text]) => ({ type: "taskItem", attrs: { checked: done }, content: [p(text)] })) });
const quote = (text) => ({ type: "blockquote", content: [p(text)] });
const hr = () => ({ type: "horizontalRule" });
const centered = (node) => ({ ...node, attrs: { ...(node.attrs ?? {}), textAlign: "center" } });
const doc = (...content) => ({ type: "doc", content });

// ---------- documents ----------
const ROADMAP = doc(
  h(1, "Q4 Product Roadmap"),
  p("Our focus this quarter is ", t("making shared work feel effortless", "bold"), ". Everything below ladders up to three outcomes: faster drafting, safer collaboration and clearer ownership."),
  h(2, "Themes"),
  numbered(
    [t("Drafting speed", "bold"), " — import from .docx and Markdown, keyboard-first formatting."],
    [t("Collaboration", "bold"), " — role-based sharing, public read-only links, conflict-safe autosave."],
    [t("Trust", "bold"), " — clear ownership on every document and version history (next quarter)."],
  ),
  h(2, "Milestones"),
  tasks(
    [true, "Rich-text editor with headings, lists and highlights"],
    [true, "Sharing with owner / editor / viewer roles"],
    [true, "Import .txt, .md and .docx as new documents"],
    [false, "Version history with restore"],
    [false, "Inline comments"],
  ),
  h(2, "Risks"),
  bullets(
    ["Real-time co-editing needs a sync server — ", t("deferred", { type: "highlight" }), " until usage justifies it."],
    "Email invites need a sending domain; sharing works in-app meanwhile.",
  ),
  quote("Ship the smallest thing that makes collaboration feel safe, then iterate."),
  p("Questions? Leave a note in ", link("the team space", "https://example.com/team"), " or ping Maya."),
);

const OFFSITE = doc(
  centered(h(1, "Team Offsite — Lisbon")),
  centered(p(t("March 12–14 · Open to everyone with the link", "italic"))),
  hr(),
  h(2, "Day 1 · Strategy"),
  bullets("09:30 Welcome and coffee", "10:00 Year in review (Maya)", "13:00 Lunch by the river", "14:30 Roadmap workshop"),
  h(2, "Day 2 · Build"),
  bullets("09:30 Hack sessions in small groups", "16:00 Demo hour", "19:30 Team dinner"),
  h(2, "What to bring"),
  tasks([false, "Laptop and charger"], [false, "A comfortable pair of shoes"], [false, "One idea you'd love to prototype"]),
  p(color("Travel details will be added here by Friday.", "#2563eb")),
);

const ARCH = doc(
  h(1, "Editor Architecture Notes"),
  p("How the editor saves work without losing edits, written for new engineers."),
  h(2, "Save pipeline"),
  numbered(
    "Every keystroke updates the local document state.",
    ["After ", t("1 second", "bold"), " of quiet, the save queue sends one PATCH with the current version number."],
    "The server only accepts the write if the version still matches, then increments it.",
    "A stale version returns 409, and the editor locks with a clear message instead of overwriting.",
  ),
  h(2, "Why not real-time sync yet?"),
  p("CRDT sync (Yjs) needs a long-lived socket server. Optimistic concurrency gives us ", t("zero silent data loss", { type: "highlight" }), " today with no extra infrastructure."),
  quote("Correctness first, then cleverness."),
  h(3, "Open items"),
  tasks([true, "Flush pending edits on tab close"], [false, "Version snapshots"], [false, "Load testing on Neon"]),
);

const RETRO = doc(
  h(1, "Sprint 14 Retro"),
  p(t("Editors: Maya, Leo, Priya", "italic"), " — add your notes under each heading."),
  h(2, "What went well"),
  bullets("Sharing shipped a day early", ["Import handles ", t("UTF-16", "bold"), " files from Windows now"], "Design handoff was clear and complete"),
  h(2, "What to improve"),
  bullets("We found two bugs late in manual testing — add them to the E2E suite", "Pairing on reviews took longer than planned"),
  h(2, "Actions"),
  tasks([false, "Leo: add a regression test for every bug we fix"], [false, "Priya: share toolbar icons for the next sprint"], [true, "Maya: book the offsite venue"]),
);

const STYLE = doc(
  h(1, "Cotton Theme Style Guide"),
  p("Warm cream backgrounds, dark ink outlines and soft pastel fills."),
  h(2, "Colour"),
  bullets(
    [color("Ink #2B2A3A", "#2b2a3a"), " — text, outlines and the primary button"],
    [color("Sky #CFE6F7", "#2563eb"), " — the signature offset shadow and active states"],
    [t("Butter #FFE7A3", { type: "highlight" }), " — text highlight"],
  ),
  h(2, "Type"),
  bullets(["Newsreader for titles and document text (", t("18px / 1.65", "bold"), ")"], "Inter for interface text, 13–14px"),
  h(2, "The one rule"),
  quote("Use the offset shadow only on the primary button, the blank-document plus and dialogs."),
);

const INTERVIEWS = doc(
  h(1, "Interview Notes — Draft"),
  p(t("Private draft — not shared with anyone yet.", "italic")),
  h(2, "Themes so far"),
  bullets("People keep important docs in chat threads and lose them", "Sharing permissions feel scary in other tools", "Everyone wants a clean, distraction-free page"),
  tasks([false, "Synthesise five more interviews"], [false, "Share findings with Maya"]),
);

// ---------- HTTP helpers (cookie-aware fetch) ----------
async function session() {
  const jar = new Map();
  const req = async (method, url, { json, form, raw } = {}) => {
    const headers = { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") };
    let body;
    if (json !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(json);
    } else if (form) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      body = new URLSearchParams(form).toString();
    } else if (raw) body = raw;
    const res = await fetch(BASE + url, { method, headers, body, redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
    return res;
  };
  return req;
}

async function signIn(person) {
  const req = await session();
  const signup = await req("POST", "/api/auth/signup", { json: { ...person, password: PASSWORD } });
  if (signup.status !== 201 && signup.status !== 409) throw new Error(`signup ${person.email}: ${signup.status} ${await signup.text()}`);
  const { csrfToken } = await (await req("GET", "/api/auth/csrf")).json();
  await req("POST", "/api/auth/callback/credentials", { form: { csrfToken, email: person.email, password: PASSWORD } });
  const s = await (await req("GET", "/api/auth/session")).json();
  if (!s?.user) throw new Error(`could not sign in as ${person.email} (was the password changed?)`);
  return req;
}

async function api(req, method, url, json) {
  const res = await req(method, url, { json });
  if (!res.ok) throw new Error(`${method} ${url}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function createDoc(req, title, content) {
  const d = await api(req, "POST", "/api/documents", { title });
  return api(req, "PATCH", `/api/documents/${d.id}`, { content, version: d.version });
}

const share = (req, docId, email, role) => api(req, "POST", `/api/documents/${docId}/shares`, { email, role });

// ---------- main ----------
async function main() {
  console.log(`Seeding demo data at ${BASE}`);
  const s = {};
  for (const [key, person] of Object.entries(PEOPLE)) s[key] = await signIn(person);

  // Reset: delete each demo user's own documents (shares cascade).
  for (const [key, req] of Object.entries(s)) {
    const { owned } = await api(req, "GET", "/api/documents");
    for (const d of owned) await api(req, "DELETE", `/api/documents/${d.id}`);
    console.log(`  reset ${PEOPLE[key].name}: removed ${owned.length} document(s)`);
  }

  // Maya
  const roadmap = await createDoc(s.maya, "Q4 Product Roadmap", ROADMAP);
  await share(s.maya, roadmap.id, PEOPLE.leo.email, "editor");
  await share(s.maya, roadmap.id, PEOPLE.priya.email, "viewer");
  const offsite = await createDoc(s.maya, "Team Offsite — Lisbon", OFFSITE);
  await api(s.maya, "PUT", `/api/documents/${offsite.id}/visibility`, { isPublic: true });
  // Imported through the real upload endpoint, like a user dropping a Markdown file in.
  const md = await readFile(path.join(here, "demo", "design-principles.md"));
  const form = new FormData();
  form.set("file", new Blob([md], { type: "text/markdown" }), "Design Principles.md");
  const imported = await s.maya("POST", "/api/documents/import", { raw: form });
  if (imported.status !== 201) throw new Error(`import: ${imported.status} ${await imported.text()}`);

  // Leo
  const arch = await createDoc(s.leo, "Editor Architecture Notes", ARCH);
  await share(s.leo, arch.id, PEOPLE.maya.email, "viewer");
  const retro = await createDoc(s.leo, "Sprint 14 Retro", RETRO);
  await share(s.leo, retro.id, PEOPLE.maya.email, "editor");
  await share(s.leo, retro.id, PEOPLE.priya.email, "editor");

  // Priya
  const style = await createDoc(s.priya, "Cotton Theme Style Guide", STYLE);
  await share(s.priya, style.id, PEOPLE.maya.email, "viewer");
  await share(s.priya, style.id, PEOPLE.leo.email, "viewer");
  await share(s.priya, style.id, PENDING_INVITE, "editor");
  await createDoc(s.priya, "Interview Notes — Draft", INTERVIEWS);

  console.log("\nDone. Demo accounts (password for all: " + PASSWORD + "):");
  for (const person of Object.values(PEOPLE)) console.log(`  ${person.name.padEnd(12)} ${person.email}`);
  console.log(`\nPublic link (no sign-in): ${BASE}/documents/${offsite.id}`);
}

main().catch((e) => {
  console.error("\nSeeding failed:", e.message);
  process.exit(1);
});
