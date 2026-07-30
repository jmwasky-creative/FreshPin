#!/usr/bin/env sh
set -eu
ENV_FILE="${ENV_FILE:-.env.docker}"
docker compose --env-file "$ENV_FILE" down
