#!/bin/sh
set -e

# Read secret from ENV or _FILE. Exit if missing.
read_secret() {
  var="$1"
  file_var="${var}_FILE"
  eval val="\${$var:-}"
  eval file_path="\${$file_var:-}"
  if [ -n "$val" ]; then
    printf "%s" "$val"
    return 0
  fi
  if [ -n "$file_path" ] && [ -f "$file_path" ]; then
    cat "$file_path"
    return 0
  fi
  echo "[init_db] Missing secret: $var or $file_var" >&2
  return 1
}

# Function to escape single quotes in passwords for SQL
escape_sql_string() {
  echo "$1" | sed "s/'/''/g"
}

# Validate required secrets exist; fail fast if any missing
REQUIRED_VARS="GATEWAY_DB_PASSWORD AUTH_DB_PASSWORD USER_DB_PASSWORD TRANSPORT_DB_PASSWORD TICKET_DB_PASSWORD PAYMENT_DB_PASSWORD REPORT_DB_PASSWORD MANAGEMENT_DB_PASSWORD CONTROL_DB_PASSWORD"
for var in $REQUIRED_VARS; do
  file_var="${var}_FILE"
  eval val="\${$var:-}"
  eval file_path="\${$file_var:-}"
  if [ -z "$val" ] && { [ -z "$file_path" ] || [ ! -f "$file_path" ]; }; then
    echo "[init_db] ERROR: $var is required but not provided via env or *_FILE. Aborting init." >&2
    exit 1
  fi
done

# Collect passwords (provided via env or *_FILE) and escape them
GW_PASS="$(escape_sql_string "$(read_secret GATEWAY_DB_PASSWORD)")" || exit 1
AUTH_PASS="$(escape_sql_string "$(read_secret AUTH_DB_PASSWORD)")" || exit 1
USR_PASS="$(escape_sql_string "$(read_secret USER_DB_PASSWORD)")" || exit 1
TR_PASS="$(escape_sql_string "$(read_secret TRANSPORT_DB_PASSWORD)")" || exit 1
TK_PASS="$(escape_sql_string "$(read_secret TICKET_DB_PASSWORD)")" || exit 1
PAY_PASS="$(escape_sql_string "$(read_secret PAYMENT_DB_PASSWORD)")" || exit 1
RPT_PASS="$(escape_sql_string "$(read_secret REPORT_DB_PASSWORD)")" || exit 1
MGMT_PASS="$(escape_sql_string "$(read_secret MANAGEMENT_DB_PASSWORD)")" || exit 1
CTRL_PASS="$(escape_sql_string "$(read_secret CONTROL_DB_PASSWORD)")" || exit 1

# Use provided defaults from image env if not set
: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_DB:=postgres}"

echo "[init_db] Creating databases and roles..."

# ---------- GATEWAY SERVICE ----------
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gateway_service') THEN
    CREATE ROLE gateway_service LOGIN PASSWORD '$GW_PASS';
  ELSE
    ALTER ROLE gateway_service WITH PASSWORD '$GW_PASS';
  END IF;
END\$\$;

SELECT 'CREATE DATABASE gateway_db OWNER gateway_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'gateway_db')\gexec
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "gateway_db" <<EOSQL
ALTER SCHEMA public OWNER TO gateway_service;
GRANT ALL ON SCHEMA public TO gateway_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

# ---------- AUTH SERVICE ----------
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auth_service') THEN
    CREATE ROLE auth_service LOGIN PASSWORD '$AUTH_PASS';
  ELSE
    ALTER ROLE auth_service WITH PASSWORD '$AUTH_PASS';
  END IF;
END\$\$;

SELECT 'CREATE DATABASE auth_db OWNER auth_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'auth_db')\gexec
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "auth_db" <<EOSQL
ALTER SCHEMA public OWNER TO auth_service;
GRANT ALL ON SCHEMA public TO auth_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

# ---------- USER SERVICE ----------
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'user_service') THEN
    CREATE ROLE user_service LOGIN PASSWORD '$USR_PASS';
  ELSE
    ALTER ROLE user_service WITH PASSWORD '$USR_PASS';
  END IF;
END\$\$;

SELECT 'CREATE DATABASE user_db OWNER user_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'user_db')\gexec
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "user_db" <<EOSQL
ALTER SCHEMA public OWNER TO user_service;
GRANT ALL ON SCHEMA public TO user_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

# ---------- TRANSPORT SERVICE ----------
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'transport_service') THEN
    CREATE ROLE transport_service LOGIN PASSWORD '$TR_PASS';
  ELSE
    ALTER ROLE transport_service WITH PASSWORD '$TR_PASS';
  END IF;
END\$\$;

SELECT 'CREATE DATABASE transport_db OWNER transport_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'transport_db')\gexec
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "transport_db" <<EOSQL
ALTER SCHEMA public OWNER TO transport_service;
GRANT ALL ON SCHEMA public TO transport_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

# ---------- TICKET SERVICE ----------
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ticket_service') THEN
    CREATE ROLE ticket_service LOGIN PASSWORD '$TK_PASS';
  ELSE
    ALTER ROLE ticket_service WITH PASSWORD '$TK_PASS';
  END IF;
END\$\$;

SELECT 'CREATE DATABASE ticket_db OWNER ticket_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'ticket_db')\gexec
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "ticket_db" <<EOSQL
ALTER SCHEMA public OWNER TO ticket_service;
GRANT ALL ON SCHEMA public TO ticket_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

# ---------- PAYMENT SERVICE ----------
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'payment_service') THEN
    CREATE ROLE payment_service LOGIN PASSWORD '$PAY_PASS';
  ELSE
    ALTER ROLE payment_service WITH PASSWORD '$PAY_PASS';
  END IF;
END\$\$;

SELECT 'CREATE DATABASE payment_db OWNER payment_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'payment_db')\gexec
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "payment_db" <<EOSQL
ALTER SCHEMA public OWNER TO payment_service;
GRANT ALL ON SCHEMA public TO payment_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

# ---------- REPORT SERVICE ----------
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'report_service') THEN
    CREATE ROLE report_service LOGIN PASSWORD '$RPT_PASS';
  ELSE
    ALTER ROLE report_service WITH PASSWORD '$RPT_PASS';
  END IF;
END\$\$;

SELECT 'CREATE DATABASE report_db OWNER report_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'report_db')\gexec
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "report_db" <<EOSQL
ALTER SCHEMA public OWNER TO report_service;
GRANT ALL ON SCHEMA public TO report_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

# ---------- MANAGEMENT SERVICE ----------
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'management_service') THEN
    CREATE ROLE management_service LOGIN PASSWORD '$MGMT_PASS';
  ELSE
    ALTER ROLE management_service WITH PASSWORD '$MGMT_PASS';
  END IF;
END\$\$;

SELECT 'CREATE DATABASE management_db OWNER management_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'management_db')\gexec
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "management_db" <<EOSQL
ALTER SCHEMA public OWNER TO management_service;
GRANT ALL ON SCHEMA public TO management_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

# ---------- CONTROL SERVICE ----------
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'control_service') THEN
    CREATE ROLE control_service LOGIN PASSWORD '$CTRL_PASS';
  ELSE
    ALTER ROLE control_service WITH PASSWORD '$CTRL_PASS';
  END IF;
END\$\$;

SELECT 'CREATE DATABASE control_db OWNER control_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'control_db')\gexec
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "control_db" <<EOSQL
ALTER SCHEMA public OWNER TO control_service;
GRANT ALL ON SCHEMA public TO control_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

echo "[init_db] Databases and roles created successfully with provided secrets."