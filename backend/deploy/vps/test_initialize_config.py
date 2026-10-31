"""Exercise the real initializer with mocked host and file dependencies."""
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch

import server_helpers


class InitializeConfigTest(unittest.TestCase):
    def setUp(self):
        self.directory = MagicMock(spec=Path)
        names = ("postgres-password", "app-password", "backend.env", "migration.env")
        self.files = {name: MagicMock(spec=Path) for name in names}
        self.directory.__truediv__.side_effect = self.files.__getitem__
        for file in self.files.values():
            file.exists.return_value = False

        # Replace the module's system dependencies, not the initializer under test.
        self.os = self.enterContext(patch.object(server_helpers, "os"))
        self.os.environ = {
            "origins": "https://frontend.example.com,http://localhost:5173",
            "client_id": "test-client-id",
            "client_secret": "test-client-secret",
        }
        self.secrets = self.enterContext(patch.object(server_helpers, "secrets"))
        self.secrets.token_hex.side_effect = ["admin-fixture", "app-fixture"]
        self.secrets.token_urlsafe.return_value = "jwt-fixture"
        self.output = self.enterContext(patch.object(server_helpers, "print", create=True))

    def written(self, name):
        writer = self.files[name].open.return_value.__enter__.return_value
        return writer.write.call_args.args[0]

    def test_creates_protected_credentials_with_separate_database_roles(self):
        server_helpers.initialize_config(self.directory)

        self.os.umask.assert_called_once_with(0o077)
        self.directory.mkdir.assert_called_once_with(mode=0o700, exist_ok=True)
        self.directory.chmod.assert_called_once_with(0o700)
        for file in self.files.values():
            file.open.assert_called_once_with("x")
        self.assertEqual(self.written("postgres-password"), "admin-fixture\n")
        self.assertEqual(self.written("app-password"), "app-fixture\n")
        self.assertIn("cftracker_app:app-fixture@postgres", self.written("backend.env"))
        self.assertNotIn("admin-fixture", self.written("backend.env"))
        self.assertIn("postgres:admin-fixture@postgres", self.written("migration.env"))
        self.assertIn("JWT_SECRET=jwt-fixture\n", self.written("backend.env"))
        self.files["app-password"].chmod.assert_called_once_with(0o644)
        for name in ("postgres-password", "backend.env", "migration.env"):
            self.files[name].chmod.assert_not_called()
        self.assertNotIn("fixture", str(self.output.call_args_list))

    def test_any_existing_credential_prevents_all_file_writes(self):
        for existing in self.files:
            with self.subTest(existing=existing):
                for name, file in self.files.items():
                    file.exists.return_value = name == existing
                self.secrets.token_hex.side_effect = ["admin-fixture", "app-fixture"]
                with self.assertRaisesRegex(SystemExit, "already exists"):
                    server_helpers.initialize_config(self.directory)
                for file in self.files.values():
                    file.open.assert_not_called()
                    file.chmod.assert_not_called()

    def test_invalid_settings_fail_before_directory_or_file_changes(self):
        self.os.environ["origins"] = "https://frontend.example.com/path"
        with self.assertRaisesRegex(SystemExit, "Origins must"):
            server_helpers.initialize_config(self.directory)
        self.directory.mkdir.assert_not_called()
        self.directory.chmod.assert_not_called()
        for file in self.files.values():
            file.open.assert_not_called()

    def test_file_creation_failure_stops_remaining_writes(self):
        self.files["postgres-password"].open.side_effect = PermissionError("mock permission failure")
        with self.assertRaises(PermissionError):
            server_helpers.initialize_config(self.directory)
        for name in ("app-password", "backend.env", "migration.env"):
            self.files[name].open.assert_not_called()
        self.output.assert_not_called()
