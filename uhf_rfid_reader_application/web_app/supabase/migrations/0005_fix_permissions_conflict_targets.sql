-- 0005_fix_permissions_conflict_targets.sql
-- Corrects a real bug in 0002: a PARTIAL unique index ("where ... is not
-- null") is NOT usable as a Postgres ON CONFLICT inference target unless the
-- same WHERE predicate is repeated in the ON CONFLICT clause itself — which
-- PostgREST's upsert (what supabase-js's .upsert() sends) does not do. Every
-- upsert against "permissions" was failing with 42P10 ("no unique or
-- exclusion constraint matching the ON CONFLICT specification") — confirmed
-- live: scripts/seed.ts reported success (it never checked the upsert's
-- `error`) while the table stayed completely empty.
--
-- The partial predicate was also unnecessary: Postgres already treats NULL
-- as distinct from NULL in ordinary unique indexes, so a plain composite
-- unique index already allows unlimited userId-owned rows (roleId always
-- NULL there) without colliding on roleId, and vice versa — exactly what the
-- partial version was trying to achieve, just in a form ON CONFLICT can use.

drop index "permissions_role_module_uidx";
drop index "permissions_user_module_uidx";

create unique index "permissions_role_module_uidx" on "permissions" ("roleId", "moduleId");
create unique index "permissions_user_module_uidx" on "permissions" ("userId", "moduleId");
