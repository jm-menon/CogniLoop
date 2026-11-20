"""
backend/server.py
=================
Lightweight, robust HTTP server providing REST API endpoints and serving
the CogniLoop web interface.
Uses Python's ThreadingHTTPServer with PostgreSQL-backed account and conversation storage.
"""

import os
import sys
import json
import mimetypes
import time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))   # must run BEFORE importing auth

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.protective_pipeline import QuantumGuardedCognitivePipeline
from backend import auth
from backend.metrics import record_query
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

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

        if path == "/metrics":
            self._set_headers(CONTENT_TYPE_LATEST)
            self.wfile.write(generate_latest())
            return

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

        if path == "/api/auth/config":
            self._set_headers("application/json")
            self.wfile.write(json.dumps({"configured": bool(auth.DATABASE_URL and auth.JWT_SECRET)}).encode("utf-8"))
            return

        if path == "/api/psychologists":
            try:
                result = auth.list_psychologists()
                self._set_headers("application/json")
                self.wfile.write(json.dumps({"psychologists": result}).encode("utf-8"))
            except Exception as exc:
                self._json_error(503, "Could not load psychologists. Check PostgreSQL configuration.")
            return

        if path == "/api/dashboard":
            try:
                user = auth.authenticated_user(self.headers.get("Authorization"))
                result = auth.dashboard(user)
                self._set_headers("application/json")
                self.wfile.write(json.dumps({"user": user, **result}, default=str).encode("utf-8"))
            except (ValueError, RuntimeError) as exc:
                self._json_error(401, str(exc))
            except Exception:
                self._json_error(503, "Could not load account dashboard.")
            return

        if path.startswith("/api/patients/") and path.endswith("/conversations.txt"):
            try:
                user = auth.authenticated_user(self.headers.get("Authorization"))
                patient_id = int(path.split("/")[3])
                content = auth.export_patient_conversations(user, patient_id)
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Disposition", f'attachment; filename="patient-{patient_id}-conversations.txt"')
                self.end_headers()
                self.wfile.write(content.encode("utf-8"))
            except (ValueError, RuntimeError) as exc:
                self._json_error(403, str(exc))
            except Exception:
                self._json_error(503, "Could not export conversation history.")
            return

        if path.startswith("/api/patients/") and path.endswith("/baseline.txt"):
            try:
                user = auth.authenticated_user(self.headers.get("Authorization"))
                patient_id = int(path.split("/")[3])
                content = auth.export_baseline_report(user, patient_id)
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Disposition", f'attachment; filename="patient-{patient_id}-baseline-assessment.txt"')
                self.end_headers()
                self.wfile.write(content.encode("utf-8"))
            except (ValueError, RuntimeError) as exc:
                self._json_error(403, str(exc))
            except Exception:
                self._json_error(503, "Could not export the baseline assessment.")
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

        if path in ("/api/auth/register", "/api/auth/login"):
            try:
                result = auth.register(data.get("email"), data.get("password"), data.get("role"), data.get("display_name"), data.get("psychologist_id")) if path.endswith("register") else auth.login(data.get("email"), data.get("password"))
                self._set_headers("application/json", status=201 if path.endswith("register") else 200)
                self.wfile.write(json.dumps(result).encode("utf-8"))
            except ValueError as exc:
                self._set_headers("application/json", status=400 if path.endswith("register") else 401)
                self.wfile.write(json.dumps({"error": str(exc)}).encode("utf-8"))
            except Exception as exc:
                print(f"Authentication error: {exc}")
                self._set_headers("application/json", status=503)
                self.wfile.write(json.dumps({"error": "Authentication service unavailable. Check PostgreSQL and server configuration."}).encode("utf-8"))
            return

        try:
            user = auth.authenticated_user(self.headers.get("Authorization"))
        except (ValueError, RuntimeError) as exc:
            self._json_error(401, str(exc))
            return

        if path in ("/api/patients/approval", "/api/appointments/respond"):
            try:
                if path.endswith("approval"):
                    auth.approve_patient(user, int(data.get("patient_id")), data.get("decision"))
                else:
                    auth.respond_appointment(user, int(data.get("appointment_id")), data.get("decision"))
                self._send_json({"success": True})
            except (ValueError, TypeError) as exc:
                self._json_error(400, str(exc))
            return

        if path == "/api/appointments":
            try:
                result = auth.create_appointment(user, data.get("requested_at"), data.get("note"))
                self._send_json(result, status=201)
            except ValueError as exc:
                self._json_error(400, str(exc))
            return

        if path == "/api/baseline":
            try:
                if user["role"] != "patient" or not user["psychologist_id"]:
                    raise ValueError("A patient account with an assigned psychologist is required")
                if auth.baseline_exists(user):
                    raise ValueError("A baseline assessment has already been submitted")
                if data.get("consent") is not True:
                    raise ValueError("Consent is required before sending answers to Gemini")
                answers = data.get("answers")
                if not isinstance(answers, dict) or not answers or len(json.dumps(answers, ensure_ascii=False)) > 30000:
                    raise ValueError("Complete the questionnaire before submitting")
                report = pipeline_instance.gemini_client.generate_baseline_report(answers)
                auth.save_baseline_report(user, report)
                self._send_json({"success": True, "report": report}, status=201)
            except ValueError as exc:
                self._json_error(400, str(exc))
            except RuntimeError as exc:
                self._json_error(503, str(exc))
            except Exception:
                self._json_error(503, "Could not create the baseline report.")
            return

        if path == "/api/query":
            psychologist_preview = user["role"] == "psychologist"
            if not psychologist_preview and user["approval_status"] != "approved":
                self._json_error(403, "Your psychologist must approve your account before you can chat.")
                return
            query = data.get("query", "").strip()
            api_key = data.get("api_key")
            model = data.get("model")

            if api_key:
                pipeline_instance.gemini_client.set_api_key(api_key)
            if model:
                pipeline_instance.gemini_client.set_model(model)

            query_started = time.perf_counter()
            try:
                result = pipeline_instance.process(query)
            except Exception:
                record_query(user["role"], "error", time.perf_counter() - query_started)
                self._json_error(502, "Cognitive processing failed. Please retry.")
                return
            if not psychologist_preview:
                try:
                    session_id = auth.save_conversation(user, data.get("session_id"), query, result.get("final_answer", result.get("response", "")))
                except Exception:
                    record_query(user["role"], "error", time.perf_counter() - query_started)
                    self._json_error(503, "Could not save the conversation. Please retry.")
                    return
                result["session_id"] = session_id
            record_query(user["role"], "success", time.perf_counter() - query_started, result)
            self._send_json(result)
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

    def _send_json(self, payload, status=200):
        self._set_headers("application/json", status=status)
        self.wfile.write(json.dumps(payload, default=str).encode("utf-8"))

    def _json_error(self, status, message):
        self._send_json({"error": message}, status=status)

def run_server(port=None, host=None):
    if port is None:
        port = int(os.environ.get("PORT", 8000))
    if host is None:
        host = os.environ.get("HOST", "0.0.0.0")
    try:
        auth.initialize_auth_database()
    except Exception as exc:
        print(f"PostgreSQL initialization failed: {exc}")
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
