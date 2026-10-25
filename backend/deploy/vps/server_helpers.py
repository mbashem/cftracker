"""Configuration and Compose JSON handling used by server.sh on the VPS."""
import argparse
import json
import os
from pathlib import Path
import re
import secrets
import sys
from urllib.parse import urlsplit


def validate_origin(value):
    """Accept only origins that are safe to write into an environment file."""
    url = urlsplit(value)
    if (url.scheme not in ("http", "https") or not url.netloc or url.path
            or url.query or url.fragment or url.username or url.password):
        raise SystemExit("Origins must be HTTP(S) scheme and host, with no trailing slash or path.")
    if any(c.isspace() for c in value) or "$" in value:
        raise SystemExit("Invalid origin.")


def initialize_config(directory):
    """Create first-installation credentials, refusing existing secret files."""
    # Protect files even when this helper is invoked separately from server.sh.
    os.umask(0o077)
    frontend, origins = os.environ["frontend"], os.environ["origins"]
    validate_origin(frontend)
    for value in origins.split(","):
        validate_origin(value)
    for key in ("client_id", "client_secret"):
        if not re.fullmatch(r"[A-Za-z0-9_-]+", os.environ[key]):
            raise SystemExit("Invalid or empty OAuth credential.")
    names = ("postgres-password", "app-password", "backend.env", "migration.env")
    directory.mkdir(mode=0o700, exist_ok=True)
    directory.chmod(0o700)
    if any((directory / name).exists() for name in names):
        raise SystemExit("Configuration already exists; edit it manually. No secrets were replaced.")
    # Generate independent credentials; hex passwords need no URL percent-encoding.
    admin, app = secrets.token_hex(32), secrets.token_hex(32)
    contents = {
        "postgres-password": admin + "\n",
        "app-password": app + "\n",
        "migration.env": f"MIGRATION_DATABASE_URL=postgres://postgres:{admin}@postgres:5432/cftracker?sslmode=disable\n",
        "backend.env": f"DATABASE_URL=postgres://cftracker_app:{app}@postgres:5432/cftracker?sslmode=disable\n"
            f"JWT_SECRET={secrets.token_urlsafe(32)}\n"
            f'GITHUB_CLIENT_ID={os.environ["client_id"]}\n'
            f'GITHUB_CLIENT_SECRET={os.environ["client_secret"]}\n'
            f"GITHUB_REDIRECT_URL={frontend}/callback/auth-gh\n"
            f"CORS_ALLOWED_ORIGINS={origins}\nTRUSTED_PROXIES=\n",
    }
    for name, content in contents.items():
        with (directory / name).open("x") as file:
            file.write(content)
    # PostgreSQL's container user must read this mount. The host parent stays 0700.
    (directory / "app-password").chmod(0o644)
    print("Configuration created. Confirm OAuth callback in GitHub; proxy trust is still pending.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    initialize = commands.add_parser("init")
    initialize.add_argument("directory", type=Path)
    image = commands.add_parser("image-name")
    image.add_argument("service")
    args = parser.parse_args()
    if args.command == "init":
        initialize_config(args.directory)
    else:
        # Read resolved Compose data privately and print only the requested image.
        print(json.load(sys.stdin)["services"][args.service]["image"])


if __name__ == "__main__":
    main()
