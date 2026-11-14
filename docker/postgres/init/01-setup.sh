#!/bin/sh
# Runs once, when the database volume is created. Creates the role the backend connects with and a
# separate database for the integration tests. The schema itself is created by the migrations.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_password="$WILDHAND_APP_PASSWORD" <<'SQL'
CREATE ROLE wildhand_app LOGIN PASSWORD :'app_password';
CREATE DATABASE wildhand_test;
SQL
