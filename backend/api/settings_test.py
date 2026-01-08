"""
Test-specific Django settings.
This file is used by pytest to override database settings for testing.
"""
from .settings import *  # noqa: F403, F401

# Force SQLite for all tests
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",  # Use in-memory database for faster tests
    }
}
