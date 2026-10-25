#!/usr/bin/env bash
# Run a reviewed, trusted bundle on Ubuntu using sudo bash server.sh COMMAND.
# Stop if a required step fails rather than continuing a partial deployment.
set -euo pipefail
# Protect newly created secrets and backups from other unprivileged host users.
umask 077
# Find this bundle's directory, regardless of where the operator runs the script.
directory=$(cd "$(dirname "$0")" && pwd)
# Secrets live outside release directories and are reused across deployments.
config=/etc/cftracker
# Report a blocking problem and stop before further changes are made.
fail() { echo "$*" >&2; exit 1; }
# Always operate on this release's Compose manifest, not an unrelated checkout.
compose() { docker compose -f "$directory/compose.yml" "$@"; }
hostname_valid() {
  # Reject URLs and configuration punctuation before using a hostname in NGINX.
  [[ ${1:-} =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ && $1 == *.* ]] || fail 'Supply a DNS hostname, without URL, port, or path.'
}
nginx_config() {
  hostname_valid "${1:-}"
  # Prepare an HTTP proxy site for the supplied hostname and the local API.
  # IPv4 and IPv6 listeners must route the same hostname, including ACME challenges.
  # Forward only the host proxy's client-IP value, not a client-supplied header.
  cat <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $1;
    access_log off;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
}
backup() {
  # Store database backups in a protected directory outside release bundles.
  local destination temporary
  install -d -m 700 /var/backups/cftracker
  # Give each dump a distinct name so earlier recovery points are preserved.
  destination="/var/backups/cftracker/$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
  temporary="$destination.partial"
  # Export the running database into a custom-format archive on the VPS host.
  # Remove failed dumps so incomplete data cannot be mistaken for a usable backup.
  if ! compose exec -T postgres pg_dump -U postgres -d cftracker -Fc > "$temporary"; then
    rm -f "$temporary"
    fail 'Backup failed; deployment stopped.'
  fi
  # Check the archive's table of contents before marking the backup complete.
  # This detects some archive problems but does not replace a real restore test.
  compose exec -T postgres pg_restore --list < "$temporary" >/dev/null
  mv "$temporary" "$destination"
  echo "Backup: $destination (copy off-server; archive listing is not a restore test)."
}
deploy() {
  cd "$directory"
  # Compare bundle files with recorded checksums before trusting/loading them.
  sha256sum --check SHA256SUMS
  # Require protected configuration and nonempty secret files without printing them.
  [[ $(stat -c %a "$config") == 700 ]] || fail '/etc/cftracker must have mode 700.'
  for file in postgres-password app-password backend.env migration.env; do
    [[ -s $config/$file ]] || fail "Missing configuration: $file"
  done
  # Keep initialization mounts independent of release directories. Preserve the
  # existing copy; changing database initialization is a separate operator task.
  if [[ ! -e $config/init-app-role.sql ]]; then
    install -m 644 "$directory/init-app-role.sql" "$config/init-app-role.sql"
  fi
  cmp -s "$directory/init-app-role.sql" "$config/init-app-role.sql" || fail 'Database initialization SQL differs; review it separately before deployment.'
  # Validate Compose without exposing resolved environment values or secrets.
  compose config --quiet
  # Loading adds images to local Docker; it does not start their containers.
  docker image load -i "$directory/images.tar"
  # Verify that both the API and migration images can run on the amd64 Linux VPS.
  for service in backend migrate; do
    image=$(compose --profile tools config --format json | python3 "$directory/server_helpers.py" image-name "$service")
    [[ $(docker image inspect --format '{{.Os}}/{{.Architecture}}' "$image") == linux/amd64 ]] || fail "Wrong image platform: $image"
  done
  # Do not silently upgrade/restart the database during application releases.
  if ! docker image inspect postgres:14-alpine >/dev/null 2>&1; then
    # Pulling needs registry access; already installed database images are retained.
    compose pull postgres
  fi
  # Confirm PostgreSQL's container user can read the application password before
  # initialization. This temporary check does not launch the database server.
  compose run --rm --no-deps --entrypoint sh postgres -c \
    'gosu postgres test -r /run/secrets/app_password' || fail 'Postgres cannot read app-password; see the runbook.'
  # Create PostgreSQL on first deployment, or retain the existing container on
  # updates, including older installations with a different SQL mount. Wait for
  # readiness before backing up; application updates must not restart the database.
  compose up -d --no-recreate --wait --wait-timeout 90 postgres
  # Take a backup before schema changes. Any backup failure stops this function.
  backup
  echo 'Applying migrations. On failure the old backend is left running; inspect before retrying.'
  # PostgreSQL has already passed readiness. Dependency reconciliation here
  # could otherwise recreate a database container from an older configuration.
  compose run --rm --no-deps migrate
  # Replace only the API after successful migrations; dependency containers stay put.
  compose up -d --no-deps --wait --wait-timeout 90 backend
  # Check the new API directly on localhost and stop if readiness returns an error.
  curl --fail --silent --show-error http://127.0.0.1:8080/health/ready
  printf '\n'
  compose ps
}
# Allow offline tests to exercise deployment orchestration with stubbed commands.
# Loading functions for tests must not start deployments or alter host services.
if [[ ${BASH_SOURCE[0]} != "$0" ]]; then return 0; fi
# Show help by default, or select the requested operation and its arguments.
command=${1:-help}
shift || true
# Allow help and NGINX configuration preview without administrative privileges.
case "$command" in
  help|--help|-h)
    echo 'Commands: init | deploy | backup | check HOST | nginx-config HOST | nginx HOST | https HOST'
    echo 'init prompts for OAuth settings; never use it to rotate existing credentials.'
    exit 0 ;;
  nginx-config) nginx_config "${1:-}"; exit 0 ;;
  init|deploy|backup|check|nginx|https) ;;
  *) fail 'Unknown command; run help.' ;;
esac
# Require administrative privileges for protected files, Docker, and host services.
[[ $EUID == 0 ]] || fail 'Run on the VPS with sudo bash server.sh COMMAND.'
if [[ $command == deploy || $command == backup || $command == init ]]; then
  # Refuse concurrent initialization, deployment, or backup operations. The shared
  # lock is released when this process exits, including after a deployment failure.
  exec 9>/run/lock/cftracker-deploy.lock
  flock -n 9 || fail 'Another CFTracker deployment, backup, or initialization is running.'
fi
case "$command" in
  init)
    # Collect first-installation settings interactively, with the client secret
    # hidden while typing. Do not accept unattended input for secret initialization.
    [[ -t 0 ]] || fail 'init requires an interactive terminal.'
    read -r -p 'Frontend origin (https://...): ' frontend
    read -r -p 'Allowed origins, comma-separated (include localhost if needed): ' origins
    read -r -p 'GitHub OAuth client ID: ' client_id
    read -r -s -p 'GitHub OAuth client secret: ' client_secret
    # Pass settings to the configuration writer without exposing the client secret
    # in command-line arguments.
    printf '\n'
    export frontend origins client_id client_secret
    python3 "$directory/server_helpers.py" init "$config"
    # Remove credentials from the shell's environment after initialization.
    unset frontend origins client_id client_secret ;;
  deploy) deploy ;;
  backup) backup ;;
  check)
    # Check container status, NGINX syntax, direct API readiness, hostname routing,
    # and public IPv4 HTTPS. These commands inspect services but do not reconfigure them.
    hostname_valid "${1:-}"
    compose ps
    nginx -t
    curl --fail --show-error http://127.0.0.1:8080/health/ready
    curl --fail --show-error -H "Host: $1" http://127.0.0.1/health/ready
    curl -4 --fail --show-error "https://$1/health/ready"
    echo 'If an AAAA record exists, also test curl -6 externally. Run certbot renew --dry-run separately.' ;;
  nginx)
    # This creates a NEW HTTP site only. Refusing existing files/symlinks prevents
    # accidentally replacing a working site or Certbot's HTTPS configuration.
    hostname_valid "${1:-}"
    site=/etc/nginx/sites-available/cftracker
    [[ ! -e $site && ! -L $site && ! -e /etc/nginx/sites-enabled/cftracker && ! -L /etc/nginx/sites-enabled/cftracker ]] || fail 'Site exists; edit manually to preserve existing HTTPS configuration.'
    nginx_config "$1" > "$site"
    # NGINX configuration contains no secrets and needs to be readable by the service.
    chmod 644 "$site"
    ln -s "$site" /etc/nginx/sites-enabled/cftracker
    if ! nginx -t; then
      # If validation fails, remove only what this command just created. No reload has
      # happened yet, so NGINX continues using its previously loaded configuration.
      rm /etc/nginx/sites-enabled/cftracker "$site"
      fail 'Validation failed; new site removed and active config left unchanged.'
    fi
    systemctl enable --now nginx
    # Apply the validated site while allowing existing connections to finish.
    systemctl reload nginx ;;
  https)
    # Back up NGINX before Certbot edits it. Both DNS address families must reach
    # this host and its HTTP challenge listener. Certificate issuance needs internet.
    hostname_valid "${1:-}"
    nginx -t
    destination="/etc/nginx.before-certbot-$(date -u +%Y%m%dT%H%M%SZ)-$$"
    cp -a /etc/nginx "$destination"
    echo "NGINX backup: $destination. DNS A/AAAA must reach this server; ports 80/443 must be open."
    certbot --nginx -d "$1" --redirect
    # Certbot installs TLS and an HTTP redirect. Validate again and simulate renewal;
    # a dry run tests the renewal procedure without replacing the production certificate.
    nginx -t
    certbot renew --dry-run ;;
esac
