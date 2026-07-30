#!/usr/bin/env sh
set -eu

ENV_FILE="${ENV_FILE:-.env.docker}"

if [ ! -f "$ENV_FILE" ]; then
  cp .env.docker.example "$ENV_FILE"
  echo "Created $ENV_FILE. Fill in Supabase and CRON_SECRET values, then run this script again."
  exit 1
fi

if grep -Eq 'YOUR_PROJECT|YOUR_SUPABASE|REPLACE_WITH_A_RANDOM_SECRET' "$ENV_FILE"; then
  echo "$ENV_FILE still contains placeholder values. Edit it before deployment."
  exit 1
fi

docker compose --env-file "$ENV_FILE" up -d --build
docker compose --env-file "$ENV_FILE" ps
