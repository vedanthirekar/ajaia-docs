/**
 * Public demo accounts, created by `npm run seed:demo` (scripts/seed-demo.mjs keeps
 * the same list). They hold only mock data and are meant to be shared with reviewers.
 */
export const DEMO_PASSWORD = "ajaia-demo-2026";

export const DEMO_ACCOUNTS = [
  { name: "Maya Chen", role: "Product lead", email: "maya@demo.example", fill: "bg-sky" },
  { name: "Leo Martins", role: "Engineer", email: "leo@demo.example", fill: "bg-butter" },
  { name: "Priya Patel", role: "Designer", email: "priya@demo.example", fill: "bg-blush" },
] as const;
