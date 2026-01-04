import http.server
import socketserver
import webbrowser
import threading
import time

PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

def start_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at port {PORT}")
        print(f"Open http://localhost:{PORT} in your browser")
        httpd.serve_forever()

if __name__ == "__main__":
    # Start server in a separate thread
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True
    server_thread.start()

    # Give the server a moment to start
    time.sleep(1)

    # Open the browser
    webbrowser.open(f"http://localhost:{PORT}")

    # Keep the main thread alive working
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping server...")
