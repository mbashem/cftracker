"""Local release preparation used by bundle.sh; no Docker or network access."""
import argparse
import hashlib
from pathlib import Path
import re


def render_compose(root, output, release):
    """Convert the production manifest to use the release's prebuilt images."""
    text = (root / "compose.production.yml").read_text()
    # Fail visibly if the source manifest changes instead of shipping a partial edit.
    for target in ("backend", "migration"):
        pattern = rf"    build:\n      context: ./backend\n      dockerfile: dockerfile\n      target: {target}\n"
        replacement = f"    image: cftracker-{target}:{release}\n    pull_policy: never\n"
        text, count = re.subn(pattern, replacement, text)
        if count != 1:
            raise SystemExit("Production build layout changed; update bundle_helpers.py before deploying.")
    # Keep the database mount stable across release directories.
    old = "./backend/deploy/init-app-role.sql:"
    if text.count(old) != 1:
        raise SystemExit("Production SQL mount changed; update bundle_helpers.py before deploying.")
    (output / "compose.yml").write_text(
        text.replace(old, "/etc/cftracker/init-app-role.sql:")
    )


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
    args = parser.parse_args()
    if args.command == "resolve-path":
        print(args.path.resolve())
    elif args.command == "render-compose":
        render_compose(args.root, args.output, args.release)
    else:
        write_checksums(args.directory)


if __name__ == "__main__":
    main()
