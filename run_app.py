"""
run_app.py
==========
Entry point to launch CogniLoop.
Starts the server and automatically opens the application in your default web browser.
"""

import sys
import os
import webbrowser
import socket
import threading
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.server import run_server

def find_available_port(start_port=8000, max_attempts=50):
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return start_port

def open_browser(url):
    time.sleep(1.2)
    print(f"Opening browser at: {url}")
    webbrowser.open(url)

def main():
    port = find_available_port(8000)
    url = f"http://127.0.0.1:{port}"

    threading.Thread(target=open_browser, args=(url,), daemon=True).start()

    httpd = run_server(port=port, host="127.0.0.1")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nCogniLoop server stopped by user.")
        httpd.server_close()

if __name__ == "__main__":
    main()
