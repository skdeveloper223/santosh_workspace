-- 0006_seed_idempotency_indexes.sql
-- scripts/seed.ts inserted "uhfReaders", "materials" and "accessories" rows
-- with plain .insert() (no natural-key upsert target), so every re-run of
-- `npm run seed` was duplicating all of them — harmless in the sense that
-- nothing crashed, but violates the script's own "idempotent by design"
-- claim (§8.8) and would have kept doubling the Readers list, materials,
-- and accessories on every re-seed. Plain (non-partial) unique indexes, per
-- the lesson from 0005: PostgREST's upsert needs a real ON CONFLICT target,
-- and NULL-vs-NULL non-uniqueness already does the right thing for the
-- mutually-exclusive gateId/checkpointId columns without a WHERE predicate.

create unique index "uhfReaders_gate_name_uidx" on "uhfReaders" ("gateId", "name");
create unique index "uhfReaders_checkpoint_name_uidx" on "uhfReaders" ("checkpointId", "name");
create unique index "materials_warehouse_name_uidx" on "materials" ("warehouseId", "name");
create unique index "accessories_user_label_uidx" on "accessories" ("userId", "label");
