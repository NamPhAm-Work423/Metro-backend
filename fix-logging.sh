#!/bin/bash

# Script to fix syslog logging configuration in docker-compose.prod.yml
# Replace all syslog drivers with json-file driver

echo "Fixing syslog logging configuration..."

# Create backup
cp docker-compose.prod.yml docker-compose.prod.yml.backup

# Replace all syslog logging configurations with default logging
sed -i 's/logging:/    logging: \*default-logging/' docker-compose.prod.yml

# Remove syslog-specific lines
sed -i '/driver: syslog/d' docker-compose.prod.yml
sed -i '/syslog-address: "tcp:\/\/127.0.0.1:1514"/d' docker-compose.prod.yml
sed -i '/syslog-format: "rfc5424"/d' docker-compose.prod.yml
sed -i '/tag: ".*"/d' docker-compose.prod.yml
sed -i '/options:/d' docker-compose.prod.yml

echo "Logging configuration fixed!"
echo "Backup saved as docker-compose.prod.yml.backup"
