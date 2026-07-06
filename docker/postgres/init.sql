-- CityPulse local Postgres initialization.
-- The citypulse database is created by the postgres image via POSTGRES_DB.
--
-- Phase 2 (migration 006) will add here, mirroring production:
--   CREATE ROLE citypulse_app ...;
--   REVOKE UPDATE, DELETE ON agent_action_log FROM citypulse_app;  -- GC-4
SELECT 1;
