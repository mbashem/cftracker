#!/usr/bin/env python3
"""Serve the API tester on loopback without exposing environment/source files."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
ASSETS = {
    "/callback/auth-gh": ("api-tester.html", "text/html; charset=utf-8"),
    "/backend/api-tester.html": ("api-tester.html", "text/html; charset=utf-8"),
    "/backend/api-tester.mjs": ("api-tester.mjs", "text/javascript; charset=utf-8"),
    "/backend/api-tester-client.mjs": ("api-tester-client.mjs", "text/javascript; charset=utf-8"),
    "/backend/api-documentation.html": ("api-documentation.html", "text/html; charset=utf-8"),
}


class TesterHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.respond(include_body=True)

    def do_HEAD(self):
        self.respond(include_body=False)

    def respond(self, include_body):
        path = urlsplit(self.path).path
        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/backend/api-tester.html")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        asset = ASSETS.get(path)
        if asset is None:
            self.send_error(404)
            return
        filename, content_type = asset
        try:
            body = (ROOT / filename).read_bytes()
        except OSError:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if include_body:
            self.wfile.write(body)

    def log_message(self, _format, *_arguments):
        # OAuth callback query strings contain one-use authorization credentials.
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    with ThreadingHTTPServer(("127.0.0.1", args.port), TesterHandler) as server:
        print(f"API tester: http://localhost:{server.server_port}/backend/api-tester.html", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
