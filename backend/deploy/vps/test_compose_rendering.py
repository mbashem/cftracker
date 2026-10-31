"""Test production Compose rendering with in-memory input."""
import unittest

from bundle_helpers import render_compose


COMPOSE_SOURCE = """name: cftracker
services:
  postgres:
    image: postgres:14-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./deploy/init-app-role.sql:/docker-entrypoint-initdb.d/10-app-role.sql:ro
  backend:
    build:
      context: .
      dockerfile: dockerfile
      target: backend
    ports: ["127.0.0.1:8080:8080"]
  migrate:
    profiles: [tools]
    build:
      context: .
      dockerfile: dockerfile
      target: migration
volumes:
  postgres_data:
"""



class ComposeRenderingTest(unittest.TestCase):
    def test_release_uses_local_images_and_retains_private_database_configuration(self):
        result = render_compose(COMPOSE_SOURCE, "release-001")
        self.assertNotIn("    build:", result)
        self.assertIn("image: cftracker-backend:release-001", result)
        self.assertIn("image: cftracker-migration:release-001", result)
        self.assertEqual(result.count("pull_policy: never"), 2)
        self.assertIn('127.0.0.1:8080:8080', result)
        self.assertIn("postgres_data:/var/lib/postgresql/data", result)
        self.assertIn("name: cftracker", result)

    def test_release_change_does_not_change_database_mount(self):
        first = render_compose(COMPOSE_SOURCE, "release-001")
        second = render_compose(COMPOSE_SOURCE, "release-002")
        def database(text):
            return text.split("  postgres:\n", 1)[1].split("  backend:\n", 1)[0]
        self.assertEqual(database(first), database(second))
        self.assertIn("/etc/cftracker/init-app-role.sql:", database(first))
        self.assertNotIn("./init-app-role.sql:", first)

    def test_changed_or_duplicated_build_definition_is_rejected(self):
        for source in (
            COMPOSE_SOURCE.replace("target: migration", "target: changed"),
            COMPOSE_SOURCE + COMPOSE_SOURCE,
        ):
            with self.subTest(source=source), self.assertRaises(SystemExit):
                render_compose(source, "release-001")
    def test_missing_or_duplicated_sql_mount_is_rejected(self):
        mount = "./deploy/init-app-role.sql:"
        for source in (COMPOSE_SOURCE.replace(mount, "./changed.sql:"), COMPOSE_SOURCE + mount):
            with self.subTest(source=source), self.assertRaises(SystemExit):
                render_compose(source, "release-001")
