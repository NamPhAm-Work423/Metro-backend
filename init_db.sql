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

-- ---------- TRANSPORT SERVICE (Transport-Service) ----------
CREATE DATABASE transport_db;
CREATE ROLE transport_service WITH LOGIN PASSWORD 'transportpass';
GRANT ALL PRIVILEGES ON DATABASE transport_db TO transport_service;

-- Connect to transport_db and fix schema ownership
\c transport_db
ALTER SCHEMA public OWNER TO transport_service;
GRANT ALL ON SCHEMA public TO transport_service;

-- Back to default database
\c postgres

-- ---------- TICKET SERVICE (Ticket-Service) ----------
CREATE DATABASE ticket_db;
CREATE ROLE ticket_service WITH LOGIN PASSWORD 'ticketpass';
GRANT ALL PRIVILEGES ON DATABASE ticket_db TO ticket_service;

-- Connect to ticket_db and fix schema ownership
\c ticket_db
ALTER SCHEMA public OWNER TO ticket_service;
GRANT ALL ON SCHEMA public TO ticket_service;

-- Back to default database
\c postgres

-- ---------- CUSTOMER SUPPORT SERVICE (Customer-Support-Service) ----------
CREATE DATABASE customer_support_db;
CREATE ROLE customer_support_service WITH LOGIN PASSWORD 'customersupportpass';
GRANT ALL PRIVILEGES ON DATABASE customer_support_db TO customer_support_service;

-- Connect to customer_support_db and fix schema ownership
\c customer_support_db
ALTER SCHEMA public OWNER TO customer_support_service;
GRANT ALL ON SCHEMA public TO customer_support_service;

-- Back to default database
\c postgres

-- ---------- PAYMENT SERVICE (Payment-Service) ----------
CREATE DATABASE payment_db;
CREATE ROLE payment_service WITH LOGIN PASSWORD 'paymentpass';
GRANT ALL PRIVILEGES ON DATABASE payment_db TO payment_service;

-- Connect to payment_db and fix schema ownership
\c payment_db
ALTER SCHEMA public OWNER TO payment_service;
GRANT ALL ON SCHEMA public TO payment_service;

-- Back to default database
\c postgres

-- ---------- REPORT SERVICE (Report-Service) ----------
CREATE DATABASE report_db;
CREATE ROLE report_service WITH LOGIN PASSWORD 'reportpass';
GRANT ALL PRIVILEGES ON DATABASE report_db TO report_service;

-- Connect to report_db and fix schema ownership    
\c report_db
ALTER SCHEMA public OWNER TO report_service;
GRANT ALL ON SCHEMA public TO report_service;

-- Back to default database
\c postgres

-- -----------------------------------------------------------------
-- 2.  Bootstrap default ADMIN account (application-level)
-- -----------------------------------------------------------------

-- NOTE: Admin accounts cannot be created through public API registration.
--       This script seeds a single initial admin so that the system can
--       be accessed after first deployment. Credentials:
--         Email    : admin@metro.com
--         Username : admin
--         Password : Admin@123 (bcrypt-hashed below)
--       CHANGE THE PASSWORD IMMEDIATELY AFTER FIRST LOGIN IN PRODUCTION!

-- ---------- Seed admin in AUTH SERVICE database ----------
\c auth_db

-- Enable uuid extension (if not already)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------
-- Let the application (Sequelize) create the users table so that
-- it is owned by the connection role (auth_user) – avoids "must be owner"
-- errors during ALTERs/INDEX creation.
-- -----------------------------------------------------------------

-- Admin seeding moved to application layer (api-gateway/src/utils/seedAdmin.js)

-- Back to default database
\c postgres

