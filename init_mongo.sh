#!/bin/bash

# MongoDB Initialization Script
# This script runs when MongoDB container starts for the first time

echo "Starting MongoDB initialization..."

# Wait for MongoDB to be ready
mongosh --host localhost --port 27017 --username admin --password mongopass123 --authenticationDatabase admin --eval "
  // Create application databases
  db = db.getSiblingDB('webhook_db');
  
  // Create webhook user with read/write access
  db.createUser({
    user: 'webhook_user',
    pwd: 'webhook_pass123',
    roles: [
      {
        role: 'readWrite',
        db: 'webhook_db'
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
  print('Created database: webhook_db');
  print('Created user: webhook_user');
  print('Created collections: webhook_events, webhook_logs');
  print('Created indexes for optimal performance');
"

echo "MongoDB initialization script completed!"