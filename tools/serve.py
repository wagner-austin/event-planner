from __future__ import annotations

import contextlib
import http.server
import socket
import threading
import time
import webbrowser
from functools import partial
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB_DIR = ROOT / 'web'
HOST = '127.0.0.1'
PORT = 8080



def wait_for_port(host: str, port: int, timeout: float = 5.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            sock.settimeout(0.2)
            if sock.connect_ex((host, port)) == 0:
                return True
        time.sleep(0.1)
    return False


def main() -> int:
    # Build step intentionally not invoked here to keep the server lightweight

    handler_factory = partial(http.server.SimpleHTTPRequestHandler, directory=str(WEB_DIR))
    server = http.server.ThreadingHTTPServer((HOST, PORT), handler_factory)

    def open_browser_once_ready() -> None:
        if wait_for_port(HOST, PORT, timeout=5.0):
            webbrowser.open(f"http://{HOST}:{PORT}/index.html")

    t = threading.Thread(target=open_browser_once_ready, daemon=True)
    t.start()

    import sys
    sys.stdout.write(f"Serving {WEB_DIR} at http://{HOST}:{PORT} (Ctrl+C to stop)\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt as err:
        raise SystemExit(0) from err
    finally:
        server.shutdown()
        server.server_close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
