export const ADMIN_OPERATIONS = [
  {
    id: "ingest",
    label: "Ingest fixtures",
    description: "Refresh fixtures and standings",
    path: "/__run/ingest",
    danger: false,
  },
  {
    id: "live",
    label: "Live ingest",
    description: "Refresh live-window scores and fixture events",
    path: "/__run/live",
    danger: false,
  },
  {
    id: "notify",
    label: "Score and notify",
    description: "Score predictions and dispatch push notifications",
    path: "/__run/notify",
    danger: false,
  },
  {
    id: "premium-email",
    label: "Premium email",
    description: "Broadcast premium pre-match emails",
    path: "/__run/premium-email",
    danger: true,
  },
  {
    id: "posters",
    label: "Generate posters",
    description: "Enqueue and generate match posters",
    path: "/__run/posters",
    danger: false,
  },
  {
    id: "seed-identities",
    label: "Seed identities",
    description: "Seed team identity registry",
    path: "/__run/seed-identities",
    danger: false,
  },
] as const;

export type AdminOperationId = (typeof ADMIN_OPERATIONS)[number]["id"];

export function getAdminOperation(id: string) {
  return ADMIN_OPERATIONS.find((operation) => operation.id === id) ?? null;
}
