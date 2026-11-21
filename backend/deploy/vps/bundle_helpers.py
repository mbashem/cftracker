"""Local release preparation used by bundle.sh; no Docker or network access."""
import argparse
import hashlib
import os
from pathlib import Path
import re
import stat

def render_compose(text, release):
    """Return an image-only manifest from source text without accessing files."""
    # Fail visibly if the source manifest changes instead of shipping a partial edit.
    for target in ("backend", "migration"):
        pattern = rf"    build:\n      context: \.\n      dockerfile: dockerfile\n      target: {target}\n"
        replacement = f"    image: cftracker-{target}:{release}\n    pull_policy: never\n"
        text, count = re.subn(pattern, replacement, text)
        if count != 1:
            raise SystemExit("Production build layout changed; update bundle_helpers.py before deploying.")
    # Keep the database mount stable across release directories.
    old = "./deploy/init-app-role.sql:"
    if text.count(old) != 1:
        raise SystemExit("Production SQL mount changed; update bundle_helpers.py before deploying.")
    return text.replace(old, "/etc/cftracker/init-app-role.sql:")

def write_checksums(directory):
    """Record transfer-integrity checks without loading large images into RAM."""
    with (directory / "SHA256SUMS").open("w") as manifest:
        for path in sorted(directory.iterdir()):
            if path.name == "SHA256SUMS":
                continue
            digest = hashlib.sha256()
            with path.open("rb") as source:
                for chunk in iter(lambda: source.read(1024 * 1024), b""):
                    digest.update(chunk)
            manifest.write(f"{digest.hexdigest()}  {path.name}\n")

def prepare_backup_directory(directory):
    """Create a private backup directory or check an existing one without changing it."""
    try:
        directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        metadata = directory.stat()
    except OSError as error:
        raise SystemExit(f"Could not prepare backup directory {directory}: {error.strerror}") from None
    if metadata.st_uid != os.geteuid() or stat.S_IMODE(metadata.st_mode) != 0o700:
        raise SystemExit(f"Backup directory must be owned by you with mode 700. Choose a private directory: {directory}")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    resolve = commands.add_parser("resolve-path")
    resolve.add_argument("path", type=Path)
    render = commands.add_parser("render-compose")
    render.add_argument("root", type=Path)
    render.add_argument("output", type=Path)
    render.add_argument("release")
    checksums = commands.add_parser("checksums")
    checksums.add_argument("directory", type=Path)
    backup = commands.add_parser("prepare-backup-directory")
    backup.add_argument("directory", type=Path)
    args = parser.parse_args()
    if args.command == "resolve-path":
        print(args.path.resolve())
    elif args.command == "render-compose":
        source = (args.root / "backend" / "compose.production.yml").read_text()
        (args.output / "compose.yml").write_text(render_compose(source, args.release))
    elif args.command == "checksums":
        write_checksums(args.directory)
    else:
        prepare_backup_directory(args.directory)

if __name__ == "__main__":
    main()
