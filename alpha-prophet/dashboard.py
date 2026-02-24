"""
Dashboard Launcher - Start API + Web UI
"""

import subprocess
import sys
import time
import os
import webbrowser
from threading import Thread


def start_api():
    """Start the Flask API server"""
    print("Starting API server on port 5000...")
    subprocess.run([sys.executable, 'api/server.py'])


def start_web():
    """Start the web server"""
    print("Starting web server on port 3000...")
    os.chdir('web')
    subprocess.run([sys.executable, '-m', 'http.server', '3000'])


def main():
    """Start both API and web server"""
    print("=" * 60)
    print("Alpha Prophet Dashboard")
    print("=" * 60)
    print()
    print("Starting servers...")
    print()

    # Start API in background thread
    api_thread = Thread(target=start_api, daemon=True)
    api_thread.start()

    print("✓ API server starting on http://localhost:5000")
    print("✓ Web UI will be on http://localhost:3000")
    print()

    # Wait a bit for API to start
    time.sleep(3)

    # Open browser
    print("Opening browser...")
    webbrowser.open('http://localhost:3000')

    print()
    print("Dashboard running!")
    print("Press Ctrl+C to stop")
    print()

    # Start web server (blocking)
    try:
        start_web()
    except KeyboardInterrupt:
        print("\n\nShutting down...")


if __name__ == "__main__":
    main()
