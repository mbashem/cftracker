"""Offline checks for deployment packaging and safe input/failure handling."""
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parent


class DeploymentScriptsTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.bin = self.directory / "bin"
        self.bin.mkdir()
        self.log = self.directory / "docker.log"
        docker = self.bin / "docker"
        docker.write_text("""#!/bin/bash
set -eu
printf '%s\\n' "$*" >> "$DOCKER_TEST_LOG"
if [[ $1 == buildx && ${FAIL_BUILD:-0} == 1 ]]; then exit 42; fi
if [[ $1 == image && $2 == save ]]; then printf 'mock image archive' > "$4"; fi
""")
        docker.chmod(0o755)
        self.environment = {
            **os.environ,
            "PATH": str(self.bin) + os.pathsep + os.environ["PATH"],
            "DOCKER_TEST_LOG": str(self.log),
        }

    def bundle(self, release="test-release", output=None):
        return subprocess.run(
            ["bash", str(SCRIPTS / "bundle.sh"), release,
             str(output or self.directory / "release")],
            env=self.environment, text=True, capture_output=True, check=False,
        )

    def test_bundle_uses_loaded_amd64_images_and_checksums_every_file(self):
        result = self.bundle()
        self.assertEqual(result.returncode, 0, result.stderr)
        output = self.directory / "release"
        manifest = (output / "compose.yml").read_text()
        self.assertNotIn("    build:", manifest)
        self.assertIn("image: cftracker-backend:test-release", manifest)
        self.assertIn("image: cftracker-migration:test-release", manifest)
        self.assertEqual(manifest.count("pull_policy: never"), 2)
        self.assertIn("/etc/cftracker/init-app-role.sql:", manifest)
        self.assertNotIn("./init-app-role.sql:", manifest)
        self.assertIn('127.0.0.1:8080:8080', manifest)
        self.assertIn("name: cftracker", manifest)
        calls = self.log.read_text().splitlines()
        self.assertEqual(len(calls), 3)
        self.assertTrue(all("--platform linux/amd64" in c for c in calls[:2]))
        self.assertTrue(all("--load" in c for c in calls[:2]))
        checked = set()
        for line in (output / "SHA256SUMS").read_text().splitlines():
            digest, filename = line.split("  ", 1)
            self.assertEqual(hashlib.sha256((output / filename).read_bytes()).hexdigest(), digest)
            checked.add(filename)
        self.assertEqual(checked, {p.name for p in output.iterdir()} - {"SHA256SUMS"})
        self.assertNotIn("backend.env", checked)
        self.assertIn("server_helpers.py", checked)
        self.assertEqual((output / "server_helpers.py").read_bytes(),
                         (SCRIPTS / "server_helpers.py").read_bytes())

    def test_failed_build_stops_before_image_export_and_complete_manifest(self):
        self.environment["FAIL_BUILD"] = "1"
        result = self.bundle()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(len(self.log.read_text().splitlines()), 1)
        self.assertFalse((self.directory / "release" / "SHA256SUMS").exists())
        self.assertFalse((self.directory / "release" / "images.tar").exists())

    def test_existing_output_is_not_overwritten(self):
        output = self.directory / "release"
        output.mkdir()
        sentinel = output / "keep"
        sentinel.write_text("existing")
        result = self.bundle()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(sentinel.read_text(), "existing")
        self.assertFalse(self.log.exists())

    def test_invalid_and_mutable_tags_do_not_call_docker(self):
        for tag in ("latest", "bad/tag", "$(touch unexpected)", "-option"):
            with self.subTest(tag=tag):
                self.assertNotEqual(self.bundle(tag).returncode, 0)
        self.assertFalse(self.log.exists())

    def test_output_inside_build_context_is_rejected(self):
        result = self.bundle(output=SCRIPTS / "should-not-be-created")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("outside the backend Docker build context", result.stderr)
        self.assertFalse((SCRIPTS / "should-not-be-created").exists())
        self.assertFalse(self.log.exists())

    def test_nginx_preview_includes_both_families_and_replaces_forwarded_headers(self):
        result = subprocess.run(
            ["bash", str(SCRIPTS / "server.sh"), "nginx-config", "api.example.com"],
            text=True, capture_output=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        for directive in ("listen 80;", "listen [::]:80;", "access_log off;",
                          "proxy_set_header X-Forwarded-For $remote_addr;",
                          "proxy_set_header X-Forwarded-Proto $scheme;"):
            self.assertIn(directive, result.stdout)

    def test_nginx_preview_rejects_config_injection(self):
        for host in ("", "https://api.example.com", "api.example.com;}", "api.example.com\nfoo"):
            with self.subTest(host=host):
                result = subprocess.run(
                    ["bash", str(SCRIPTS / "server.sh"), "nginx-config", host],
                    text=True, capture_output=True, check=False,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(result.stdout, "")

    def deployment(self, fail_backup=False, fresh_database=False):
        """Run the real orchestration against an existing, simulated database.

        A simulated Compose reconciliation recreates the database unless guarded,
        including when invoked implicitly through migration dependencies.
        """
        config = self.directory / "config"
        config.mkdir()
        for name in ("postgres-password", "app-password", "backend.env", "migration.env"):
            (config / name).write_text("test-fixture\n")
        for release in ("release-001", "release-002"):
            path = self.directory / release
            path.mkdir()
            (path / "init-app-role.sql").write_text("-- identical initialization SQL\n")
            shutil.copyfile(SCRIPTS / "server_helpers.py", path / "server_helpers.py")
        trace = self.directory / "deployment.log"
        harness = r'''
source "$1"
config=$2/config
trace=$2/deployment.log
db_identity=$4
sha256sum() { :; }
stat() { echo 700; }
docker() {
  if [[ $* == 'image inspect --format '* ]]; then echo linux/amd64; fi
}
curl() { :; }
compose() {
  case "$*" in
    '--profile tools config --format json')
      echo '{"services":{"backend":{"image":"test-backend"},"migrate":{"image":"test-migrate"}}}' ;;
    up*postgres)
      if [[ $db_identity == missing ]]; then
        db_identity=new-database
      elif [[ " $* " != *' --no-recreate '* ]]; then
        db_identity=recreated
      fi ;;
    run*migrate)
      if [[ " $* " != *' --no-deps '* ]]; then db_identity=recreated; fi
      echo "migrate:$db_identity" >> "$trace" ;;
    up*backend) echo "backend:$db_identity" >> "$trace" ;;
  esac
}
backup_failure=$3
backup() {
  echo "backup:$db_identity" >> "$trace"
  [[ $backup_failure != fail ]]
}
for release in release-001 release-002; do
  directory=$2/$release
  deploy
done
'''
        result = subprocess.run(
            ["bash", "-c", harness, "deployment-test", str(SCRIPTS / "server.sh"),
             str(self.directory), "fail" if fail_backup else "pass",
             "missing" if fresh_database else "existing-database"],
            text=True, capture_output=True, check=False,
        )
        return result, trace.read_text().splitlines()

    def test_two_releases_preserve_existing_database_before_backup_and_migration(self):
        result, events = self.deployment()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(events, ["backup:existing-database", "migrate:existing-database",
                                  "backend:existing-database"] * 2)
        self.assertEqual((self.directory / "config" / "init-app-role.sql").read_text(),
                         "-- identical initialization SQL\n")

    def test_backup_failure_stops_before_migration_or_backend_replacement(self):
        result, events = self.deployment(fail_backup=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(events, ["backup:existing-database"])

    def test_fresh_database_is_created_then_preserved_on_next_release(self):
        result, events = self.deployment(fresh_database=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(events, ["backup:new-database", "migrate:new-database",
                                  "backend:new-database"] * 2)

    def initialize_config(self, origin="https://frontend.example.com"):
        return subprocess.run(
            ["python3", str(SCRIPTS / "server_helpers.py"), "init",
             str(self.directory / "secrets")],
            env={**self.environment, "frontend": origin,
                 "origins": "https://frontend.example.com,http://localhost:5173",
                 "client_id": "test-client-id", "client_secret": "test-client-secret"},
            text=True, capture_output=True, check=False,
        )

    def test_extracted_initializer_protects_secrets_and_refuses_replacement(self):
        result = self.initialize_config()
        self.assertEqual(result.returncode, 0, result.stderr)
        directory = self.directory / "secrets"
        self.assertEqual(directory.stat().st_mode & 0o777, 0o700)
        contents = {file.name: file.read_bytes() for file in directory.iterdir()}
        for file in directory.iterdir():
            expected_mode = 0o644 if file.name == "app-password" else 0o600
            self.assertEqual(file.stat().st_mode & 0o777, expected_mode)
            self.assertNotIn(file.read_text().strip(), result.stdout)
        backend = (directory / "backend.env").read_text()
        self.assertIn("GITHUB_REDIRECT_URL=https://frontend.example.com/callback/auth-gh", backend)
        self.assertIn((directory / "app-password").read_text().strip(), backend)
        self.assertNotEqual(contents["app-password"], contents["postgres-password"])
        repeated = self.initialize_config()
        self.assertNotEqual(repeated.returncode, 0)
        self.assertEqual(contents, {file.name: file.read_bytes() for file in directory.iterdir()})

    def test_extracted_initializer_rejects_invalid_origin_before_writing(self):
        result = self.initialize_config(origin="https://frontend.example.com/path")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.directory / "secrets").exists())


if __name__ == "__main__":
    unittest.main()
