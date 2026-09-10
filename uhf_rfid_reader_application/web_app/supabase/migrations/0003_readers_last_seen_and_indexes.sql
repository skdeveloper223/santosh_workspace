-- 0003_readers_last_seen_and_indexes.sql
-- Adds the "Last ping" field needed by the Readers management screen (per the
-- reference mockups in sources/web_ui/), and indexes the two uhfReaders
-- foreign-key columns that screen's list query filters on. Unlike gates,
-- securityCheckpoints, warehouses and cameras (each already covered by a
-- composite unique index with their siteId/gateId column leading), readers
-- have no such constraint, so gateId/checkpointId would otherwise be full
-- table scans as reader counts grow (see supabase-postgres-best-practices:
-- query-missing-indexes).

alter table "uhfReaders" add column "lastSeenAt" timestamptz;

create index "uhfReaders_gateId_idx" on "uhfReaders" ("gateId") where "gateId" is not null;
create index "uhfReaders_checkpointId_idx" on "uhfReaders" ("checkpointId") where "checkpointId" is not null;
