#!/bin/bash
set -e

echo "=== Blog Init: Installing dependencies ==="
npm install

echo "=== Blog Init: Creating data directory ==="
mkdir -p data
mkdir -p public/uploads/images

echo "=== Blog Init: Setting up environment ==="
if [ ! -f .env.local ]; then
  AUTH_SECRET=$(openssl rand -base64 32)
  cat > .env.local << EOF
AUTH_SECRET=${AUTH_SECRET}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
NEXT_PUBLIC_SITE_URL=http://localhost:3100
EOF
  echo "Created .env.local with default credentials (admin/admin123)"
else
  echo ".env.local already exists, skipping"
fi

echo "=== Blog Init: Running database migrations ==="
npx drizzle-kit generate 2>/dev/null || true
npx drizzle-kit migrate 2>/dev/null || true

echo "=== Blog Init: Complete ==="
