/**
 * Comprehensive database cleanup script — wipes all data across all tables and auth users.
 * Requires 2-stage password verification matching DB_CLEAN_PASSWORD from .env / .env.local (default: Aether@3491).
 *
 * Execution order respects foreign key constraints:
 *   1. Event logs, detections, visits, snapshots, unknown entities, audit log
 *   2. Authorizations, accessories, materials, employees, vehicles
 *   3. Readers, cameras, checkpoints, warehouses, gates, sites
 *   4. User preferences, user roles, permissions, roles, app users, modules, companies
 *   5. Supabase Auth users (auth.users)
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + DB_CLEAN_PASSWORD in .env or .env.local
 *
 * Run with: npm run db:clean
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPECTED_PASSWORD = process.env.DB_CLEAN_PASSWORD || "Aether@3491";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill in values.",
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Primary key column overrides for tables that don't have an "id" column
const PRIMARY_KEY_OVERRIDES: Record<string, string> = {
  vehicleGateAuthorizations: "vehicleId",
  vehicleSiteAuthorizations: "vehicleId",
  userPreferences: "userId",
  userRoles: "userId",
};

// Tables in reverse dependency order (child tables first, parent tables last)
const TABLES_TO_CLEAN = [
  // Level 1: Logs, Detections, Visits, Snapshots, Events
  "vehicleVisits",
  "vehicleSnapshots",
  "vehicleDetections",
  "tagDetections",
  "unknownEntityEvents",
  "auditLog",

  // Level 2: Authorizations, Entities, Inventory
  "vehicleGateAuthorizations",
  "vehicleSiteAuthorizations",
  "accessories",
  "materials",
  "employees",
  "vehicles",

  // Level 3: Infrastructure, Hardware, Locations
  "uhfReaders",
  "cameras",
  "securityCheckpoints",
  "warehouses",
  "gates",
  "sites",

  // Level 4: Auth & Access Control, Users, Roles, Org Core
  "userPreferences",
  "userRoles",
  "permissions",
  "roles",
  "users",
  "modules",
  "companies",
];

async function confirmPasswordTwice(): Promise<boolean> {
  // Allow bypassing CLI prompt if passed explicitly in args e.g. --force-password=Aether@3491
  const argForce = process.argv.find((a) => a.startsWith("--force-password="));
  if (argForce) {
    const provided = argForce.split("=")[1];
    if (provided === EXPECTED_PASSWORD) return true;
    console.error("❌ Provided --force-password does not match expected DB_CLEAN_PASSWORD.");
    return false;
  }

  // Interactive CLI confirmation (asks 2 times)
  const rl = readline.createInterface({ input, output });
  try {
    console.log("\n⚠️  WARNING: You are about to PERMANENTLY WIPE ALL DATA from every table and delete all auth users!");
    console.log("This action is destructive and irreversible.\n");

    const pass1 = await rl.question("Passcode Confirmation [1/2] - Enter DB Clean Password: ");
    if (pass1.trim() !== EXPECTED_PASSWORD) {
      console.error("\n❌ Incorrect password on 1st confirmation. Database cleanup aborted.");
      return false;
    }

    const pass2 = await rl.question("Passcode Confirmation [2/2] - Re-enter DB Clean Password to confirm: ");
    if (pass2.trim() !== EXPECTED_PASSWORD) {
      console.error("\n❌ Incorrect password on 2nd confirmation. Database cleanup aborted.");
      return false;
    }

    console.log("\n✅ Password confirmed twice successfully. Proceeding with database cleanup...\n");
    return true;
  } finally {
    rl.close();
  }
}

async function deleteTableRows(tableName: string): Promise<number> {
  const pk = PRIMARY_KEY_OVERRIDES[tableName] || "id";
  const { data, error } = await db
    .from(tableName)
    .delete()
    .neq(pk, "00000000-0000-0000-0000-000000000000")
    .select(pk);

  if (error) {
    throw new Error(`Failed to clean table ${tableName}: ${error.message}`);
  }

  return data ? data.length : 0;
}

async function deleteAuthUsers(): Promise<number> {
  let count = 0;
  let page = 1;
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 50 });
    if (error) {
      console.warn(`Warning listing auth users: ${error.message}`);
      break;
    }
    if (!data.users || data.users.length === 0) break;

    for (const u of data.users) {
      const { error: delErr } = await db.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.warn(`Warning deleting auth user ${u.email}: ${delErr.message}`);
      } else {
        count++;
      }
    }
    page++;
  }
  return count;
}

async function main() {
  const confirmed = await confirmPasswordTwice();
  if (!confirmed) {
    process.exit(1);
  }

  console.log("Cleaning AIRIS-Next database...");

  for (const table of TABLES_TO_CLEAN) {
    try {
      const deletedCount = await deleteTableRows(table);
      console.log(`  ✓ Cleared ${table} (${deletedCount} rows removed)`);
    } catch (err) {
      console.error(`  ✗ Error cleaning ${table}:`, (err as Error).message);
    }
  }

  console.log("Cleaning Supabase Auth users...");
  const authUsersDeleted = await deleteAuthUsers();
  console.log(`  ✓ Cleared auth.users (${authUsersDeleted} users removed)`);

  console.log("\n============================================================");
  console.log("Database cleanup complete. All tables and test users wiped.");
  console.log("============================================================\n");
}

main().catch((err) => {
  console.error("Clean DB script failed:", err);
  process.exit(1);
});
