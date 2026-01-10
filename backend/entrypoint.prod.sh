#!/bin/sh

echo "Waiting for MariaDB..."
until nc -z db 3306; do
  sleep 1
done
echo "MariaDB is ready."

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start Gunicorn
echo "Starting Gunicorn..."
exec gunicorn api.wsgi:application --bind 0.0.0.0:8000
