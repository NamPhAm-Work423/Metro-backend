-- ------------------------------------------------------------
-- init_db.sql (mounted to /docker-entrypoint-initdb.d/)
-- One-time bootstrap script. It creates service databases
-- plus application roles with the required privileges.
-- ------------------------------------------------------------

-- -----------------------------------------------------------------
-- 1.  Service databases & owners
-- -----------------------------------------------------------------

-- ---------- AUTH SERVICE (API-Gateway) ----------
CREATE DATABASE auth_db;
CREATE ROLE auth_user WITH LOGIN PASSWORD '1';
GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_user;

-- Connect to auth_db and fix schema ownership
\c auth_db
ALTER SCHEMA public OWNER TO auth_user;
GRANT ALL ON SCHEMA public TO auth_user;

-- Back to default database  
\c postgres

-- ---------- USER SERVICE (User-Service) ----------
CREATE DATABASE user_db;
CREATE ROLE user_service WITH LOGIN PASSWORD '1';
GRANT ALL PRIVILEGES ON DATABASE user_db TO user_service;

-- Connect to user_db and fix schema ownership
\c user_db
ALTER SCHEMA public OWNER TO user_service;
GRANT ALL ON SCHEMA public TO user_service;


-- Back to default database
\c postgres

-- ---------- TRANSPORT SERVICE (Transport-Service) ----------
CREATE DATABASE transport_db;
CREATE ROLE transport_service WITH LOGIN PASSWORD '1';
GRANT ALL PRIVILEGES ON DATABASE transport_db TO transport_service;

-- Connect to transport_db and fix schema ownership
\c transport_db
ALTER SCHEMA public OWNER TO transport_service;
GRANT ALL ON SCHEMA public TO transport_service;

-- Back to default database
\c postgres

-- ---------- TICKET SERVICE (Ticket-Service) ----------
CREATE DATABASE ticket_db;
CREATE ROLE ticket_service WITH LOGIN PASSWORD '1';
GRANT ALL PRIVILEGES ON DATABASE ticket_db TO ticket_service;

-- Connect to ticket_db and fix schema ownership
\c ticket_db
ALTER SCHEMA public OWNER TO ticket_service;
GRANT ALL ON SCHEMA public TO ticket_service;

-- Back to default database
\c postgres

-- ---------- CUSTOMER SUPPORT SERVICE (Customer-Support-Service) ----------
CREATE DATABASE customer_support_db;
CREATE ROLE customer_support_service WITH LOGIN PASSWORD '1';
GRANT ALL PRIVILEGES ON DATABASE customer_support_db TO customer_support_service;

-- Connect to customer_support_db and fix schema ownership
\c customer_support_db
ALTER SCHEMA public OWNER TO customer_support_service;
GRANT ALL ON SCHEMA public TO customer_support_service;

-- Back to default database
\c postgres

-- ---------- PAYMENT SERVICE (Payment-Service) ----------
CREATE DATABASE payment_db;
CREATE ROLE payment_service WITH LOGIN PASSWORD '1';
GRANT ALL PRIVILEGES ON DATABASE payment_db TO payment_service;

-- Connect to payment_db and fix schema ownership
\c payment_db
ALTER SCHEMA public OWNER TO payment_service;
GRANT ALL ON SCHEMA public TO payment_service;

-- Back to default database
\c postgres

-- ---------- REPORT SERVICE (Report-Service) ----------
CREATE DATABASE report_db;
CREATE ROLE report_service WITH LOGIN PASSWORD '1';
GRANT ALL PRIVILEGES ON DATABASE report_db TO report_service;

-- Connect to report_db and fix schema ownership    
\c report_db
ALTER SCHEMA public OWNER TO report_service;
GRANT ALL ON SCHEMA public TO report_service;

-- Back to default database
\c postgres

-- ---------- MANAGEMENT SERVICE (Management-Service) ----------
CREATE DATABASE management_db;
CREATE ROLE management_service WITH LOGIN PASSWORD '1';
GRANT ALL PRIVILEGES ON DATABASE management_db TO management_service;

-- Connect to management_db and fix schema ownership

\c management_db
ALTER SCHEMA public OWNER TO management_service;
GRANT ALL ON SCHEMA public TO management_service;

-- Back to default database
\c postgres

-- Enable uuid extension (if not already)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Back to default database
\c postgres

