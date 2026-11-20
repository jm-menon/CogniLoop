"""
backend/server.py
=================
Lightweight, robust HTTP server providing REST API endpoints and serving
the CogniLoop web interface.
Uses Python standard library (http.server.ThreadingHTTPServer).
Zero external dependencies required.
"""

import os
import sys
import json
import mimetypes
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.protective_pipeline import QuantumGuardedCognitivePipeline

FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
pipeline_instance = QuantumGuardedCognitivePipeline()

PRESET_QUERIES = [
    {
        "id": "crisis_support",
        "title": "Thoughts of Suicide - Psychologist Referral (DBT Safety Protocol)",
        "query": "I am thinking about suicide and I feel like I cannot handle this pain anymore.",
        "category": "Immediate Psychologist Referral",
        "badge": "Psychologist Help"
    },
    {
        "id": "project_delay",
        "title": "Project Delay & Fear of Getting Fired (DEAR MAN / Check Facts)",
        "query": "I think I delayed the project and my manager will fire me.",
        "category": "Workplace Catastrophizing",
        "badge": "Primary Example"
    },
    {
        "id": "tipp_panic",
        "title": "Acute Somatic Panic & Tight Chest (DBT TIPP Skill)",
        "query": "My chest is tight, I'm spiraling, and I can't think straight right now.",
        "category": "Distress Tolerance (High Arousal)",
        "badge": "DBT TIPP"
    },
    {
        "id": "stop_impulse",
        "title": "Furious Urge to Quit on Impulse (DBT STOP Skill)",
        "query": "I am so furious right now I'm about to type out a resignation email and quit on the spot.",
        "category": "Distress Tolerance (Crisis Impulse)",
        "badge": "DBT STOP"
    },
    {
        "id": "check_facts",
        "title": "Unanswered Message & Fear of Rejection (DBT Check Facts)",
        "query": "My friend hasn't replied to my text for 6 hours, they definitely hate me and are cutting me off.",
        "category": "Emotion Regulation",
        "badge": "Check the Facts"
    },
    {
        "id": "radical_acceptance",
        "title": "Layoff Grief & Fight Against Reality (DBT Radical Acceptance)",
        "query": "It's completely unfair that I got laid off after everything I did for them. I can't accept this.",
        "category": "Reality Acceptance",
        "badge": "Radical Acceptance"
    },
    {
        "id": "boundaries_fast",
        "title": "Guilt Saying No to Financial Boundary (DBT FAST Skill)",
        "query": "My friend keeps asking to borrow money and guilts me whenever I hesitate. How do I say no without feeling like a bad person?",
        "category": "Interpersonal Effectiveness",
        "badge": "DBT FAST"
    }
]

class CogniLoopRequestHandler(BaseHTTPRequestHandler):
    """Handles HTTP requests for CogniLoop."""

    def _set_headers(self, content_type="application/json", status=200):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(status=204)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/presets":
            self._set_headers("application/json")
            self.wfile.write(json.dumps({"presets": PRESET_QUERIES}).encode("utf-8"))
            return

        if path == "/api/health":
            self._set_headers("application/json")
            self.wfile.write(json.dumps({
                "status": "healthy",
                "app": "CogniLoop",
                "quantum_model": "4-Qubit Projective Layer",
                "gemini_configured": pipeline_instance.gemini_client.is_configured(),
                "gemini_model": pipeline_instance.gemini_client.model
            }).encode("utf-8"))
            return

        # Serve static frontend files
        if path == "/" or path == "":
            file_path = os.path.join(FRONTEND_DIR, "index.html")
        else:
            rel_path = path.lstrip("/")
            file_path = os.path.join(FRONTEND_DIR, rel_path)

        if os.path.exists(file_path) and os.path.isfile(file_path):
            mime_type, _ = mimetypes.guess_type(file_path)
            mime_type = mime_type or "application/octet-stream"
            try:
                with open(file_path, "rb") as f:
                    content = f.read()
                self._set_headers(content_type=mime_type)
                self.wfile.write(content)
            except Exception as e:
                self._set_headers(status=500)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        else:
            self._set_headers("application/json", status=404)
            self.wfile.write(json.dumps({"error": f"File not found: {path}"}).encode("utf-8"))

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            data = {}

        if path == "/api/query":
            query = data.get("query", "").strip()
            api_key = data.get("api_key")
            model = data.get("model")

            if api_key:
                pipeline_instance.gemini_client.set_api_key(api_key)
            if model:
                pipeline_instance.gemini_client.set_model(model)

            result = pipeline_instance.process(query)
            self._set_headers("application/json")
            self.wfile.write(json.dumps(result).encode("utf-8"))
            return

        if path == "/api/config":
            api_key = data.get("api_key")
            model = data.get("model")

            if api_key is not None:
                pipeline_instance.gemini_client.set_api_key(api_key)
            if model:
                pipeline_instance.gemini_client.set_model(model)

            self._set_headers("application/json")
            self.wfile.write(json.dumps({
                "success": True,
                "is_configured": pipeline_instance.gemini_client.is_configured(),
                "model": pipeline_instance.gemini_client.model
            }).encode("utf-8"))
            return

        if path == "/api/voice-transcribe" or path == "/api/gemini-live-transcribe":
            audio_b64 = data.get("audio", "")
            mime_type = data.get("mime_type", "audio/webm")
            api_key = data.get("api_key")
            model = data.get("model")

            if api_key:
                pipeline_instance.gemini_client.set_api_key(api_key)
            if model:
                pipeline_instance.gemini_client.set_model(model)

            result = pipeline_instance.gemini_client.transcribe_audio_query(audio_b64, mime_type=mime_type)
            self._set_headers("application/json")
            self.wfile.write(json.dumps(result).encode("utf-8"))
            return

        self._set_headers("application/json", status=404)
        self.wfile.write(json.dumps({"error": f"Endpoint not found: {path}"}).encode("utf-8"))

def run_server(port=None, host=None):
    if port is None:
        port = int(os.environ.get("PORT", 8000))
    if host is None:
        host = os.environ.get("HOST", "0.0.0.0")
    server_address = (host, port)
    httpd = ThreadingHTTPServer(server_address, CogniLoopRequestHandler)
    print(f"==================================================")
    print(f"CogniLoop Server Running at http://{host}:{port}")
    print(f"Cognitive Thinking + Quantum Protective Layer")
    print(f"==================================================")
    return httpd

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    server = run_server(port=port, host=host)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down CogniLoop server...")
        server.server_close()
