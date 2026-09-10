/** Module registry keys — must stay in sync with the `modules` table (seeded by scripts/seed.ts). */
export const MODULE_KEYS = [
  "users",
  "roles",
  "permissionMatrix",
  "sites",
  "gates",
  "warehouses",
  "securityCheckpoints",
  "readers",
  "cameras",
  "employees",
  "accessories",
  "materials",
  "vehicles",
  "unknownEntities",
  "auditLog",
  "apiDocs",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type PermissionAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "manageSiteAuth"
  | "manageGateAuth";
