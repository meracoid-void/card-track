#!/bin/bash

# Setup environment variables for Angular build
# This script is run by Netlify before the build

# Create environment file from Netlify environment variables
cat > src/environments/environment.prod.ts <<EOF
export const environment = {
  production: true,
  supabase: {
    url: '$SUPABASE_URL',
    anonKey: '$SUPABASE_ANON_KEY',
  },
  bypassAuth: false,
  justTcgApiKey: '$JUSTTCG_API_KEY',
};
EOF

echo "Environment variables injected successfully"
