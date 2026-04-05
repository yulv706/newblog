#!/bin/bash
set -euo pipefail

echo "=== Blog Init: Installing dependencies ==="
npm install

echo "=== Blog Init: Checking better-sqlite3 native module compatibility ==="
if node -e "const Database=require('better-sqlite3'); const db=new Database(':memory:'); db.close();" >/dev/null 2>&1; then
  echo "better-sqlite3 native module is compatible with current Node runtime"
else
  echo "better-sqlite3 native module mismatch detected, rebuilding..."
  npm rebuild better-sqlite3 --update-binary
fi

node -e "const Database=require('better-sqlite3'); const db=new Database(':memory:'); db.close();" >/dev/null 2>&1

echo "=== Blog Init: Creating persistence directories ==="
mkdir -p data
mkdir -p public/uploads/images

echo "=== Blog Init: Ensuring local environment file ==="
if [ ! -f .env.local ]; then
  AUTH_SECRET="$(openssl rand -base64 32 | tr -d '\n')"
  ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '\n')"
  cat > .env.local << EOF
AUTH_SECRET=${AUTH_SECRET}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=${ADMIN_PASSWORD}
NEXT_PUBLIC_SITE_URL=http://localhost:3100
EOF
  echo "Created .env.local with generated local-only credentials"
  echo "ADMIN_USERNAME=admin"
  echo "ADMIN_PASSWORD=${ADMIN_PASSWORD}"
else
  echo ".env.local already exists, leaving it unchanged"
fi

echo "=== Blog Init: Running database migrations ==="
npx drizzle-kit generate
npx drizzle-kit migrate

echo "=== Blog Init: Complete ==="
