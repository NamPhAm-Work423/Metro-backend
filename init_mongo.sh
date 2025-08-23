#!/bin/bash

# MongoDB Initialization Script
# This script runs when MongoDB container starts for the first time

echo "Starting MongoDB initialization..."

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
  echo "[init_mongo] Missing secret: $var or $file_var" >&2
  return 1
}

# Validate required secrets exist; fail fast if any missing
REQUIRED_VARS="MONGO_INITDB_ROOT_USERNAME MONGO_INITDB_ROOT_PASSWORD MONGO_INITDB_DATABASE WEBHOOK_DB_USER WEBHOOK_DB_PASSWORD"
for var in $REQUIRED_VARS; do
  file_var="${var}_FILE"
  eval val="\${$var:-}"
  eval file_path="\${$file_var:-}"
  if [ -z "$val" ] && { [ -z "$file_path" ] || [ ! -f "$file_path" ]; }; then
    echo "[init_mongo] ERROR: $var is required but not provided via env or *_FILE. Aborting init." >&2
    exit 1
  fi
done

# Collect credentials from environment variables
MONGO_ROOT_USERNAME="$(read_secret MONGO_INITDB_ROOT_USERNAME)" || exit 1
MONGO_ROOT_PASSWORD="$(read_secret MONGO_INITDB_ROOT_PASSWORD)" || exit 1
MONGO_DATABASE="$(read_secret MONGO_INITDB_DATABASE)" || exit 1
WEBHOOK_USER="$(read_secret WEBHOOK_DB_USER)" || exit 1
WEBHOOK_PASSWORD="$(read_secret WEBHOOK_DB_PASSWORD)" || exit 1

echo "[init_mongo] Using MongoDB root user: $MONGO_ROOT_USERNAME"
echo "[init_mongo] Using database: $MONGO_DATABASE"
echo "[init_mongo] Using webhook user: $WEBHOOK_USER"

# Wait for MongoDB to be ready
mongosh --host localhost --port 27017 --username "$MONGO_ROOT_USERNAME" --password "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --eval "
  // Create application databases
  db = db.getSiblingDB('$MONGO_DATABASE');
  
  // Create webhook user with read/write access
  db.createUser({
    user: '$WEBHOOK_USER',
    pwd: '$WEBHOOK_PASSWORD',
    roles: [
      {
        role: 'readWrite',
        db: '$MONGO_DATABASE'
      }
    ]
  });

  // Create collections with initial structure
  db.createCollection('webhook_events', {
    validator: {
      \$jsonSchema: {
        bsonType: 'object',
        required: ['event_type', 'payload', 'created_at'],
        properties: {
          event_type: {
            bsonType: 'string',
            description: 'Type of webhook event (e.g., payment.completed, ticket.purchased)'
          },
          payload: {
            bsonType: 'object',
            description: 'Event payload data'
          },
          source: {
            bsonType: 'string',
            description: 'Source of the webhook (e.g., paypal, stripe)'
          },
          status: {
            bsonType: 'string',
            enum: ['pending', 'processed', 'failed'],
            description: 'Processing status'
          },
          created_at: {
            bsonType: 'date',
            description: 'Event creation timestamp'
          },
          processed_at: {
            bsonType: 'date',
            description: 'Event processing timestamp'
          }
        }
      }
    }
  });

  db.createCollection('webhook_logs', {
    validator: {
      \$jsonSchema: {
        bsonType: 'object',
        required: ['webhook_id', 'message', 'level', 'timestamp'],
        properties: {
          webhook_id: {
            bsonType: 'objectId',
            description: 'Reference to webhook event'
          },
          message: {
            bsonType: 'string',
            description: 'Log message'
          },
          level: {
            bsonType: 'string',
            enum: ['info', 'warn', 'error', 'debug'],
            description: 'Log level'
          },
          timestamp: {
            bsonType: 'date',
            description: 'Log timestamp'
          }
        }
      }
    }
  });

  // Create indexes for better performance
  db.webhook_events.createIndex({ 'event_type': 1 });
  db.webhook_events.createIndex({ 'status': 1 });
  db.webhook_events.createIndex({ 'created_at': -1 });
  db.webhook_events.createIndex({ 'source': 1 });
  
  db.webhook_logs.createIndex({ 'webhook_id': 1 });
  db.webhook_logs.createIndex({ 'timestamp': -1 });
  db.webhook_logs.createIndex({ 'level': 1 });

  print('MongoDB initialization completed successfully!');
  print('Created database: $MONGO_DATABASE');
  print('Created user: $WEBHOOK_USER');
  print('Created collections: webhook_events, webhook_logs');
  print('Created indexes for optimal performance');
"

echo "MongoDB initialization script completed!"