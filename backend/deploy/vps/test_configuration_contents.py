"""Test production configuration validation and credential separation."""
import unittest

from server_helpers import configuration_contents, validate_origin


class ConfigurationContentsTest(unittest.TestCase):
    def contents(self, **overrides):
        values = {
            "frontend": "https://frontend.example.com",
            "origins": "https://frontend.example.com,http://localhost:5173",
            "client_id": "test-client-id",
            "client_secret": "test-client-secret",
            "admin": "admin-fixture",
            "app": "app-fixture",
            "jwt": "jwt-fixture",
        }
        return configuration_contents(**(values | overrides))

    def test_admin_credentials_are_separate_from_application_configuration(self):
        contents = self.contents()
        self.assertEqual(set(contents), {"postgres-password", "app-password", "backend.env", "migration.env"})
        self.assertIn("admin-fixture", contents["migration.env"])
        self.assertNotIn("admin-fixture", contents["backend.env"])
        self.assertIn("app-fixture", contents["backend.env"])
        self.assertNotIn("app-fixture", contents["migration.env"])
        self.assertEqual(contents["postgres-password"], "admin-fixture\n")
        self.assertEqual(contents["app-password"], "app-fixture\n")

    def test_frontend_callback_and_allowed_origins_remain_distinct(self):
        backend = self.contents()["backend.env"]
        self.assertIn("GITHUB_REDIRECT_URL=https://frontend.example.com/callback/auth-gh\n", backend)
        self.assertIn("CORS_ALLOWED_ORIGINS=https://frontend.example.com,http://localhost:5173\n", backend)
        self.assertIn("JWT_SECRET=jwt-fixture\n", backend)
        self.assertIn("TRUSTED_PROXIES=\n", backend)

    def test_invalid_frontend_and_allowed_origin_are_rejected(self):
        for values in (
            {"frontend": "https://frontend.example.com/path"},
            {"origins": "https://frontend.example.com,"},
            {"origins": "https://frontend.example.com,http://localhost:5173/path"},
        ):
            with self.subTest(values=values), self.assertRaises(SystemExit):
                self.contents(**values)

    def test_invalid_credentials_cannot_add_environment_entries(self):
        for key in ("client_id", "client_secret"):
            for value in ("", "value\nEXTRA_SETTING=1", "${UNEXPECTED}"):
                with self.subTest(key=key, value=value), self.assertRaises(SystemExit):
                    self.contents(**{key: value})

    def test_origins_accept_hosts_and_reject_paths_credentials_and_expansion(self):
        for origin in ("https://frontend.example.com", "http://localhost:5173"):
            with self.subTest(origin=origin):
                validate_origin(origin)
        for origin in (
            "", "file:///tmp/example", "https://frontend.example.com/",
            "https://frontend.example.com?query=1", "https://frontend.example.com#fragment",
            "https://user:password@frontend.example.com", "https://bad host.example.com",
            "https://${HOST}.example.com",
        ):
            with self.subTest(origin=origin), self.assertRaises(SystemExit):
                validate_origin(origin)
