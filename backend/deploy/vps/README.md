# Ubuntu VPS runbook

This public runbook documents a repeatable Ubuntu VPS deployment. All deployment
addresses, domains, usernames, and release labels below are placeholders. Replace
`VPS_HOST`, `VPS_IPV4`, `VPS_IPV6`, and `DEPLOY_USER` with your own values locally;
keep the real inventory, credentials, and verification results outside the repo.
Run **Mac** commands locally; run **VPS** commands only after SSH login.

The deployment uses host NGINX, Docker Compose, two locally built `linux/amd64`
images, and private PostgreSQL. The VPS needs no source checkout or registry
credentials. Compose project `cftracker` owns the persistent database volume;
configuration lives in `/etc/cftracker`, outside application files and images.

The workflow covers SSH key access, updates, firewall rules, local image transfer,
database initialization/migrations, NGINX, DNS, IPv6, and HTTPS. It incorporates
lessons from setup failures without recording a live server's inventory. Scripts
are operator tools: they do not run until invoked and do not change DNS, SSH, or
Cloudflare settings for you.

Verify public HTTPS on both published IP families, certificate renewal, frontend
configuration, OAuth, off-server backups/restoration, and trusted proxies for each
installation. Never treat documentation as evidence that those checks passed.

```text
Client -> DNS -> host NGINX :443 -> 127.0.0.1:8080 -> Go API
                                                       |
                                               private PostgreSQL
```

## 1. First login, key access, and recovery

**Mac:** `ssh DEPLOY_USER@VPS_HOST`. Verify the initial host fingerprint through
a trusted channel when possible. The first login forced a password change;
`Authentication token manipulation error` occurred during that step. At the
current-password prompt use the original password, then enter the new password
twice. Repeated failure requires diagnosis/recovery, not repeated guessing.

**VPS:** inspect the installation:

```sh
whoami
cat /etc/os-release
free -h
df -h /
```

**Mac:** reuse an existing suitable SSH key or create one without overwriting it:

```sh
ls ~/.ssh/*.pub
ssh-keygen -t ed25519
cat ~/.ssh/id_ed25519.pub | ssh DEPLOY_USER@VPS_HOST 'umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys'
ssh -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no DEPLOY_USER@VPS_HOST
```

Keep private keys on the Mac. The public `.pub` file goes on the server. Protect
the private key with a passphrase; store account passwords/recovery codes safely.

**Recovery:** keep the old SSH session open during access changes. Verify that
OVHcloud's VPS KVM/console allows OS-account password login before relying on it.
OVHcloud Shell is an account-management terminal, not the VPS KVM. A console
bypasses SSH/network firewall problems, but still needs OS login credentials.
Disabling SSH passwords does not disable console password login. If SSH keys and
OS password are both lost, use the account's rescue boot flow, mount the system
disk, repair `authorized_keys` or reset the OS password, then return to normal
boot. Rescue involves downtime; reinstall/rebuild can erase data. Exact dashboard
labels and recovery credentials were not independently verified. Disk encryption
keys cannot be replaced by account access.

## 2. Ubuntu updates, SSH hardening, and UFW

**VPS:** updates can restart services. Reboots interrupt all services and SSH.
Verify a second key-only login and recovery access before rebooting.

```sh
sudo apt update
sudo apt upgrade
test -f /var/run/reboot-required && cat /var/run/reboot-required
# Only if required, at a suitable time:
sudo reboot
```

Reconnect and confirm key login. Create
`/etc/ssh/sshd_config.d/00-local-security.conf` with:

```text
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
```

```sh
sudo sshd -t
# Continue only after validation succeeds:
sudo systemctl reload ssh
sudo sshd -T | grep -E '^(pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication|permitrootlogin) '
```

Test another key-only login before closing the old session. Settings may be
overridden by earlier configuration or Match blocks; inspect effective settings
instead of assuming the file took effect. To undo this particular change, remove
only the new file, validate, and reload from the retained session or console.

Before enabling UFW, run `echo "$SSH_CONNECTION"`: the last number is the server
SSH port. The following assumes it is **22**; substitute the actual port:

```sh
sudo apt install ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Keep a session open and test a new connection. If blocked, repair rules through
the old session or console; `sudo ufw disable` is a temporary recovery measure
that removes firewall protection. When adding IPv6, confirm UFW covers IPv6 too.
Docker-published ports can bypass UFW: never rely on UFW to hide database ports.

## 3. Install runtime and proxy

**VPS:** check existing listeners before starting NGINX. Installation may start a
public default welcome page. These packages require Ubuntu repository access.

```sh
sudo ss -ltnp '( sport = :80 or sport = :443 )'
sudo apt update
sudo apt install docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
sudo systemctl enable --now docker nginx
sudo docker version
sudo docker compose version
sudo nginx -t
```

Do not add users to the Docker group casually; it provides effective root access.
This workflow uses `sudo` instead. The server scripts require Bash, Python 3,
OpenSSL-independent Python secret generation, curl, and standard Ubuntu utilities;
install `python3` and `curl` if absent. No Go compiler is needed on the VPS.

## 4. Build and transfer a release

**Mac, repository root:** Docker Desktop must be running, with buildx available;
Python 3 is required. Review the code first. Builds contact image registries and
Go dependency servers, consume disk, and may be slow under Apple Silicon emulation.
Choose a new tag per release. The build uses working-tree content; `BUILD.txt`
records its commit and dirty status, not a guarantee of a clean checkout.

```sh
bash backend/deploy/vps/bundle.sh release-001 /tmp/cftracker-release-001
scp -r /tmp/cftracker-release-001 DEPLOY_USER@VPS_HOST:~/
```

The bundle contains two amd64 images in `images.tar`, image-only `compose.yml`,
initialization SQL, `server.sh`, its `server_helpers.py` companion, this runbook,
build metadata, and SHA-256 checksums. Keep the server script and its Python
companion together. Local preparation logic lives separately in
`bundle_helpers.py`; neither Bash script embeds Python source.
The SQL is installed at the stable host path `/etc/cftracker/init-app-role.sql`;
the database mount does not change when the release directory changes.
No production secrets or full checkout are transferred. The build still uses
the backend directory as Docker context; keep secrets outside that directory.

**VPS:** verify the trusted upload, then install into a new release directory:

```sh
cd ~/cftracker-release-001
sha256sum --check SHA256SUMS
sudo mkdir -p /srv/cftracker/releases
# Destination must not exist. Do not overwrite a previous release:
sudo test ! -e /srv/cftracker/releases/release-001 && sudo cp -a . /srv/cftracker/releases/release-001
cd /srv/cftracker/releases/release-001
```

Checksums detect accidental transfer changes, not a malicious replacement of both
bundle and manifest. SSH provides transport authentication. Never run an
untrusted `server.sh` as root. Keep the same Compose project name `cftracker`:
all release directories intentionally manage the same services and volume.

## 5. Configure secrets (new installation only)

**Existing deployed VPS: skip `init`.** Existing secrets are preserved; no
rotation or reinitialization is needed to adopt the release-bundle scripts.

For a fresh VPS, inside the release directory:

```sh
sudo bash server.sh init
```

Supply frontend origin, comma-separated allowed origins, and OAuth credentials
at the prompts. Secret input is hidden. Example origins:

```text
https://frontend.example.com,https://preview.example.com,http://localhost:5173
```

No trailing slash or path in origins. Add `http://127.0.0.1:5173` only if used.
CORS is browser policy, not authorization; local frontend writes hit production.
`GITHUB_REDIRECT_URL` is the chosen frontend origin plus `/callback/auth-gh`.
Configure the exact callback in the GitHub OAuth app. One callback does not
automatically return users to every allowed frontend origin; use a separate
development OAuth/backend configuration for complete local login testing.

The initializer refuses to replace any of the four existing files. It generates
independent administrator/application passwords and JWT secret. `/etc/cftracker`
must remain `700`; `postgres-password`, `backend.env`, and `migration.env` are
`600`. **`app-password` must be `644`** so PostgreSQL's container user can read
the bind-mounted Compose secret during SQL initialization. Parent-directory
permissions prevent other unprivileged host users from accessing it. Only mount
this file into PostgreSQL; root/Docker administrators can still access secrets.
Compose file-backed secrets are not an encrypted secret store.

During the original deployment the application secret was initially `600`, and
an isolated read check failed. It was changed to `644` before database startup.
For an existing installation, inspect modes without printing secrets:

```sh
sudo stat -c '%a %n' /etc/cftracker /etc/cftracker/*
```

Do not regenerate database passwords after initialization: file changes do not
update PostgreSQL roles. Changing the JWT secret invalidates existing sessions.
Edit config with `sudo nano /etc/cftracker/backend.env`; never paste secrets into
logs/chat or run Compose config without `--quiet` (it can print environment data).

## 6. Deploy or update

Inside the installed release directory:

```sh
sudo bash server.sh deploy
```

This verifies checksums/configuration, loads the local images, checks amd64 image
platforms, pulls the PostgreSQL 14 image only if missing locally, checks secret
readability, starts/waits for PostgreSQL without recreating an existing database
container, backs up the database, runs migrations without reconciling dependency
containers, and starts/waits for the backend. It never deletes volumes, prunes images, rotates
secrets, or automatically rolls back a failed migration. Use only one operator at
a time. The script locks deployment, backup, and initialization against each
other. A failed deployment is not automatically undone; inspect before retrying.

Existing database containers are preserved even if their original configuration
differs from the new manifest. Database configuration/image changes therefore
require a separate maintenance operation with a backup taken first. The stable
SQL copy is created if absent; differing SQL is rejected for separate review.
Its `644` mode is safe only while `/etc/cftracker` remains `700`; it contains
initialization statements, not embedded passwords.

Backups use `pg_dump -Fc` into root-protected `/var/backups/cftracker`; partial
dump failures stop deployment, and archives are listed with `pg_restore --list`
before completion. Even first deployment backs up the newly initialized database
before migrations. Backups are initially **on the same VPS**, and need off-server
copies and real restore tests. Disk use grows: plan retention and check `df -h /`.

**Update risks:** existing backend traffic continues during migrations. Only use
this command for migrations compatible with the running version. For incompatible
changes, schedule maintenance and stop the backend first. Container replacement
can briefly interrupt traffic. Keep previous release directories/images. Do not
change PostgreSQL major versions by changing a tag; that requires a separate
database upgrade. PostgreSQL minor/security image updates also need planned
pull/recreation and verification; application deployment does not fetch them
automatically when the image is already present. The PostgreSQL version here mirrors the existing deployment,
not a newly researched support recommendation.

The API does not migrate itself. Readiness checks connectivity, not schema state.
One backend instance is required while rate limits and verification tokens are
process-local. If initialization partially fails, inspect logs and role/schema
state; do not delete a volume containing retained data to retry initialization.

```sh
sudo docker compose ps
sudo docker compose logs --tail=100 postgres backend
curl -i http://127.0.0.1:8080/health/ready
sudo ss -ltnp
```

Expect healthy containers, backend published only at `127.0.0.1:8080`, no host
database port, and public NGINX/SSH ports. `5432/tcp` alone is not a published
port. Restart policy handles exited processes, not an unhealthy-but-running API.

## 7. NGINX, DNS, IPv6, and HTTPS

For a **new** NGINX site:

```sh
# Preview the full configuration without writing it (no sudo needed):
bash server.sh nginx-config api.example.com
sudo bash server.sh nginx api.example.com
```

This installs both `listen 80` and `listen [::]:80`, validates, then reloads. It
refuses to overwrite an existing site, especially one modified by Certbot.
On an existing VPS, leave the working HTTPS site intact. Access logging is off
to avoid OAuth codes/query strings in access logs. See `backend/LOGGING.md` before
enabling logging; other logs still require access controls and retention.

The original temporary hostname was `cftracker.test`. Routing was tested before
DNS using `curl -H 'Host: cftracker.test' http://127.0.0.1/health/ready`. A 502 was
expected before the API started. After changing `server_name` to the real hostname,
one request immediately after reload returned 404; a later request returned 200.
Always validate config and allow reload to settle before investigating a retry.

**Cloudflare DNS, zone `example.com`:**

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| A | `api` | `VPS_IPV4` | DNS only during setup |
| AAAA | `api` | `VPS_IPV6` | DNS only, with working IPv6 listener/routing/firewall |

Do not overwrite unrelated records. An A record is IPv4, AAAA is IPv6, and CNAME
aliases a hostname (no scheme, slash, port, or path). Proxied records return
Cloudflare edge addresses rather than the origin. Those results alone do not mean
DNS is broken. During setup, switch to DNS only and wait for cached TTL expiry.
One local resolver returned a malformed packet; querying a specific resolver
helped inspect the actual answers. **Mac** checks:

```sh
dig @1.1.1.1 api.example.com A +noall +comments +answer
dig @1.1.1.1 api.example.com AAAA +noall +comments +answer
```

For IPv6 diagnostics, **VPS** `ip -6 addr show scope global` must match the AAAA
address. `ip` is not a standard macOS command. A sudo prompt on the Mac expects
the Mac password; on the VPS it expects the VPS account password when required.

Certificate issuance initially failed with a 404 at the VPS IPv6 address: the
site had no IPv6 listener and requests could reach the default site. Adding
`listen [::]:80;` fixed routing. Verify before retrying certificate requests:

```sh
curl --noproxy '*' -g -i -H 'Host: api.example.com' 'http://[::1]/health/ready'
sudo nginx -t
sudo bash server.sh https api.example.com
```

The HTTPS command backs up `/etc/nginx`, invokes interactive Certbot with the
HTTP-to-HTTPS redirect, and tests renewal. DNS must reach this server on both
published IP families and port 80 must be public for HTTP validation. Certificate
requests contact Let's Encrypt; do not retry failures blindly due to rate limits.
`.app` is HTTPS-required in browsers: browser failure before certificates exist
does not prove DNS failure. Never bypass TLS errors with `curl -k` as verification.

```sh
curl -4 -i https://api.example.com/health/ready
curl -6 -i https://api.example.com/health/ready
sudo certbot renew --dry-run
systemctl list-timers --all | grep certbot
```

Review Certbot edits with `sudo diff -ru /etc/nginx.before-certbot-TIMESTAMP /etc/nginx`
(use the actual backup path printed by the script). Do not overwrite Certbot's
HTTPS site by reinstalling the HTTP-only template. For now keep Cloudflare DNS
only. Enabling proxying later requires a deliberate TLS/trusted-proxy review;
use origin certificate validation, not an HTTP-origin/Flexible workaround.

## 8. Frontend and trusted proxies

Set Netlify build environment and redeploy:

```dotenv
VITE_BACKEND_API_URL=https://api.example.com/api
VITE_IS_BACKEND_AVAILABLE=true
```

The frontend adds `/v1`. Add the custom frontend domain through Netlify before
creating Cloudflare CNAME `cftracker -> YOUR_SITE.netlify.app`, DNS only. A CNAME
is not an HTTP redirect, but Netlify's primary-domain policy may redirect the
original `.netlify.app` URL. If both addresses must remain independently usable,
use separate Netlify sites deploying the same repository. Verify final frontend
domain and OAuth behavior independently.

NGINX replaces forwarded client-IP headers with `$remote_addr`, sets Host and
`X-Forwarded-Proto`, and proxies only to localhost. The API still needs
`TRUSTED_PROXIES` set to the **actual proxy source address seen in the container**.
Inspect the current Docker gateways and request logs; a gateway candidate alone
does not prove which source address is observed:

```sh
sudo docker network inspect cftracker_database cftracker_outbound
curl -i -H 'Host: api.example.com' http://127.0.0.1/health/live
sudo docker compose logs --tail=20 backend
```

Before trusting proxies, the logged client IP can identify the observed peer.
Configure that exact address (or a justified narrow CIDR), not `0.0.0.0/0`, `::/0`,
or a broad private range. Recheck after networking changes. In the **active release
directory**, recreate after env changes:

```sh
sudo docker compose up -d --no-deps --force-recreate backend
```

This briefly interrupts traffic; `restart` alone does not reload env-file values.
Verify the readiness response and actual client-IP behavior, then smoke-test
GitHub login, profile, lists, and Codeforces verification through HTTPS.

## 9. Routine operations, rollback, and additional backends

```sh
# Run in the active release directory:
sudo bash server.sh check api.example.com
sudo bash server.sh backup
sudo docker compose exec postgres psql -U postgres -d cftracker
```

Schedule backups with an operator-managed timer/cron job using an absolute release
path, and schedule off-server transfer separately. Protect dumps as secrets.
Restore tests need a separate disposable database: use `pg_restore --no-owner
--no-privileges` into an empty destination and restore application grants before
starting the API. Keep initialization SQL and credentials with your recovery plan;
a database dump alone does not include cluster roles. See the parent deployment
guide for backup/restore details. Never restore over a live production database.

For an application-only rollback, verify schema compatibility, go to the retained
previous release, validate its Compose config, then replace **only** the backend:

```sh
sudo docker compose config --quiet
sudo docker compose up -d --no-deps --wait --wait-timeout 90 backend
```

The previous image must still be loaded. Do not run the old release's `deploy`
command: it would rerun old migration checks against the newer schema. Code
rollback does not reverse migrations. Use a reviewed forward correction or a
planned restore for incompatible schema changes; backups imply a recovery point
and possible loss of writes since that point.

Never run `docker compose down -v`, `docker volume prune`, or destructive system
pruning against retained data. Ordinary container replacement preserves volumes.
Retain previous releases/images until rollback is no longer needed; delete old
image archives only after confirming transfer, checksums, and rollback copies.
For databases created by the earlier release-relative setup, also retain the
directory containing their active SQL bind mount, even when retiring that release.
Inspect `sudo docker inspect cftracker-postgres-1 --format '{{json .Mounts}}'`
before cleanup. Moving that existing container to the stable mount is a separate,
planned database recreation after backup, not part of an application deployment.

Future backends use separate Compose project names, config directories, networks,
volumes, localhost ports (8081, 8082, ...), and NGINX hostname blocks/certificates.
Container ports can all remain 8080 internally. This script is deliberately scoped
to CFTracker's fixed project, proxy site, and port; do not reuse it unchanged for
another service. Monitor RAM/disk/CPU, add measured resource limits, and preserve
host headroom before adding workloads. Backups and image builds can fill disk;
building on the Mac keeps compilation load off a small VPS.

## Script validation (offline)

From the repository root:

```sh
bash -n backend/deploy/vps/bundle.sh backend/deploy/vps/server.sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s backend/deploy/vps -p 'test_*.py'
```

Unit tests execute the real manifest renderer, configuration validator, secret
initializer, and checksum writer. File objects, environment access, host permission
changes, and randomness are mocked at their boundaries; the functions under test
are not mocked or reimplemented. Each test class has its own file. Tests do not
create/read real test files, launch subprocesses, change the real environment, or
contact services. Disable bytecode output as shown above to avoid Python caches.
Assertions verify requested operations and their outcomes against mocked system
dependencies; actual host permissions, Bash orchestration, backups, and service
behavior still need separate operator verification. Script execution of
build/pull/SSH/Certbot/public health checks is networked and must be separately
authorized if performed by an automated agent.
