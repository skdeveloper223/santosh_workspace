-- 0004_vehicle_visits_and_direction.sql
-- Implements plans/my_hole_project_plan.md §7.9 task 4 — pairs a vehicle's
-- arrival detection with its later dispatch detection instead of leaving two
-- disconnected rows in "vehicleDetections", giving dwell-time reporting.
--
-- "direction" is sourced at write time from the detecting camera's own
-- locationType (added here, mirroring "uhfReaders"."locationType" which
-- already existed) — so pairing never needs a join back to the gate/camera.

alter table "cameras" add column "locationType" text not null default 'entryPoint';
alter table "vehicleDetections" add column "direction" text;

create table "vehicleVisits" (
  "id"                  uuid primary key default gen_random_uuid(),
  "vehicleId"           uuid not null references "vehicles"("id") on delete cascade,
  "siteId"              uuid not null references "sites"("id") on delete cascade,
  "gateId"              uuid references "gates"("id"),
  "arrivalAt"           timestamptz not null,
  "arrivalDetectionId"  uuid references "vehicleDetections"("id"),
  "dispatchAt"          timestamptz,
  "dispatchDetectionId" uuid references "vehicleDetections"("id"),
  "status"              text not null default 'onSite' -- 'onSite' | 'departed'
);

create index "vehicleVisits_vehicleId_idx" on "vehicleVisits" ("vehicleId");
-- Supports "who's currently on site" without scanning departed visits (query-partial-indexes).
create index "vehicleVisits_onSite_idx" on "vehicleVisits" ("siteId") where "status" = 'onSite';
