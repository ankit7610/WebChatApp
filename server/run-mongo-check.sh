#!/usr/bin/env bash
set -e

HOST="chatapp.hmydbuc.mongodb.net"

echo
echo "1) SRV record for _mongodb._tcp.$HOST:"
nslookup -type=SRV _mongodb._tcp.$HOST || true

echo
echo "2) A/NS lookup for $HOST:"
nslookup $HOST || true

echo
echo "3) Running node test script (may take a few seconds):"

URI=$(grep '^MONGODB_URI=' server/.env | sed 's/^MONGODB_URI=//')

if [ -z "$URI" ]; then
  echo "ERROR: MONGODB_URI not found in server/.env"
  exit 2
fi

MASKED=$(echo "$URI" | sed -E 's#(mongodb\+srv://[^:]+:)[^@]+(@.*)#\1****\2#')
echo "Using URI: $MASKED"

node server/test-conn.mjs "$URI"
