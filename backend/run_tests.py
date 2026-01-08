import os
import subprocess
import sys

os.environ["DJANGO_SETTINGS_MODULE"] = "api.settings"
os.environ["SECRET_KEY"] = "test-secret-key-for-ci"
os.environ["DATABASE_URL"] = "sqlite:///db.sqlite3"

result = subprocess.run(
    [sys.executable, "-m", "pytest", "--no-header", "-q", "--tb=short"], capture_output=True, text=True
)

print(result.stdout)
print(result.stderr)
sys.exit(result.returncode)
