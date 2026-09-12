-- Run with psql variables, for example:
-- psql -h localhost -p 5432 -U postgres -d stylenyagrowthos \
--   -v app_password='...' -v test_password='...' -f provision-users.sql

SELECT set_config('stylenya.app_password', :'app_password', false);
SELECT set_config('stylenya.test_password', :'test_password', false);

DO $$
BEGIN
	IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'StylenyaGrowthOS_db') THEN
		EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', 'StylenyaGrowthOS_db', current_setting('stylenya.app_password'));
	ELSE
		EXECUTE format('ALTER ROLE %I LOGIN PASSWORD %L', 'StylenyaGrowthOS_db', current_setting('stylenya.app_password'));
	END IF;

	IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'StylenyaGrowthOS_db_test') THEN
		EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', 'StylenyaGrowthOS_db_test', current_setting('stylenya.test_password'));
	ELSE
		EXECUTE format('ALTER ROLE %I LOGIN PASSWORD %L', 'StylenyaGrowthOS_db_test', current_setting('stylenya.test_password'));
	END IF;
END
$$;

GRANT CONNECT ON DATABASE stylenyagrowthos TO "StylenyaGrowthOS_db";
GRANT CONNECT ON DATABASE stylenyagrowthos TO "StylenyaGrowthOS_db_test";
GRANT USAGE ON SCHEMA public TO "StylenyaGrowthOS_db";
GRANT USAGE, CREATE ON SCHEMA public TO "StylenyaGrowthOS_db_test";