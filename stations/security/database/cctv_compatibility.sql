-- Run on agrovision_security AFTER restoring the supplied server dump.
-- Only CCTV defaults and its existing AI-sync trigger function are changed.
-- No camera rows, AI history, other tables, sequences, or DB credentials are replaced.
BEGIN;

ALTER TABLE public.cctv_cameras
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

DO $migration$
DECLARE
  definition text;
BEGIN
  IF to_regprocedure('public.sync_cctv_to_ai()') IS NOT NULL THEN
    SELECT pg_get_functiondef('public.sync_cctv_to_ai()'::regprocedure) INTO definition;
    -- Preserve the deployment's dblink target/credentials. On failure the Node
    -- CCTV API still syncs the stored camera_code and active boolean to Python.
    -- Avoid aborting camera saves when a legacy dump contains outdated credentials.
    IF position('CCTV API fallback' IN definition) = 0 THEN
      IF position('PERFORM dblink_exec(conn_str, sql_stmt);' IN definition) = 0 THEN
        RAISE EXCEPTION 'Unexpected CCTV trigger body: review before applying this migration';
      END IF;
      definition := replace(definition,
        'PERFORM dblink_exec(conn_str, sql_stmt);',
        $replacement$BEGIN
          PERFORM dblink_exec(conn_str, sql_stmt);
        EXCEPTION WHEN OTHERS THEN
          -- CCTV API fallback: never include credentials in the warning.
          RAISE WARNING 'CCTV dblink sync failed (%); camera saved. Check AI synchronization', SQLSTATE;
        END;$replacement$);
      EXECUTE definition;
    END IF;
  END IF;
END;
$migration$;

COMMIT;
