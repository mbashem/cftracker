#!/usr/bin/env bash
# Operator-run entry point for updating an existing VPS from the build machine.
# No inventory or credentials are stored here; SSH uses the operator's own setup.
set -Eeuo pipefail
umask 077
root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)

# Emit the operator-facing failure and terminate before any later deployment stage.
fail() { echo "$*" >&2; exit 1; }

# Execute one named VPS stage with validated arguments; preflight emits the PostgreSQL container ID.
remote_stage() {
  # Arguments have been validated before being placed in SSH's remote command.
  # The quoted script runs on the VPS; archives never pass through a terminal.
  ssh -T -o BatchMode=yes "$ssh_target" bash -se -- \
    "$1" "$release" "$hostname" "${postgres_id:-not-recorded}" <<'REMOTE'
set -euo pipefail
stage=$1
release=$2
hostname=$3
expected_postgres=$4
upload="$HOME/cftracker-upload-$release"
destination="/srv/cftracker/releases/$release"
# Reject existing paths, including dangling symlinks, before reserving deployment destinations.
new_path() {
  [[ ! -e $1 && ! -L $1 ]] || { echo "Destination already exists: $1" >&2; exit 1; }
}
# Identify the existing database container so later stages can reject unexpected replacement.
postgres_id() {
  sudo -n docker inspect --format '{{.Id}}' cftracker-postgres-1
}
case "$stage" in
  preflight)
    # Require noninteractive sudo before starting a binary backup stream.
    sudo -n true
    sudo -n docker compose version >&2
    python3 --version >&2
    df -h / >&2
    new_path "$upload"
    sudo -n test ! -e "$destination"
    sudo -n test ! -L "$destination"
    [[ $(sudo -n stat -c %a /etc/cftracker) == 700 ]]
    for file in postgres-password app-password backend.env migration.env; do
      sudo -n test -s "/etc/cftracker/$file"
    done
    [[ $(sudo -n docker inspect --format '{{.State.Health.Status}}' cftracker-postgres-1) == healthy ]]
    # Keep stdout limited to the ID captured by the local script.
    postgres_id ;;
  reserve)
    # Atomic creation prevents merging a new upload into an existing directory.
    mkdir -m 700 "$upload" ;;
  install)
    cd "$upload"
    sha256sum --check SHA256SUMS
    sudo -n mkdir -p /srv/cftracker/releases
    sudo -n mkdir "$destination"
    sudo -n cp -a . "$destination/" ;;
  deploy)
    [[ $(postgres_id) == "$expected_postgres" ]]
    cd "$destination"
    # The local script reaches this stage only after verifying the local archive.
    sudo -n bash server.sh deploy --local-backup-confirmed ;;
  verify)
    [[ $(postgres_id) == "$expected_postgres" ]]
    [[ $(sudo -n docker inspect --format '{{.Config.Image}}' cftracker-backend-1) == "cftracker-backend:$release" ]]
    sudo -n bash "$destination/server.sh" check "$hostname" ;;
  *) echo 'Unknown update stage.' >&2; exit 2 ;;
esac
REMOTE
}

# Build the selected release through the maintained bundle entry point.
build_bundle() {
  # Reuse the maintained image builder rather than maintaining a second build path.
  bash "$root/backend/deploy/vps/bundle.sh" "$release" "$bundle"
}

# Exclusively stream a local dump, validate its archive index, then publish the retained backup.
save_local_backup() {
  # Exclusive creation preserves earlier successful dumps and failed partial files.
  set -C
  ssh -T -o BatchMode=yes "$ssh_target" \
    'sudo -n docker exec cftracker-postgres-1 pg_dump -U postgres -d cftracker -Fc' \
    > "$backup.partial"
  [[ -s $backup.partial ]] || fail 'Database export was empty; deployment stopped.'
  # The existing PostgreSQL container inspects the stream. No dump is saved there.
  ssh -T -o BatchMode=yes "$ssh_target" \
    'sudo -n docker exec -i cftracker-postgres-1 pg_restore --list >/dev/null' \
    < "$backup.partial"
  ln "$backup.partial" "$backup"
  rm "$backup.partial"
  echo "Verified local backup: $backup"
}

# Validate operator input and coordinate preflight, build, upload, backup, deployment, and verification.
main() {
  if [[ ${1:-} == --help || ${1:-} == -h ]]; then
    echo 'Usage: bash backend/deploy/vps/update.sh SSH_TARGET API_HOSTNAME RELEASE'
    echo 'Runs build, upload, local database backup, migrations, replacement, and health checks.'
    echo 'Requires an existing installation, Docker Desktop, SSH key access, and noninteractive sudo.'
    echo 'Optional: CFTRACKER_BUILD_ROOT and CFTRACKER_BACKUP_DIR (local, outside cloud sync).'
    return 0
  fi
  [[ $# == 3 ]] || fail 'Supply SSH_TARGET, API_HOSTNAME, and a fresh RELEASE; see --help.'
  ssh_target=$1
  hostname=$2
  release=$3
  # Restrict values that SSH serializes into remote shell commands. Use an SSH
  # alias for custom ports or IPv6 addresses instead of adding shell options here.
  [[ $ssh_target =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]*(@[a-zA-Z0-9_][a-zA-Z0-9_.-]*)?$ ]] || fail 'Use an SSH alias or USER@HOST without extra options.'
  [[ $hostname =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ && $hostname == *.* ]] || fail 'Use a DNS hostname without URL, port, or path.'
  [[ $release =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$ && $release != latest ]] || fail 'Use a specific Docker tag, not latest.'
  for dependency in bash docker python3 ssh scp shasum git; do
    command -v "$dependency" >/dev/null || fail "Missing dependency: $dependency"
  done
  # Defaults match the manual workflow. Local backups must stay outside cloud sync.
  build_root=${CFTRACKER_BUILD_ROOT:-"$HOME/Builds/cftracker"}
  backup_directory=${CFTRACKER_BACKUP_DIR:-"$HOME/Backups/cftracker"}
  bundle=$(python3 "$root/backend/deploy/vps/bundle_helpers.py" resolve-path "$build_root/$release")
  backup_directory=$(python3 "$root/backend/deploy/vps/bundle_helpers.py" resolve-path "$backup_directory")
  case "$backup_directory/" in
    "$root/"*) fail 'Keep database backups outside the repository and cloud-synced directories.' ;;
  esac
  backup="$backup_directory/$release.dump"
  [[ ! -e $bundle && ! -L $bundle ]] || fail 'Bundle destination exists; choose a fresh release.'
  [[ ! -e $backup && ! -L $backup && ! -e $backup.partial && ! -L $backup.partial ]] || fail 'Backup destination exists; choose a fresh release.'
  python3 "$root/backend/deploy/vps/bundle_helpers.py" prepare-backup-directory "$backup_directory"
  # Keep failed artifacts for diagnosis. Never delete prior releases or roll back
  # automatically after a migration or replacement failure.
  trap 'echo "Update stopped. Keep any local backup/partial file and inspect the failure before retrying." >&2' ERR
  echo 'Building the working tree; dependency downloads may occur. Review source and migrations before running this command.'
  echo 'Deployment may briefly disconnect API requests. No automatic rollback is performed.'
  postgres_id=$(remote_stage preflight)
  [[ $postgres_id =~ ^[a-f0-9]{12,64}$ ]] || fail 'Could not identify the existing PostgreSQL container.'
  echo "Preserving PostgreSQL container: $postgres_id"
  mkdir -p "$build_root"
  build_bundle
  (
    cd "$bundle"
    shasum -a 256 -c SHA256SUMS
  )
  cat "$bundle/BUILD.txt"
  remote_stage reserve
  scp -r "$bundle/." "$ssh_target:cftracker-upload-$release/"
  remote_stage install
  save_local_backup
  remote_stage deploy
  remote_stage verify
  echo "Release deployed: $release"
  echo "PostgreSQL container preserved: $postgres_id"
  echo "Keep the verified local backup: $backup"
  echo 'Still required: browser login/list smoke tests, published IPv6 checks, and certificate-renewal testing.'
}

# Importing functions for isolated tests does not start an update.
if [[ ${BASH_SOURCE[0]} == "$0" ]]; then main "$@"; fi
