-- 0002_compact_stub_enforcement.sql
-- Run 94 (Direct Track B v1.1): enforce the 16 KiB compact-stub invariant on the
-- inline runtime_observations.observation_json column. Existing rows are untouched
-- (legacy rows remain exempt until SP6 retirement rewrites them as compact pointers);
-- new inserts or updates carrying rich inline content fail closed at the schema layer.
CREATE TRIGGER IF NOT EXISTS runtime_observations_compact_stub_enforcement
BEFORE INSERT ON runtime_observations
WHEN NEW.observation_json IS NOT NULL AND length(CAST(NEW.observation_json AS BLOB)) > 16384
BEGIN
  SELECT RAISE(ABORT, 'runtime_observations.observation_json exceeds the 16 KiB compact stub cap');
END;
CREATE TRIGGER IF NOT EXISTS runtime_observations_compact_stub_update_enforcement
BEFORE UPDATE OF observation_json ON runtime_observations
WHEN NEW.observation_json IS NOT NULL AND length(CAST(NEW.observation_json AS BLOB)) > 16384
BEGIN
  SELECT RAISE(ABORT, 'runtime_observations.observation_json exceeds the 16 KiB compact stub cap');
END;
