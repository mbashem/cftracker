DO $$
DECLARE
    app_password text := btrim(pg_read_file('/run/secrets/app_password'), E'\r\n');
BEGIN
    IF app_password = '' THEN
        RAISE EXCEPTION 'Application database password must not be empty';
    END IF;
    EXECUTE format(
        'CREATE ROLE cftracker_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L',
        app_password
    );
END;
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO cftracker_app;
