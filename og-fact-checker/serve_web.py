#!/usr/bin/env python3
"""
Simple HTTP server for the fact checker web UI
"""

import http.server
import socketserver
import os

PORT = 3000
DIRECTORY = "web"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def main():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("=" * 60)
        print("🌐 Fact Checker Web UI")
        print("=" * 60)
        print(f"\n✅ Server running at: http://localhost:{PORT}")
        print(f"📁 Serving from: {os.path.abspath(DIRECTORY)}")
        print("\n💡 Make sure the API server is running on port 5000:")
        print("   python api_server.py")
        print("\nPress Ctrl+C to stop\n")
        httpd.serve_forever()

if __name__ == "__main__":
    main()
