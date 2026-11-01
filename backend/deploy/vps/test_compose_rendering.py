"""Check release rendering against the checked-in production manifest."""
from pathlib import Path
import unittest

from bundle_helpers import render_compose


MANIFEST_PATH = Path(__file__).resolve().parents[2] / "compose.production.yml"

class ComposeRenderingTest(unittest.TestCase):
    def setUp(self):
        self.source = MANIFEST_PATH.read_text()

    def test_release_uses_local_images_and_retains_private_database_configuration(self):
        result = render_compose(self.source, "release-001")
        self.assertNotIn("    build:", result)
        self.assertIn("image: cftracker-backend:release-001", result)
        self.assertIn("image: cftracker-migration:release-001", result)
        self.assertEqual(result.count("pull_policy: never"), 2)
        self.assertIn('127.0.0.1:8080:8080', result)
        self.assertIn("postgres_data:/var/lib/postgresql/data", result)
        self.assertIn("name: cftracker", result)
        self.assertIn("    internal: true", result)
        self.assertIn('    env_file: ["/etc/cftracker/backend.env"]', result)
        self.assertIn('    env_file: ["/etc/cftracker/migration.env"]', result)

        # Retain actual runtime settings and network/secret definitions verbatim.
        backend_settings = self.source.split("  backend:\n", 1)[1].split("    restart:", 1)[1].split("  migrate:", 1)[0]
        migration_settings = self.source.split('    env_file: ["/etc/cftracker/migration.env"]', 1)[1]
        self.assertIn(backend_settings, result)
        self.assertTrue(result.endswith(migration_settings))

    def test_release_change_does_not_change_database_mount(self):
        first = render_compose(self.source, "release-001")
        second = render_compose(self.source, "release-002")
        def database(text):
            return text.split("  postgres:\n", 1)[1].split("  backend:\n", 1)[0]
        self.assertEqual(database(first), database(second))
        self.assertIn("/etc/cftracker/init-app-role.sql:", database(first))
        self.assertNotIn("./init-app-role.sql:", first)

    def test_changed_or_duplicated_build_definition_is_rejected(self):
        for source in (
            self.source.replace("target: migration", "target: changed"),
            self.source + self.source,
        ):
            with self.subTest(source=source), self.assertRaises(SystemExit):
                render_compose(source, "release-001")
    def test_missing_or_duplicated_sql_mount_is_rejected(self):
        mount = "./deploy/init-app-role.sql:"
        for source in (self.source.replace(mount, "./changed.sql:"), self.source + mount):
            with self.subTest(source=source), self.assertRaises(SystemExit):
                render_compose(source, "release-001")
