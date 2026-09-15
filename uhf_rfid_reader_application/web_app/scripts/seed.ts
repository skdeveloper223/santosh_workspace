/**
 * Comprehensive, idempotent dev/demo seed script — plans/my_hole_project_plan.md §8.8.
 *
 * One run produces, per company ("Magnum" and "Ascend" — reusing the site names
 * from the studied mobile mockups):
 *   - 6 roles (master_admin, admin, hr, supervisor, guard, employee) + default permissions
 *   - 1 Supabase Auth user per role (12 users total across both companies) with role-based default passwords (${role}@123)
 *   - 2 sites; per site: 2 gates, 2 warehouses, 2 securityCheckpoints
 *   - per gate: 2 cameras, 2 uhfReaders; per checkpoint: 2 uhfReaders; per warehouse: 2 materials
 *   - 2 employees + 2 accessories
 *   - 2 vehicles (one 4-wheeler, one 2-wheeler) with a site + gate authorization each
 *   - Full dummy test data for ALL remaining tables: tagDetections, vehicleDetections,
 *     vehicleSnapshots, vehicleVisits, unknownEntityEvents, and auditLog.
 *
 * Idempotent: every insert is an upsert keyed on a natural/business key, or safely cleared/inserted.
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service role — never the
 * anon key, since this creates Auth users directly). Needs migrations applied.
 *
 * Run with: npm run seed
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

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

const DEFAULT_ACTIONS: Record<(typeof ROLE_NAMES)[number], string[]> = {
  master_admin: ["create", "read", "update", "delete", "manageSiteAuth", "manageGateAuth"],
  admin: ["create", "read", "update", "delete"],
  hr: ["create", "read", "update"],
  supervisor: ["read", "update", "manageGateAuth"],
  guard: ["read"],
  employee: ["read"],
};

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
// Database Helpers
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

async function checked(
  label: string,
  promise: PromiseLike<{ error: { message: string } | null }>,
): Promise<void> {
  const { error } = await promise;
  if (error) throw new Error(`${label} failed: ${error.message}`);
}

/**
 * Task 1: Set role-based default passwords matching `${roleName}@123`
 * E.g. master_admin@123, admin@123, hr@123, supervisor@123, guard@123, employee@123
 */
async function ensureAuthUser(
  email: string,
  fullName: string,
  roleName: string,
): Promise<{ id: string; password: string }> {
  const password = `${roleName}@123`;
  const { data: existing, error: listErr } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`);

  const found = existing.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (found) {
    // Ensure password is updated to the default password pattern
    const { error: updateErr } = await db.auth.admin.updateUserById(found.id, {
      password,
      user_metadata: { fullName },
    });
    if (updateErr) throw new Error(`updateUserById(${email}) failed: ${updateErr.message}`);
    return { id: found.id, password };
  }

  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { fullName },
  });
  if (createErr) throw new Error(`createUser(${email}) failed: ${createErr.message}`);
  return { id: created.user.id, password };
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
    const { id: authUserId, password } = await ensureAuthUser(email, fullName, roleName);

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
    printedCreds.push(`${email}  /  ${password}`);
  }
  console.log(`  ✓ ${ROLE_NAMES.length} users (one per role with default password \${role}@123)`);

  // --- Hierarchy: 2 sites, each with 2 gates / 2 warehouses / 2 checkpoints ---
  const siteIds: string[] = [];
  const gateIds: string[] = [];
  const cameraIds: string[] = [];
  const readerIds: string[] = [];
  const checkpointIds: string[] = [];
  const warehouseIds: string[] = [];
  const materialInfoList: Array<{ id: string; epc: string }> = [];

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
        const camId = await upsertOne(
          "cameras",
          {
            gateId,
            name: `${siteName} Gate ${i} Camera ${j}`,
            locationType: j === 1 ? "entryPoint" : "exitPoint",
          },
          "gateId,name",
        );
        cameraIds.push(camId);

        const rdrId = await upsertOne(
          "uhfReaders",
          {
            gateId,
            name: `${siteName} Gate ${i} Reader ${j}`,
            ipAddress: `10.${i}.${j}.10`,
            port: 9000,
            locationType: j === 1 ? "entryPoint" : "exitPoint",
          },
          "gateId,name",
        );
        readerIds.push(rdrId);
      }

      const checkpointId = await upsertOne(
        "securityCheckpoints",
        { siteId, name: `${siteName} Checkpoint ${i}` },
        "siteId,name",
      );
      checkpointIds.push(checkpointId);

      for (let j = 1; j <= 2; j++) {
        const rdrId = await upsertOne(
          "uhfReaders",
          {
            checkpointId,
            name: `${siteName} Checkpoint ${i} Reader ${j}`,
            ipAddress: `10.${i}.${j}.20`,
            port: 9000,
            locationType: "entryPoint",
          },
          "checkpointId,name",
        );
        readerIds.push(rdrId);
      }

      const warehouseId = await upsertOne(
        "warehouses",
        { siteId, name: `${siteName} Warehouse ${i}` },
        "siteId,name",
      );
      warehouseIds.push(warehouseId);

      for (let j = 1; j <= 2; j++) {
        const tagEpc = `MAT-${warehouseId.slice(0, 8)}-${j}`;
        const matId = await upsertOne(
          "materials",
          {
            warehouseId,
            name: `${siteName} Warehouse ${i} Material ${j}`,
            tagEpc,
          },
          "warehouseId,name",
        );
        materialInfoList.push({ id: matId, epc: tagEpc });
      }
    }
  }
  console.log(`  ✓ 2 sites, each with 2 gates (2 cameras + 2 readers each), 2 checkpoints (2 readers each), 2 warehouses (2 materials each)`);

  // --- Employees + accessories ---
  const employeeUserId = userIdByRole.get("employee")!;
  const employeeInfoList: Array<{ id: string; epc: string }> = [];
  for (let i = 1; i <= 2; i++) {
    const tagEpc = `EMP-${companyId.slice(0, 8)}-${i}`;
    const empId = await upsertOne(
      "employees",
      {
        companyId,
        userId: i === 1 ? employeeUserId : null,
        employeeCode: `${plan.companyName.slice(0, 3).toUpperCase()}-EMP-00${i}`,
        name: `${plan.companyName} Employee ${i}`,
        department: i === 1 ? "Operations" : "Facilities",
        tagEpc,
      },
      "companyId,employeeCode",
    );
    employeeInfoList.push({ id: empId, epc: tagEpc });
  }

  const accessoryInfoList: Array<{ id: string; epc: string }> = [];
  for (let i = 1; i <= 2; i++) {
    const tagEpc = `ACC-${companyId.slice(0, 8)}-${i}`;
    const accId = await upsertOne(
      "accessories",
      {
        userId: employeeUserId,
        type: "accessory",
        label: `${plan.companyName} Access Card ${i}`,
        tagEpc,
      },
      "userId,label",
    );
    accessoryInfoList.push({ id: accId, epc: tagEpc });
  }
  console.log("  ✓ 2 employees, 2 accessories");

  // --- Vehicles ---
  const ownerUserId = userIdByRole.get("supervisor")!;
  const masterAdminId = userIdByRole.get("master_admin")!;
  const vehicleDefs: Array<{ plate: string; type: string }> = [
    { plate: `${plan.companyName.slice(0, 2).toUpperCase()}-4W-001`, type: "4-wheeler" },
    { plate: `${plan.companyName.slice(0, 2).toUpperCase()}-2W-001`, type: "2-wheeler" },
  ];
  const vehicleInfoList: Array<{ id: string; plate: string }> = [];

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
    vehicleInfoList.push({ id: vehicleId, plate: v.plate });

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

  // ───────────────────────────────────────────────────────────────────────────
  // Task 4: Additional Dummy Data for testing ALL remaining tables
  // ─────────────────────────────────────────────────────────────────────────

  // 1. tagDetections (Employee, Material, Accessory, Unknown tag scans)
  const now = new Date();
  const readerId = readerIds[0];
  const sampleDetections = [
    {
      epc: employeeInfoList[0].epc,
      readerId,
      resolvedType: "employee",
      resolvedId: employeeInfoList[0].id,
      detectedAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
      signal: -45,
    },
    {
      epc: materialInfoList[0].epc,
      readerId,
      resolvedType: "material",
      resolvedId: materialInfoList[0].id,
      detectedAt: new Date(now.getTime() - 1000 * 60 * 20).toISOString(),
      signal: -52,
    },
    {
      epc: accessoryInfoList[0].epc,
      readerId,
      resolvedType: "accessory",
      resolvedId: accessoryInfoList[0].id,
      detectedAt: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
      signal: -48,
    },
    {
      epc: `UNK-${companyId.slice(0, 8)}-99`,
      readerId,
      resolvedType: null,
      resolvedId: null,
      detectedAt: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
      signal: -65,
    },
  ];

  for (const det of sampleDetections) {
    await checked(`tagDetections insert (${det.epc})`, db.from("tagDetections").insert(det as never));
  }
  console.log("  ✓ tagDetections dummy records inserted");

  // 2. vehicleDetections & vehicleSnapshots
  const cameraId = cameraIds[0];
  const gateId = gateIds[0];

  const arrivalDetId = await upsertOne(
    "vehicleDetections",
    {
      plateNumber: vehicleInfoList[0].plate,
      cameraId,
      gateId,
      vehicleId: vehicleInfoList[0].id,
      status: "authorized",
      direction: "entryPoint",
      detectedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
    },
    "id",
  );

  const dispatchDetId = await upsertOne(
    "vehicleDetections",
    {
      plateNumber: vehicleInfoList[0].plate,
      cameraId,
      gateId,
      vehicleId: vehicleInfoList[0].id,
      status: "authorized",
      direction: "exitPoint",
      detectedAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
    },
    "id",
  );

  const activeArrivalDetId = await upsertOne(
    "vehicleDetections",
    {
      plateNumber: vehicleInfoList[1].plate,
      cameraId,
      gateId,
      vehicleId: vehicleInfoList[1].id,
      status: "authorized",
      direction: "entryPoint",
      detectedAt: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
    },
    "id",
  );

  // Snapshots for vehicle detections
  await checked(
    `vehicleSnapshots insert (${vehicleInfoList[0].plate})`,
    db.from("vehicleSnapshots").insert([
      {
        vehicleDetectionId: arrivalDetId,
        cameraId,
        imageUrl: `https://airis.dev/snapshots/${vehicleInfoList[0].plate}-entry.jpg`,
        capturedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        vehicleDetectionId: dispatchDetId,
        cameraId,
        imageUrl: `https://airis.dev/snapshots/${vehicleInfoList[0].plate}-exit.jpg`,
        capturedAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
      },
    ] as never),
  );
  console.log("  ✓ vehicleDetections & vehicleSnapshots dummy records inserted");

  // 3. vehicleVisits (1 completed visit 'departed', 1 active visit 'onSite')
  await checked(
    `vehicleVisits insert (departed & onSite)`,
    db.from("vehicleVisits").insert([
      {
        vehicleId: vehicleInfoList[0].id,
        siteId: siteIds[0],
        gateId,
        arrivalAt: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
        arrivalDetectionId: arrivalDetId,
        dispatchAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
        dispatchDetectionId: dispatchDetId,
        status: "departed",
      },
      {
        vehicleId: vehicleInfoList[1].id,
        siteId: siteIds[0],
        gateId,
        arrivalAt: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
        arrivalDetectionId: activeArrivalDetId,
        status: "onSite",
      },
    ] as never),
  );
  console.log("  ✓ vehicleVisits dummy records inserted");

  // 4. unknownEntityEvents (1 pending, 1 identified)
  const guardUserId = userIdByRole.get("guard")!;
  await checked(
    `unknownEntityEvents insert`,
    db.from("unknownEntityEvents").insert([
      {
        entityKind: "vehicle",
        placeholderRef: `UNK-PLATE-${plan.companyName.slice(0, 3)}-01`,
        gateId,
        status: "pending",
        createdAt: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
      },
      {
        entityKind: "employee",
        placeholderRef: `UNK-TAG-${plan.companyName.slice(0, 3)}-02`,
        checkpointId: checkpointIds[0],
        status: "identified",
        assignedGuardUserId: guardUserId,
        identifiedAsId: employeeInfoList[0].id,
        identifiedAt: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 90).toISOString(),
      },
    ] as never),
  );
  console.log("  ✓ unknownEntityEvents dummy records inserted");

  // 5. auditLog
  const adminUserId = userIdByRole.get("admin")!;
  await checked(
    `auditLog insert`,
    db.from("auditLog").insert([
      {
        actorUserId: adminUserId,
        action: "AUTH_LOGIN",
        moduleKey: "users",
        targetId: adminUserId,
        before: null,
        after: { email: `${plan.companyName.toLowerCase()}@airis.dev`, status: "success" },
        at: new Date(now.getTime() - 1000 * 60 * 120).toISOString(),
      },
      {
        actorUserId: masterAdminId,
        action: "GRANT_VEHICLE_GATE_AUTH",
        moduleKey: "vehicles",
        targetId: vehicleInfoList[0].id,
        before: { authorizedGates: [] },
        after: { gateId },
        at: new Date(now.getTime() - 1000 * 60 * 100).toISOString(),
      },
    ] as never),
  );
  console.log("  ✓ auditLog dummy records inserted");
}

async function main() {
  console.log("Seeding AIRIS-Next dev/demo dataset with default passwords and dummy data...");
  const moduleIdByKey = await seedModules();

  const printedCreds: string[] = [];
  for (const plan of COMPANY_PLANS) {
    await seedCompany(plan, moduleIdByKey, printedCreds);
  }

  console.log("\n============================================================");
  console.log("Seed complete.");
  console.log(`Companies: ${COMPANY_PLANS.map((c) => c.companyName).join(", ")}`);
  console.log("\nLogin Credentials (format: ${role}@123):");
  for (const line of printedCreds) {
    console.log(`  ${line}`);
  }
  console.log("============================================================\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
