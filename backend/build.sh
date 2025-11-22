#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status.
set -o errexit

echo "--- Running Collectstatic ---"
python manage.py collectstatic --no-input

echo "--- Running Migrations ---"
python manage.py migrate
