/**
 * Comprehensive, idempotent dev/demo seed script — plans/my_hole_project_plan.md §8.8.
 *
 * One run produces, per company ("Magnum" and "Ascend" — reusing the site names
 * from the studied mobile mockups):
 *   - 6 roles (master_admin, admin, hr, supervisor, guard, employee) + default permissions
 *   - 1 Supabase Auth user per role (12 users total across both companies)
 *   - 2 sites; per site: 2 gates, 2 warehouses, 2 securityCheckpoints
 *   - per gate: 2 cameras, 2 uhfReaders; per checkpoint: 2 uhfReaders; per warehouse: 2 materials
 *   - 2 employees + 2 accessories
 *   - 2 vehicles (one 4-wheeler, one 2-wheeler) with a site + gate authorization each
 *
 * Idempotent: every insert is an upsert keyed on a natural/business key, so
 * re-running `npm run seed` after a schema change updates rather than duplicates.
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service role — never the
 * anon key, since this creates Auth users directly). Needs the migration in
 * supabase/migrations/0001_init_schema.sql already applied to that project.
 *
 * Run with: npm run seed
 */
// `dotenv/config` on its own only loads ".env" — this project (like Next.js
// itself) keeps real values in ".env.local" instead, so both are loaded
// explicitly here, in Next's own precedence order (.env.local wins).
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local, " +
      "fill in a local (`supabase start`) or hosted project's values, and re-run.",
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─────────────────────────────────────────────────────────────────────────────
// Reference data
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_NAMES = ["master_admin", "admin", "hr", "supervisor", "guard", "employee"] as const;

const MODULES: Array<{ key: string; label: string }> = [
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles" },
  { key: "permissionMatrix", label: "Permission Matrix" },
  { key: "sites", label: "Sites" },
  { key: "gates", label: "Gates" },
  { key: "warehouses", label: "Warehouses" },
  { key: "securityCheckpoints", label: "Security Checkpoints" },
  { key: "readers", label: "UHF Readers" },
  { key: "cameras", label: "Cameras" },
  { key: "employees", label: "Employees" },
  { key: "accessories", label: "Accessories" },
  { key: "materials", label: "Materials" },
  { key: "vehicles", label: "Vehicles" },
  { key: "unknownEntities", label: "Unknown Entities" },
  { key: "auditLog", label: "Audit Log" },
  { key: "apiDocs", label: "API Docs" },
];

// Illustrative defaults only — the real matrix is an open item (§8.9).
const DEFAULT_ACTIONS: Record<(typeof ROLE_NAMES)[number], string[]> = {
  master_admin: ["create", "read", "update", "delete", "manageSiteAuth", "manageGateAuth"],
  admin: ["create", "read", "update", "delete"],
  hr: ["create", "read", "update"],
  supervisor: ["read", "update", "manageGateAuth"],
  guard: ["read"],
  employee: ["read"],
};

// Per-module overrides on top of DEFAULT_ACTIONS — guard's flat "read" above
// would otherwise 403 the exact actions the Flutter guard app exists to do
// (open a gate, register a vehicle at it, identify an unknown detection).
const MODULE_OVERRIDES: Partial<Record<(typeof ROLE_NAMES)[number], Record<string, string[]>>> = {
  guard: {
    gates: ["read", "update"],
    vehicles: ["read", "create"],
    unknownEntities: ["read", "update"],
  },
};

const THEME_ROTATION: Array<{ themePalette: string; themeMode: string }> = [
  { themePalette: "oceanBlue", themeMode: "light" },
  { themePalette: "royalViolet", themeMode: "dark" },
  { themePalette: "indigoFusion", themeMode: "light" },
  { themePalette: "electricCobalt", themeMode: "dark" },
  { themePalette: "neonAmethyst", themeMode: "dark" },
];

type CompanyPlan = { companyName: string; siteNames: [string, string] };

const COMPANY_PLANS: CompanyPlan[] = [
  { companyName: "Magnum", siteNames: ["Magnum HQ", "Magnum North"] },
  { companyName: "Ascend", siteNames: ["Ascend HQ", "Ascend East"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Small upsert-by-natural-key helper (Supabase's upsert() needs a unique
// constraint target, which every table below already has).
// ─────────────────────────────────────────────────────────────────────────────

async function upsertOne<T extends Record<string, unknown>>(
  table: string,
  row: T,
  onConflict: string,
): Promise<string> {
  const { data, error } = await db
    .from(table)
    .upsert(row as never, { onConflict })
    .select("id")
    .single();
  if (error) throw new Error(`upsert ${table} failed: ${error.message}`);
  return (data as { id: string }).id;
}

/**
 * Every other write below returns `{ error }` too, but none of them were
 * being checked — including the "permissions" upsert, which silently failed
 * on every run (a partial-unique-index bug, fixed in migration 0005) while
 * this script kept printing "✓ ... default permissions" regardless. Wrap
 * every remaining write in this so a failure is loud, not a false "✓".
 */
async function checked(
  label: string,
  promise: PromiseLike<{ error: { message: string } | null }>,
): Promise<void> {
  const { error } = await promise;
  if (error) throw new Error(`${label} failed: ${error.message}`);
}

function randomSeedPassword(): string {
  // Dev/demo only — printed to console, never written to a file or committed.
  return `Seed-${randomBytes(6).toString("hex")}!`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed steps
// ─────────────────────────────────────────────────────────────────────────────

async function seedModules(): Promise<Map<string, string>> {
  const idByKey = new Map<string, string>();
  for (const mod of MODULES) {
    const id = await upsertOne("modules", mod, "key");
    idByKey.set(mod.key, id);
  }
  console.log(`✓ modules registry (${MODULES.length} rows)`);
  return idByKey;
}

async function ensureAuthUser(email: string, fullName: string): Promise<{ id: string; password?: string }> {
  // listUsers + filter by email keeps this idempotent — admin.createUser() errors
  // on a duplicate email, and there's no direct getUserByEmail in supabase-js v2.
  const { data: existing, error: listErr } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`);
  const found = existing.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) return { id: found.id };

  const password = randomSeedPassword();
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { fullName },
  });
  if (createErr) throw new Error(`createUser(${email}) failed: ${createErr.message}`);
  return { id: created.user.id, password };
}

async function seedCompany(
  plan: CompanyPlan,
  moduleIdByKey: Map<string, string>,
  printedCreds: string[],
): Promise<void> {
  const companyId = await upsertOne("companies", { name: plan.companyName }, "name");
  console.log(`\n=== ${plan.companyName} (${companyId}) ===`);

  // --- Roles + default permissions ---
  const roleIdByName = new Map<string, string>();
  for (const roleName of ROLE_NAMES) {
    const roleId = await upsertOne(
      "roles",
      { companyId, name: roleName, isSystemRole: true },
      "companyId,name",
    );
    roleIdByName.set(roleName, roleId);

    for (const [moduleKey, moduleId] of moduleIdByKey) {
      const actions = MODULE_OVERRIDES[roleName]?.[moduleKey] ?? DEFAULT_ACTIONS[roleName];
      await checked(
        `permissions upsert (${roleName}/${moduleKey})`,
        db
          .from("permissions")
          .upsert(
            {
              roleId,
              moduleId,
              actions,
              scopeType: "company",
              scopeIds: [],
            } as never,
            { onConflict: "roleId,moduleId" },
          ),
      );
    }
  }
  console.log(`  ✓ ${ROLE_NAMES.length} roles + default permissions across ${moduleIdByKey.size} modules`);

  // --- 1 user per role ---
  const userIdByRole = new Map<string, string>();
  let themeIndex = 0;
  for (const roleName of ROLE_NAMES) {
    const email = `${roleName}@${plan.companyName.toLowerCase().replace(/\s+/g, "")}.airis.dev`;
    const fullName = `${plan.companyName} ${roleName.replace("_", " ")}`;
    const { id: authUserId, password } = await ensureAuthUser(email, fullName);

    const userId = await upsertOne(
      "users",
      { id: authUserId, companyId, fullName, email, isActive: true },
      "id",
    );
    await checked(
      `userRoles upsert (${roleName})`,
      db.from("userRoles").upsert({ userId, roleId: roleIdByName.get(roleName) } as never, { onConflict: "userId,roleId" }),
    );

    const theme = THEME_ROTATION[themeIndex % THEME_ROTATION.length];
    themeIndex += 1;
    await checked(
      `userPreferences upsert (${roleName})`,
      db
        .from("userPreferences")
        .upsert({ userId, themePalette: theme.themePalette, themeMode: theme.themeMode } as never, { onConflict: "userId" }),
    );

    userIdByRole.set(roleName, userId);
    if (password) printedCreds.push(`${email}  /  ${password}`);
  }
  console.log(`  ✓ ${ROLE_NAMES.length} users (one per role)`);

  // --- Hierarchy: 2 sites, each with 2 gates / 2 warehouses / 2 checkpoints ---
  const siteIds: string[] = [];
  const gateIds: string[] = [];

  for (const siteName of plan.siteNames) {
    const siteId = await upsertOne("sites", { companyId, name: siteName }, "companyId,name");
    siteIds.push(siteId);

    for (let i = 1; i <= 2; i++) {
      const gateId = await upsertOne(
        "gates",
        { siteId, name: `${siteName} Gate ${i}` },
        "siteId,name",
      );
      gateIds.push(gateId);

      for (let j = 1; j <= 2; j++) {
        await upsertOne(
          "cameras",
          { gateId, name: `${siteName} Gate ${i} Camera ${j}` },
          "gateId,name",
        );
        await checked(
          `uhfReaders upsert (${siteName} Gate ${i} Reader ${j})`,
          db.from("uhfReaders").upsert(
            {
              gateId,
              name: `${siteName} Gate ${i} Reader ${j}`,
              ipAddress: `10.${i}.${j}.10`,
              port: 9000,
              locationType: j === 1 ? "entryPoint" : "exitPoint",
            } as never,
            { onConflict: "gateId,name" },
          ),
        );
      }

      const checkpointId = await upsertOne(
        "securityCheckpoints",
        { siteId, name: `${siteName} Checkpoint ${i}` },
        "siteId,name",
      );
      for (let j = 1; j <= 2; j++) {
        await checked(
          `uhfReaders upsert (${siteName} Checkpoint ${i} Reader ${j})`,
          db.from("uhfReaders").upsert(
            {
              checkpointId,
              name: `${siteName} Checkpoint ${i} Reader ${j}`,
              ipAddress: `10.${i}.${j}.20`,
              port: 9000,
              locationType: "entryPoint",
            } as never,
            { onConflict: "checkpointId,name" },
          ),
        );
      }

      const warehouseId = await upsertOne(
        "warehouses",
        { siteId, name: `${siteName} Warehouse ${i}` },
        "siteId,name",
      );
      for (let j = 1; j <= 2; j++) {
        await checked(
          // Keyed by warehouseId, not companyId: "i"/"j" restart at 1 for
          // every site, so two sites in the same company (e.g. Magnum HQ and
          // Magnum North) would otherwise both compute the identical
          // "MAT-<companyId>-11" tagEpc and collide on its unique constraint
          // — confirmed live, this broke the second site's materials entirely.
          `materials upsert (${siteName} Warehouse ${i} Material ${j})`,
          db.from("materials").upsert(
            {
              warehouseId,
              name: `${siteName} Warehouse ${i} Material ${j}`,
              tagEpc: `MAT-${warehouseId.slice(0, 8)}-${j}`,
            } as never,
            { onConflict: "warehouseId,name" },
          ),
        );
      }
    }
  }
  console.log(`  ✓ 2 sites, each with 2 gates (2 cameras + 2 readers each), 2 checkpoints (2 readers each), 2 warehouses (2 materials each)`);

  // --- Employees + accessories (linked to the guard/employee seed users) ---
  const employeeUserId = userIdByRole.get("employee")!;
  for (let i = 1; i <= 2; i++) {
    await upsertOne(
      "employees",
      {
        companyId,
        userId: i === 1 ? employeeUserId : null,
        employeeCode: `${plan.companyName.slice(0, 3).toUpperCase()}-EMP-00${i}`,
        name: `${plan.companyName} Employee ${i}`,
        department: i === 1 ? "Operations" : "Facilities",
        tagEpc: `EMP-${companyId.slice(0, 8)}-${i}`,
      },
      "companyId,employeeCode",
    );
  }
  for (let i = 1; i <= 2; i++) {
    await checked(
      `accessories upsert (${plan.companyName} Access Card ${i})`,
      db.from("accessories").upsert(
        {
          userId: employeeUserId,
          type: "accessory",
          label: `${plan.companyName} Access Card ${i}`,
          tagEpc: `ACC-${companyId.slice(0, 8)}-${i}`,
        } as never,
        { onConflict: "userId,label" },
      ),
    );
  }
  console.log("  ✓ 2 employees, 2 accessories");

  // --- Vehicles: one 4-wheeler, one 2-wheeler, each authorized at 1 site + 1 gate ---
  const ownerUserId = userIdByRole.get("supervisor")!;
  const masterAdminId = userIdByRole.get("master_admin")!;
  const vehicleDefs: Array<{ plate: string; type: string }> = [
    { plate: `${plan.companyName.slice(0, 2).toUpperCase()}-4W-001`, type: "4-wheeler" },
    { plate: `${plan.companyName.slice(0, 2).toUpperCase()}-2W-001`, type: "2-wheeler" },
  ];
  for (const v of vehicleDefs) {
    const vehicleId = await upsertOne(
      "vehicles",
      {
        companyId,
        plateNumber: v.plate,
        type: v.type,
        ownerUserId,
        driverInfo: { driverName: `${plan.companyName} Driver`, phone: "0000000000" },
        createdBy: masterAdminId,
        updatedBy: masterAdminId,
      },
      "companyId,plateNumber",
    );
    // Authorized at the FIRST site/gate only — deliberately not every site/gate,
    // to demonstrate the "owning ≠ authorized everywhere" rule (§7.4) with real data.
    await checked(
      `vehicleSiteAuthorizations upsert (${v.plate})`,
      db.from("vehicleSiteAuthorizations").upsert(
        { vehicleId, siteId: siteIds[0], grantedBy: masterAdminId } as never,
        { onConflict: "vehicleId,siteId" },
      ),
    );
    await checked(
      `vehicleGateAuthorizations upsert (${v.plate})`,
      db.from("vehicleGateAuthorizations").upsert(
        { vehicleId, gateId: gateIds[0], grantedBy: masterAdminId } as never,
        { onConflict: "vehicleId,gateId" },
      ),
    );
  }
  console.log("  ✓ 2 vehicles (1 four-wheeler, 1 two-wheeler), each authorized for 1 site + 1 gate only");
}

async function main() {
  console.log("Seeding AIRIS-Next dev/demo dataset...");
  const moduleIdByKey = await seedModules();

  const printedCreds: string[] = [];
  for (const plan of COMPANY_PLANS) {
    await seedCompany(plan, moduleIdByKey, printedCreds);
  }

  console.log("\n============================================================");
  console.log("Seed complete.");
  console.log(`Companies: ${COMPANY_PLANS.map((c) => c.companyName).join(", ")}`);
  if (printedCreds.length > 0) {
    console.log("\nNewly created login credentials (dev/demo only — not persisted anywhere):");
    for (const line of printedCreds) console.log(`  ${line}`);
  } else {
    console.log("\nNo new users were created this run (all seed users already existed).");
  }
  console.log("============================================================\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
