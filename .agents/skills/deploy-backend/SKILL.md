---
name: deploy-backend
description: Guide the user through manually updating the CFTracker Go backend on an existing VPS with the release-bundle scripts. Use for backend deployment requests; provide instructions and interpret results without executing deployment commands. Excludes first-time VPS setup and frontend deployment.
---

# Guide Backend Deployment

This skill is guidance only. The user runs every operational command. Even when
the user says "deploy" or "update the remote," walk them through the process;
do not execute it on their behalf. This skill has no automatic execution mode.

Read the current [VPS runbook](../../../backend/deploy/vps/README.md), scripts in
`backend/deploy/vps/`, and `backend/compose.production.yml` to tailor instructions.
Apply [develop-backend](../develop-backend/SKILL.md) when reading backend changes.

## Interaction and boundaries

- Give one manageable stage at a time. Label every command **Mac/local terminal** or **VPS SSH terminal**, describe its purpose and expected result, and warn about concrete risks before the user runs it.
- Wait for the user's output or confirmation before proceeding to the next dependent stage. Acknowledge what their evidence establishes; do not assume an unreported command succeeded.
- The agent may read local repository files and inspect the local diff read-only to prepare advice. It must not run builds, tests, Docker, SSH, SCP, curl, DNS queries, or deployment/verification commands. Do not connect to the VPS, contact websites/APIs, open browsers, transfer files, or change production state.
- Backups are guided too: the user runs both the local SSH streaming command and local archive validation. Do not obtain a backup, inspect remote metadata, or probe health yourself, even as a read-only check. This server boundary also applies to any subagent.
- Do not automatically inspect private deployment profiles or SSH configuration. Ask the user for missing non-secret target details, or use placeholders. Keep actual deployment addresses and credentials out of tracked files and public artifacts.
- Never ask the user to paste passwords, private keys, tokens, env-file contents, or full container environment/inspection output. Request only the narrow, non-secret diagnostic output needed.
- Network permission does not turn this guide into an execution workflow. The user remains the operator. Do not commit, push, or change DNS, TLS, SSH, firewall rules, services, secrets, or database state as part of the guidance.

## 1. Establish what will be released

Ask which backend changes the user intends to deploy and which release is currently
running. Read relevant local changes when available; otherwise ask for non-secret
status/diff summaries. Explain that the builder includes uncommitted files, not
only the latest commit. Do not require a commit or discard unrelated changes.

Check for migrations and new configuration requirements. The normal deploy script
migrates while the old API is running. If compatibility is uncertain, stop the
normal walkthrough and explain the need for a maintenance plan before continuing.
Never recommend editing applied migrations or regenerating existing credentials.

Suggest proportionate checks for the user to run, following applicable testing
skills, and interpret their results. Do not run them yourself or claim they passed
without output. Distinguish local checks from live database/service integration.

## 2. Build locally

Have the user start Docker Desktop and choose a fresh release tag and output
directory outside `backend/`. Use a specific Docker-compatible tag, never `latest`.
Give the current runbook's `bundle.sh` command from the repository root, filling
in the agreed release name and directory consistently.

Warn that the standard build may download Docker images, Alpine packages, and Go
dependencies, consume disk space, and run slowly on Apple Silicon. If the user
requires cached-only operation, explain that the standard script does not enforce
that restriction. Do not recommend it as an offline build or improvise a different
binary/image packaging process. Stop and discuss the supported options first.

Wait for the build result. Guide inspection of `BUILD.txt`, bundle checksums, and
the image-only Compose manifest. Confirm the intended source, amd64 tags, project
name, private database, localhost-only API port, stable SQL mount, and bundled
`server_helpers.py`. Do not include production secrets in the bundle.

## 3. Check the VPS and upload

Guide the user to connect through their existing SSH setup. Keep host-key checking
enabled and credentials local. If connection or sudo fails, diagnose from their
output; do not ask them to expose credentials or bypass authentication safeguards.

Have them inspect disk capacity, Docker/Compose availability, current container
health, previous release/image references, and configuration presence/permissions
without printing secret contents. Record the PostgreSQL container ID for comparison
afterward. Allow space for upload/install copies and loaded images on the VPS,
and for the database dump on the user's computer.

Give the SCP command for the **Mac/local terminal** only after confirming the
target and that the new remote upload/release paths are unused. The user executes
it. Do not overwrite prior releases or prune storage to make room. Wait for upload
completion before offering server installation commands.

## 4. Install and deploy on the VPS

Use the runbook's manual sequence: enter the upload directory, verify checksums,
copy into a new `/srv/cftracker/releases/<release>` directory, and enter it. Give
concrete commands for the agreed release; ensure an existing destination stops
the sequence rather than silently reusing it.

Before deployment, guide the user through the runbook's **local backup** steps
from their **Mac/local terminal**. Have them run `pg_dump` directly in the existing
PostgreSQL container over SSH, streaming into a protected local `.partial` file.
There is no server backup command or script to install or invoke.
Never redirect the archive inside a remote command or save it on the VPS. Choose
a local directory outside the repository and cloud-synced folders. Do not require
PostgreSQL tools on the user's computer. After successful export, guide them to
stream the local archive into the existing container's `pg_restore --list` without
saving it on the VPS. Require successful inspection before marking the file
complete. A failed or interrupted dump is not a backup; do not proceed.
Wait for the user's validation result and completed
local path. Never request the archive contents or upload it anywhere.

Only after that confirmation, ask the user to run
`sudo bash server.sh deploy --local-backup-confirmed` on the VPS and explain:

- The command loads images, preserves an existing PostgreSQL container, uses the backup already saved on their computer, runs migrations, and replaces the API after migration success. It does not save a backup file on the VPS.
- The confirmation flag is the operator's acknowledgement; the server cannot inspect or verify a file on their computer. Never supply it before local validation succeeds.
- API replacement may briefly interrupt requests. Backup or migration failures must stop the update; there is no automatic rollback.
- Do not run `init` for an update. Existing secrets, database volume, NGINX, and HTTPS configuration should be retained.

Wait for the command's output. On failure, stop the walkthrough and diagnose that
specific step. Do not suggest blind retries, volume deletion, password rotation,
database restore, or an improvised release process. Report the actual container
state; a failed replacement does not guarantee the old API is still running.

## 5. Verify with the user

Provide narrowly scoped commands for the user to check:

- Compose status, expected release image, and direct localhost readiness.
- PostgreSQL's container ID against the recorded value and the completed backup's presence on the user's computer.
- Public HTTPS readiness without disabling certificate validation; both address families when published.

Ask the user to smoke-test login and normal application behavior. Do not perform
authenticated or mutating tests for them. Mark checks pending until they report
results. A health response alone does not establish OAuth or full app correctness.

Summarize the release, evidence of success, backup location, and outstanding checks.
Remind them to protect local backups, keep them outside cloud-synced folders, and
periodically test restoration into a disposable database. The workflow does not
delete old backups already on the VPS; any cleanup is a separate user decision.
For a requested rollback, guide the runbook's application-only procedure only after
checking schema compatibility; never rerun an old release's `deploy` command.
