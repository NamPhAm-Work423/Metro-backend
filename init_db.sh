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

# Collect passwords (provided via env or *_FILE)
GW_PASS="$(read_secret GATEWAY_DB_PASSWORD)" || exit 1
AUTH_PASS="$(read_secret AUTH_DB_PASSWORD)" || exit 1
USR_PASS="$(read_secret USER_DB_PASSWORD)" || exit 1
TR_PASS="$(read_secret TRANSPORT_DB_PASSWORD)" || exit 1
TK_PASS="$(read_secret TICKET_DB_PASSWORD)" || exit 1
PAY_PASS="$(read_secret PAYMENT_DB_PASSWORD)" || exit 1
RPT_PASS="$(read_secret REPORT_DB_PASSWORD)" || exit 1
MGMT_PASS="$(read_secret MANAGEMENT_DB_PASSWORD)" || exit 1
CTRL_PASS="$(read_secret CONTROL_DB_PASSWORD)" || exit 1

# Use provided defaults from image env if not set
: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_DB:=postgres}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v gw="$GW_PASS" -v auth="$AUTH_PASS" -v usr="$USR_PASS" \
  -v tr="$TR_PASS" -v tk="$TK_PASS" -v pay="$PAY_PASS" \
  -v rpt="$RPT_PASS" -v mgmt="$MGMT_PASS" -v ctrl="$CTRL_PASS" <<-'EOSQL'

-- ---------- GATEWAY SERVICE ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gateway_service') THEN
    CREATE ROLE gateway_service LOGIN PASSWORD :'gw';
  ELSE
    ALTER ROLE gateway_service WITH PASSWORD :'gw';
  END IF;
END$$;

SELECT 'CREATE DATABASE gateway_db OWNER gateway_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'gateway_db')\gexec
\c gateway_db
ALTER SCHEMA public OWNER TO gateway_service;
GRANT ALL ON SCHEMA public TO gateway_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c postgres

-- ---------- CONTROL SERVICE ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'control_service') THEN
    CREATE ROLE control_service LOGIN PASSWORD :'ctrl';
  ELSE
    ALTER ROLE control_service WITH PASSWORD :'ctrl';
  END IF;
END$$;

SELECT 'CREATE DATABASE control_db OWNER control_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'control_db')\gexec
\c control_db
ALTER SCHEMA public OWNER TO control_service;
GRANT ALL ON SCHEMA public TO control_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c postgres

-- ---------- AUTH SERVICE ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auth_service') THEN
    CREATE ROLE auth_service LOGIN PASSWORD :'auth';
  ELSE
    ALTER ROLE auth_service WITH PASSWORD :'auth';
  END IF;
END$$;

SELECT 'CREATE DATABASE auth_db OWNER auth_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'auth_db')\gexec
\c auth_db
ALTER SCHEMA public OWNER TO auth_service;
GRANT ALL ON SCHEMA public TO auth_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c postgres

-- ---------- USER SERVICE ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'user_service') THEN
    CREATE ROLE user_service LOGIN PASSWORD :'usr';
  ELSE
    ALTER ROLE user_service WITH PASSWORD :'usr';
  END IF;
END$$;

SELECT 'CREATE DATABASE user_db OWNER user_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'user_db')\gexec
\c user_db
ALTER SCHEMA public OWNER TO user_service;
GRANT ALL ON SCHEMA public TO user_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c postgres

-- ---------- TRANSPORT SERVICE ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'transport_service') THEN
    CREATE ROLE transport_service LOGIN PASSWORD :'tr';
  ELSE
    ALTER ROLE transport_service WITH PASSWORD :'tr';
  END IF;
END$$;

SELECT 'CREATE DATABASE transport_db OWNER transport_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'transport_db')\gexec
\c transport_db
ALTER SCHEMA public OWNER TO transport_service;
GRANT ALL ON SCHEMA public TO transport_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c postgres

-- ---------- TICKET SERVICE ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ticket_service') THEN
    CREATE ROLE ticket_service LOGIN PASSWORD :'tk';
  ELSE
    ALTER ROLE ticket_service WITH PASSWORD :'tk';
  END IF;
END$$;

SELECT 'CREATE DATABASE ticket_db OWNER ticket_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'ticket_db')\gexec
\c ticket_db
ALTER SCHEMA public OWNER TO ticket_service;
GRANT ALL ON SCHEMA public TO ticket_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c postgres

-- ---------- PAYMENT SERVICE ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'payment_service') THEN
    CREATE ROLE payment_service LOGIN PASSWORD :'pay';
  ELSE
    ALTER ROLE payment_service WITH PASSWORD :'pay';
  END IF;
END$$;

SELECT 'CREATE DATABASE payment_db OWNER payment_service'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'payment_db')\gexec
\c payment_db
ALTER SCHEMA public OWNER TO payment_service;
GRANT ALL ON SCHEMA public TO payment_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c postgres

-- ---------- REPORT SERVICE ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'report_service') THEN
    CREATE ROLE report_service LOGIN PASSWORD :'rpt';
  ELSE
    ALTER ROLE report_service WITH PASSWORD :'rpt';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'report_db') THEN
    CREATE DATABASE report_db OWNER report_service;
  END IF;
END$$;
\c report_db
ALTER SCHEMA public OWNER TO report_service;
GRANT ALL ON SCHEMA public TO report_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c postgres

-- ---------- MANAGEMENT SERVICE ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'management_service') THEN
    CREATE ROLE management_service LOGIN PASSWORD :'mgmt';
  ELSE
    ALTER ROLE management_service WITH PASSWORD :'mgmt';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'management_db') THEN
    CREATE DATABASE management_db OWNER management_service;
  END IF;
END$$;
\c management_db
ALTER SCHEMA public OWNER TO management_service;
GRANT ALL ON SCHEMA public TO management_service;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c postgres

EOSQL

echo "[init_db] Databases and roles ensured with provided secrets."

