-- Read-only checks on agrovision_security; rtsp_url is intentionally not printed.
SELECT current_database() AS database_name;
SELECT column_name, data_type, is_identity, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cctv_cameras'
ORDER BY ordinal_position;
SELECT id, camera_code, camera_name, station_slug, is_active, sort_order
FROM public.cctv_cameras ORDER BY id;
