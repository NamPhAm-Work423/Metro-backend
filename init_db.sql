-- ------------------------------------------------------------
-- init_db.sql (mounted to /docker-entrypoint-initdb.d/)
-- One-time bootstrap script. It creates service databases
--   1) auth_db          – used by API-Gateway
--   2) user_db     – used by User-Service
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

-- ---------- USER SERVICE (User-Service) ----------
CREATE DATABASE user_db;
CREATE ROLE user_service WITH LOGIN PASSWORD 'userpass';
GRANT ALL PRIVILEGES ON DATABASE user_db TO user_service;

-- Connect to user_db and fix schema ownership
\c user_db
ALTER SCHEMA public OWNER TO user_service;
GRANT ALL ON SCHEMA public TO user_service;


-- Back to default database
\c postgres
