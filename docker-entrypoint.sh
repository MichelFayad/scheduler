#!/bin/sh
set -e

# Apply any pending database migrations before starting the server.
echo "Running prisma migrate deploy..."
./node_modules/.bin/prisma migrate deploy

echo "Starting Next.js server..."
exec node server.js
