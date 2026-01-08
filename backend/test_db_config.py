import os
from pathlib import Path

# Simulate CI environment
os.environ['DATABASE_URL'] = 'sqlite:///db.sqlite3'
os.environ['SECRET_KEY'] = 'test-key'
os.environ['DJANGO_SETTINGS_MODULE'] = 'api.settings'

BASE_DIR = Path(__file__).resolve().parent

database_url = os.getenv('DATABASE_URL', '')
print(f"DATABASE_URL: '{database_url}'")
print(f"Starts with 'sqlite': {database_url.startswith('sqlite')}")

if database_url.startswith('sqlite'):
    print("✓ Using SQLite")
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    print("✗ Using MySQL")
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.getenv('DB_NAME', 'epitime'),
            'USER': os.getenv('DB_USER', 'epitime_user'),
            'PASSWORD': os.getenv('DB_PASSWORD', 'epitime_pass'),
            'HOST': os.getenv('DB_HOST', 'db'),
            'PORT': os.getenv('DB_PORT', '3306'),
        }
    }

print(f"Database ENGINE: {DATABASES['default']['ENGINE']}")
