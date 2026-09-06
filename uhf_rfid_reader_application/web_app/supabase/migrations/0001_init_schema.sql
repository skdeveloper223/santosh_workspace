-- 0001_init_schema.sql
-- Implements the schema from plans/my_hole_project_plan.md §8.2.
-- Column names are camelCase and double-quoted throughout (Postgres folds unquoted
-- identifiers to lowercase) so every layer above the DB — Supabase client, API
-- responses, TypeScript types — can share the exact same field names (see the
-- project's camelCase-end-to-end rule).
--
-- Row Level Security is intentionally NOT enabled here. Per §8.2, the service
-- layer (assertPermission()) is the primary enforcement point; RLS is planned as
-- defense-in-depth once the custom JWT claims hook is designed (§8.9 open item).

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Org hierarchy
-- ─────────────────────────────────────────────────────────────────────────────

create table "companies" (
  "id"        uuid primary key default gen_random_uuid(),
  "name"      text not null unique,
  "createdAt" timestamptz not null default now()
);

create table "sites" (
  "id"        uuid primary key default gen_random_uuid(),
  "companyId" uuid not null references "companies"("id") on delete cascade,
  "name"      text not null,
  "createdAt" timestamptz not null default now(),
  unique ("companyId", "name")
);

create table "gates" (
  "id"        uuid primary key default gen_random_uuid(),
  "siteId"    uuid not null references "sites"("id") on delete cascade,
  "name"      text not null,
  "createdAt" timestamptz not null default now(),
  unique ("siteId", "name")
);

create table "securityCheckpoints" (
  "id"        uuid primary key default gen_random_uuid(),
  "siteId"    uuid not null references "sites"("id") on delete cascade,
  "name"      text not null,
  "createdAt" timestamptz not null default now(),
  unique ("siteId", "name")
);

create table "warehouses" (
  "id"        uuid primary key default gen_random_uuid(),
  "siteId"    uuid not null references "sites"("id") on delete cascade,
  "name"      text not null,
  "createdAt" timestamptz not null default now(),
  unique ("siteId", "name")
);

-- A reader belongs to exactly one of {gate, checkpoint}.
create table "uhfReaders" (
  "id"           uuid primary key default gen_random_uuid(),
  "gateId"       uuid references "gates"("id") on delete cascade,
  "checkpointId" uuid references "securityCheckpoints"("id") on delete cascade,
  "name"         text not null,
  "ipAddress"    inet,
  "port"         integer,
  "locationType" text not null default 'entryPoint',
  "isActive"     boolean not null default true,
  "createdAt"    timestamptz not null default now(),
  constraint "uhfReaders_exactly_one_parent" check (
    (("gateId" is not null)::int + ("checkpointId" is not null)::int) = 1
  )
);

create table "cameras" (
  "id"        uuid primary key default gen_random_uuid(),
  "gateId"    uuid not null references "gates"("id") on delete cascade,
  "name"      text not null,
  "streamUrl" text,
  "isActive"  boolean not null default true,
  "createdAt" timestamptz not null default now(),
  unique ("gateId", "name")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Users / RBAC (no self-signup: rows here are only ever created server-side
-- via the Supabase Auth Admin API — see §8.2 enforcement model)
-- ─────────────────────────────────────────────────────────────────────────────

create table "users" (
  "id"        uuid primary key references auth.users("id") on delete cascade,
  "companyId" uuid not null references "companies"("id") on delete cascade,
  "fullName"  text not null,
  "email"     text not null unique,
  "isActive"  boolean not null default true,
  "createdBy" uuid references "users"("id"),
  "createdAt" timestamptz not null default now()
);

create table "roles" (
  "id"           uuid primary key default gen_random_uuid(),
  "companyId"    uuid not null references "companies"("id") on delete cascade,
  "name"         text not null,
  "isSystemRole" boolean not null default false,
  "createdBy"    uuid references "users"("id"),
  "createdAt"    timestamptz not null default now(),
  unique ("companyId", "name")
);

create table "userRoles" (
  "userId" uuid not null references "users"("id") on delete cascade,
  "roleId" uuid not null references "roles"("id") on delete cascade,
  primary key ("userId", "roleId")
);

-- Registry of every permissionable module in the system (§8.2).
create table "modules" (
  "id"    uuid primary key default gen_random_uuid(),
  "key"   text not null unique,
  "label" text not null
);

-- A permission row belongs to exactly one of {role, user} — role-level default
-- OR a per-user override, per §8.2's enforcement model.
create table "permissions" (
  "id"         uuid primary key default gen_random_uuid(),
  "roleId"     uuid references "roles"("id") on delete cascade,
  "userId"     uuid references "users"("id") on delete cascade,
  "moduleId"   uuid not null references "modules"("id") on delete cascade,
  "actions"    text[] not null default '{}',
  "scopeType"  text not null default 'company', -- 'company' | 'site' | 'gate' | 'warehouse'
  "scopeIds"   uuid[] not null default '{}',     -- empty = all rows in scopeType
  "createdAt"  timestamptz not null default now(),
  constraint "permissions_exactly_one_owner" check (
    (("roleId" is not null)::int + ("userId" is not null)::int) = 1
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Vehicle governance (§7.4 / §8.2) — created at company level; access is a
-- separate, explicit per-site then per-gate authorization.
-- ─────────────────────────────────────────────────────────────────────────────

create table "vehicles" (
  "id"          uuid primary key default gen_random_uuid(),
  "companyId"   uuid not null references "companies"("id") on delete cascade,
  "plateNumber" text not null,
  "type"        text not null, -- '4-wheeler' | '2-wheeler' | 'other'
  "ownerUserId" uuid references "users"("id"),
  "driverInfo"  jsonb,
  "createdBy"   uuid references "users"("id"),
  "createdAt"   timestamptz not null default now(),
  "updatedBy"   uuid references "users"("id"),
  "updatedAt"   timestamptz not null default now(),
  unique ("companyId", "plateNumber")
);

create table "vehicleSiteAuthorizations" (
  "vehicleId"  uuid not null references "vehicles"("id") on delete cascade,
  "siteId"     uuid not null references "sites"("id") on delete cascade,
  "grantedBy"  uuid references "users"("id"),
  "grantedAt"  timestamptz not null default now(),
  primary key ("vehicleId", "siteId")
);

create table "vehicleGateAuthorizations" (
  "vehicleId"  uuid not null references "vehicles"("id") on delete cascade,
  "gateId"     uuid not null references "gates"("id") on delete cascade,
  "grantedBy"  uuid references "users"("id"),
  "grantedAt"  timestamptz not null default now(),
  primary key ("vehicleId", "gateId")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- People & tagged assets
-- ─────────────────────────────────────────────────────────────────────────────

create table "employees" (
  "id"            uuid primary key default gen_random_uuid(),
  "companyId"     uuid not null references "companies"("id") on delete cascade,
  "userId"        uuid references "users"("id"),
  "checkpointId"  uuid references "securityCheckpoints"("id"),
  "employeeCode"  text not null,
  "name"          text not null,
  "department"    text,
  "tagEpc"        text unique,
  "createdAt"     timestamptz not null default now(),
  unique ("companyId", "employeeCode")
);

-- Generic accessory (RFID-tagged item issued to a user) — distinct from vehicles
-- (§7.7 point 7): Accessory + Vehicle-4W + Vehicle-2W are the three categories.
create table "accessories" (
  "id"        uuid primary key default gen_random_uuid(),
  "userId"    uuid not null references "users"("id") on delete cascade,
  "type"      text not null default 'accessory',
  "tagEpc"    text unique,
  "label"     text,
  "createdAt" timestamptz not null default now()
);

create table "materials" (
  "id"          uuid primary key default gen_random_uuid(),
  "warehouseId" uuid not null references "warehouses"("id") on delete cascade,
  "name"        text not null,
  "tagEpc"      text unique,
  "createdAt"   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Detections / realtime events (high-volume tables written by workers/)
-- ─────────────────────────────────────────────────────────────────────────────

create table "tagDetections" (
  "id"           uuid primary key default gen_random_uuid(),
  "epc"          text not null,
  "readerId"     uuid references "uhfReaders"("id"),
  "resolvedType" text, -- 'employee' | 'accessory' | 'material' | null (unknown)
  "resolvedId"   uuid,
  "detectedAt"   timestamptz not null default now(),
  "signal"       integer
);
create index "tagDetections_detectedAt_idx" on "tagDetections" ("detectedAt" desc);
create index "tagDetections_epc_idx" on "tagDetections" ("epc");

create table "vehicleDetections" (
  "id"          uuid primary key default gen_random_uuid(),
  "plateNumber" text not null,
  "cameraId"    uuid references "cameras"("id"),
  "gateId"      uuid references "gates"("id"),
  "vehicleId"   uuid references "vehicles"("id"),
  "status"      text not null default 'pending',
  "detectedAt"  timestamptz not null default now()
);
create index "vehicleDetections_detectedAt_idx" on "vehicleDetections" ("detectedAt" desc);

-- One row per 30s tick per vehicle detection session (§7.6 / §7.7 point 5).
create table "vehicleSnapshots" (
  "id"                  uuid primary key default gen_random_uuid(),
  "vehicleDetectionId"  uuid not null references "vehicleDetections"("id") on delete cascade,
  "cameraId"            uuid not null references "cameras"("id"),
  "imageUrl"            text not null,
  "capturedAt"          timestamptz not null default now()
);

create table "unknownEntityEvents" (
  "id"                   uuid primary key default gen_random_uuid(),
  "entityKind"           text not null, -- 'employee' | 'accessory' | 'material' | 'vehicle'
  "placeholderRef"       text,
  "gateId"               uuid references "gates"("id"),
  "checkpointId"         uuid references "securityCheckpoints"("id"),
  "warehouseId"          uuid references "warehouses"("id"),
  "status"               text not null default 'pending', -- 'pending' | 'identified'
  "assignedGuardUserId"  uuid references "users"("id"),
  "identifiedAsId"       uuid,
  "identifiedAt"         timestamptz,
  "createdAt"            timestamptz not null default now()
);

create table "auditLog" (
  "id"           uuid primary key default gen_random_uuid(),
  "actorUserId"  uuid references "users"("id"),
  "action"       text not null,
  "moduleKey"    text not null,
  "targetId"     uuid,
  "before"       jsonb,
  "after"        jsonb,
  "at"           timestamptz not null default now()
);
create index "auditLog_at_idx" on "auditLog" ("at" desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Theming (§8.4)
-- ─────────────────────────────────────────────────────────────────────────────

create table "userPreferences" (
  "userId"       uuid primary key references "users"("id") on delete cascade,
  "themePalette" text not null default 'oceanBlue', -- oceanBlue | royalViolet | indigoFusion | electricCobalt | neonAmethyst
  "themeMode"    text not null default 'light',      -- light | dark
  "fontFamily"   text not null default 'inter',
  "updatedAt"    timestamptz not null default now()
);
