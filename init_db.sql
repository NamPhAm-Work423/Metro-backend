-- ------------------------------------------------------------
-- init_db.sql (mounted to /docker-entrypoint-initdb.d/)
-- One-time bootstrap script. It creates two service databases
--   1) auth_db          – used by API-Gateway
--   2) passenger_db         – used by Passenger-Service (holds admin/staff/passenger tables)
-- plus application roles with the required privileges.
-- ------------------------------------------------------------

-- -----------------------------------------------------------------
-- 1.  Service databases & owners
-- -----------------------------------------------------------------

-- ---------- AUTH SERVICE (API-Gateway) ----------
CREATE DATABASE auth_db;
CREATE ROLE auth_user WITH LOGIN PASSWORD 'authpass';
GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_user;

-- Connect to auth_db and fix schema ownership
\c auth_db
ALTER SCHEMA public OWNER TO auth_user;
GRANT ALL ON SCHEMA public TO auth_user;

-- Back to default database  
\c postgres

-- ---------- PASSENGER SERVICE (Passenger-Service) ----------
CREATE DATABASE passenger_db;
CREATE ROLE passenger_service WITH LOGIN PASSWORD 'passengerpass';
GRANT ALL PRIVILEGES ON DATABASE passenger_db TO passenger_service;

-- Connect to passenger_db and fix schema ownership
\c passenger_db
ALTER SCHEMA public OWNER TO passenger_service;
GRANT ALL ON SCHEMA public TO passenger_service;

-- Back to default database
\c postgres
