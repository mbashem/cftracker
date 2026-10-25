#!/usr/bin/env bash
# Run on the build machine. No SSH, registry push, or deployment is performed.
# Stop if a required step fails instead of producing an incomplete release bundle.
set -euo pipefail
# Require a release label and a destination for the generated deployment files.
if [[ $# != 2 ]]; then
  echo 'Usage: bash backend/deploy/vps/bundle.sh RELEASE OUTPUT_DIRECTORY' >&2
  exit 2
fi
release=$1
# Require a specific, valid image tag so deployed versions can be identified.
[[ $release =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$ && $release != latest ]] || {
  echo 'Use a specific Docker tag (not latest).' >&2; exit 2;
}
# Locate the repository even when invoked from another working directory.
root=$(cd "$(dirname "$0")/../../.." && pwd)
output=$2
# Resolve .. and symlinks before checking where the output would be written.
output=$(python3 "$root/backend/deploy/vps/bundle_helpers.py" resolve-path "$output")
# Keep generated archives outside the backend directory so subsequent builds
# cannot accidentally include previous bundles in their uploaded build files.
case "$output/" in
  "$root/backend/"*) echo 'Put the bundle outside the backend Docker build context.' >&2; exit 2 ;;
esac
# Preserve existing bundles; each build needs a fresh output directory.
[[ ! -e $output ]] || { echo 'Output already exists; choose a new directory.' >&2; exit 1; }
# Verify that Docker and Python are installed before preparing the bundle.
for dependency in docker python3; do command -v "$dependency" >/dev/null; done
# Keep the bundle directory accessible only to its owner on the build machine.
mkdir -m 700 "$output"
output=$(cd "$output" && pwd)
# Derive the image-only manifest from the authoritative production manifest.
# The server will use prebuilt images rather than compiling application source.
python3 "$root/backend/deploy/vps/bundle_helpers.py" render-compose "$root" "$output" "$release"
# Copy only the files needed by the operator; production secrets are created on
# the VPS later and are never collected into this bundle.
cp "$root/backend/deploy/init-app-role.sql" "$output/"
cp "$root/backend/deploy/vps/server.sh" "$output/"
cp "$root/backend/deploy/vps/server_helpers.py" "$output/"
cp "$root/backend/deploy/vps/README.md" "$output/RUNBOOK.md"
# This records the checked-out commit and any uncommitted filenames for review.
# It does not force a clean checkout: Docker builds the current working tree.
{
  printf 'Release: %s\nPlatform: linux/amd64\n' "$release"
  git -C "$root" rev-parse HEAD
  git -C "$root" status --short
} > "$output/BUILD.txt"
# Build separate API and migration images for the VPS's amd64 architecture,
# including when the build machine is an Apple Silicon Mac. Store both locally.
# This may download base images and Go dependencies; it does not change the VPS.
for target in backend migration; do
  docker buildx build --platform linux/amd64 \
    -f "$root/backend/dockerfile" --target "$target" \
    -t "cftracker-$target:$release" --load "$root/backend"
done
# Export both local images into one archive for later SCP transfer and docker load.
docker image save -o "$output/images.tar" \
  "cftracker-backend:$release" "cftracker-migration:$release"
# Hash every bundle file so the server can detect incomplete or altered transfers.
# This detects accidental changes; it does not authenticate an untrusted sender.
python3 "$root/backend/deploy/vps/bundle_helpers.py" checksums "$output"
echo "Bundle ready: $output (check BUILD.txt for uncommitted changes)."
