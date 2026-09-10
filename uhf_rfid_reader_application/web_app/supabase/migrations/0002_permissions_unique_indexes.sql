-- 0002_permissions_unique_indexes.sql
-- `permissions` had no unique target for (roleId, moduleId) / (userId, moduleId),
-- so scripts/seed.ts's upsert(..., { onConflict: "roleId,moduleId" }) and the new
-- permission-matrix editor's upsert would fail at the database with "there is no
-- unique or exclusion constraint matching the ON CONFLICT specification". A plain
-- unique index can't cover both nullable columns at once (two NULLs never compare
-- equal), so this is two partial indexes — one per ownership case, matching the
-- "permissions_exactly_one_owner" check constraint already on this table.

create unique index "permissions_role_module_uidx" on "permissions" ("roleId", "moduleId") where "roleId" is not null;
create unique index "permissions_user_module_uidx" on "permissions" ("userId", "moduleId") where "userId" is not null;
