"""PostgreSQL user, approval, appointment, and conversation persistence."""
import os
import re
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

DATABASE_URL = os.environ.get("DATABASE_URL", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "")


def _connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=10)


def initialize_auth_database():
    if not DATABASE_URL:
        return
    with _connection() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'patient'
                CHECK (role IN ('psychologist','patient')),
            display_name TEXT NOT NULL DEFAULT '', psychologist_id BIGINT REFERENCES users(id),
            approval_status TEXT NOT NULL DEFAULT 'approved'
                CHECK (approval_status IN ('approved','pending','declined')),
            approved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )""")
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'patient'")
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT ''")
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS psychologist_id BIGINT REFERENCES users(id)")
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'")
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ")
        # An approved label without an explicit approval event is legacy/default data,
        # not evidence that a psychologist approved the patient.
        conn.execute("UPDATE users SET approval_status='pending' WHERE role='patient' AND approval_status='approved' AND approved_at IS NULL")
        conn.execute("""CREATE TABLE IF NOT EXISTS conversation_sessions (
            id BIGSERIAL PRIMARY KEY, patient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS conversation_messages (
            id BIGSERIAL PRIMARY KEY, session_id BIGINT NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
            speaker TEXT NOT NULL CHECK (speaker IN ('patient','bot')), body TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS appointment_requests (
            id BIGSERIAL PRIMARY KEY, patient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            psychologist_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            requested_at TIMESTAMPTZ NOT NULL, note TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS baseline_assessments (
            id BIGSERIAL PRIMARY KEY,
            patient_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            psychologist_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            report JSONB NOT NULL,
            model TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )""")


def _validate_config():
    if not JWT_SECRET or len(JWT_SECRET) < 32:
        raise RuntimeError("Set JWT_SECRET to a random value of at least 32 characters")


def _token(user):
    _validate_config()
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(user["id"]), "iat": now, "exp": now + timedelta(minutes=5)}, JWT_SECRET, algorithm="HS256")


def _public_user(user):
    return {key: user[key] for key in ("id", "email", "role", "display_name", "psychologist_id", "approval_status")}


def register(email, password, role, display_name, psychologist_id=None):
    _validate_config()
    email = (email or "").strip().lower()
    role = (role or "").strip().lower()
    display_name = (display_name or "").strip()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise ValueError("Enter a valid email address")
    if not isinstance(password, str) or len(password) < 12:
        raise ValueError("Password must be at least 12 characters")
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must be no more than 72 UTF-8 bytes")
    if role not in ("psychologist", "patient"):
        raise ValueError("Choose psychologist or patient")
    if len(display_name) < 2:
        raise ValueError("Enter your name")
    if role == "patient" and not psychologist_id:
        raise ValueError("Patients must select a psychologist")
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    status = "pending" if role == "patient" else "approved"
    try:
        with _connection() as conn:
            if role == "patient":
                psych = conn.execute("SELECT id FROM users WHERE id=%s AND role='psychologist'", (psychologist_id,)).fetchone()
                if not psych:
                    raise ValueError("Select a psychologist from the available list")
            user = conn.execute("""INSERT INTO users (email,password_hash,role,display_name,psychologist_id,approval_status)
                VALUES (%s,%s,%s,%s,%s,%s) RETURNING id,email,role,display_name,psychologist_id,approval_status""",
                (email, password_hash, role, display_name, psychologist_id if role == "patient" else None, status)).fetchone()
    except psycopg.errors.UniqueViolation:
        raise ValueError("An account with that email already exists")
    return {"user": _public_user(user), "token": _token(user)}


def login(email, password):
    _validate_config()
    if not isinstance(password, str) or len(password.encode("utf-8")) > 72:
        raise ValueError("Invalid email or password")
    with _connection() as conn:
        user = conn.execute("SELECT * FROM users WHERE email=%s", ((email or "").strip().lower(),)).fetchone()
    if not user or not bcrypt.checkpw((password or "").encode(), user["password_hash"].encode()):
        raise ValueError("Invalid email or password")
    return {"user": _public_user(user), "token": _token(user)}


def authenticated_user(authorization):
    _validate_config()
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise ValueError("Authentication required")
    try:
        claims = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise ValueError("Invalid or expired login session")
    with _connection() as conn:
        user = conn.execute("SELECT id,email,role,display_name,psychologist_id,approval_status FROM users WHERE id=%s", (claims["sub"],)).fetchone()
    if not user:
        raise ValueError("Account not found")
    return dict(user)


def list_psychologists():
    with _connection() as conn:
        return [dict(row) for row in conn.execute("SELECT id,display_name FROM users WHERE role='psychologist' ORDER BY display_name").fetchall()]


def dashboard(user):
    with _connection() as conn:
        if user["role"] == "psychologist":
            patients = conn.execute("""SELECT u.id,u.display_name,u.email,u.approval_status,
                b.report AS baseline_report,b.created_at AS baseline_created_at
                FROM users u LEFT JOIN baseline_assessments b ON b.patient_id=u.id
                WHERE u.psychologist_id=%s ORDER BY u.display_name""", (user["id"],)).fetchall()
            appointments = conn.execute("""SELECT a.id,a.patient_id,p.display_name AS patient_name,a.requested_at,a.note,a.status
                FROM appointment_requests a JOIN users p ON p.id=a.patient_id WHERE a.psychologist_id=%s ORDER BY a.requested_at""", (user["id"],)).fetchall()
            return {"patients": [dict(x) for x in patients], "appointments": [dict(x) for x in appointments]}
        psych = conn.execute("SELECT display_name FROM users WHERE id=%s", (user["psychologist_id"],)).fetchone() if user["psychologist_id"] else None
        appointments = conn.execute("SELECT id,requested_at,note,status FROM appointment_requests WHERE patient_id=%s ORDER BY created_at DESC", (user["id"],)).fetchall()
        baseline = conn.execute("SELECT created_at FROM baseline_assessments WHERE patient_id=%s", (user["id"],)).fetchone()
        return {"psychologist_name": psych["display_name"] if psych else None, "baseline_complete": bool(baseline), "baseline_created_at": baseline["created_at"] if baseline else None, "appointments": [dict(x) for x in appointments]}


def baseline_exists(user):
    if user["role"] != "patient" or not user["psychologist_id"]:
        raise ValueError("Patient account with an assigned psychologist required")
    with _connection() as conn:
        return conn.execute("SELECT 1 FROM baseline_assessments WHERE patient_id=%s", (user["id"],)).fetchone() is not None


def save_baseline_report(user, report):
    if user["role"] != "patient" or not user["psychologist_id"]:
        raise ValueError("A patient account with an assigned psychologist is required")
    try:
        report_fields = ("title", "date", "general_mood", "outlook", "self_esteem", "assertion", "stress_tolerance")
        stored_report = {key: report[key] for key in report_fields}
        with _connection() as conn:
            conn.execute("INSERT INTO baseline_assessments (patient_id,psychologist_id,report,model) VALUES (%s,%s,%s,%s)",
                         (user["id"], user["psychologist_id"], Jsonb(stored_report), report["model"]))
    except psycopg.errors.UniqueViolation:
        raise ValueError("A baseline assessment has already been submitted for this patient")


def export_baseline_report(user, patient_id):
    if user["role"] != "psychologist":
        raise ValueError("Psychologist account required")
    with _connection() as conn:
        row = conn.execute("""SELECT u.display_name,b.report FROM baseline_assessments b
            JOIN users u ON u.id=b.patient_id
            WHERE b.patient_id=%s AND b.psychologist_id=%s""", (patient_id, user["id"])).fetchone()
    if not row:
        raise ValueError("Baseline assessment not found")
    report = row["report"]
    labels = (("date", "Date"), ("general_mood", "General mood"), ("outlook", "Outlook"),
              ("self_esteem", "Self esteem"), ("assertion", "Assertion"), ("stress_tolerance", "Stress tolerance"))
    lines = ["Baseline Assessment", f"Patient: {row['display_name']}"]
    lines.extend(f"{label}: {report.get(key, '')}" for key, label in labels)
    return "\n".join(lines) + "\n"


def approve_patient(user, patient_id, decision):
    if user["role"] != "psychologist" or decision not in ("approved", "declined"):
        raise ValueError("Invalid patient approval action")
    with _connection() as conn:
        result = conn.execute("UPDATE users SET approval_status=%s, approved_at=%s WHERE id=%s AND psychologist_id=%s AND role='patient' AND approval_status='pending' RETURNING id", (decision, datetime.now(timezone.utc) if decision == "approved" else None, patient_id, user["id"]))
        if not result.fetchone():
            raise ValueError("Patient not found for this psychologist")


def create_appointment(user, requested_at, note):
    if user["role"] != "patient" or user["approval_status"] != "approved" or not user["psychologist_id"]:
        raise ValueError("Only approved patients can request appointments")
    try:
        when = datetime.fromisoformat(requested_at.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        raise ValueError("Choose a valid appointment date and time")
    if when.tzinfo is None:
        raise ValueError("Appointment date must include a timezone")
    if when <= datetime.now(timezone.utc):
        raise ValueError("Appointment must be in the future")
    with _connection() as conn:
        row = conn.execute("INSERT INTO appointment_requests (patient_id,psychologist_id,requested_at,note) VALUES (%s,%s,%s,%s) RETURNING id", (user["id"], user["psychologist_id"], when, (note or "")[:1000])).fetchone()
    return dict(row)


def respond_appointment(user, appointment_id, decision):
    if user["role"] != "psychologist" or decision not in ("accepted", "declined"):
        raise ValueError("Invalid appointment response")
    with _connection() as conn:
        row = conn.execute("UPDATE appointment_requests SET status=%s WHERE id=%s AND psychologist_id=%s AND status='pending' RETURNING id", (decision, appointment_id, user["id"])).fetchone()
        if not row:
            raise ValueError("Pending appointment request not found")


def save_conversation(user, session_id, patient_text, bot_text):
    if user["role"] != "patient" or user["approval_status"] != "approved":
        raise ValueError("Your psychologist must approve your account before you can chat")
    with _connection() as conn:
        if session_id:
            session = conn.execute("SELECT id FROM conversation_sessions WHERE id=%s AND patient_id=%s", (session_id, user["id"])).fetchone()
        else:
            session = None
        if not session:
            session = conn.execute("INSERT INTO conversation_sessions (patient_id) VALUES (%s) RETURNING id", (user["id"],)).fetchone()
        conn.execute("INSERT INTO conversation_messages (session_id,speaker,body) VALUES (%s,'patient',%s),(%s,'bot',%s)", (session["id"], patient_text, session["id"], bot_text))
        conn.execute("""DELETE FROM conversation_sessions WHERE patient_id=%s AND id NOT IN
            (SELECT id FROM conversation_sessions WHERE patient_id=%s ORDER BY started_at DESC,id DESC LIMIT 5)""", (user["id"], user["id"]))
        return session["id"]


def export_patient_conversations(user, patient_id):
    if user["role"] != "psychologist":
        raise ValueError("Psychologist account required")
    with _connection() as conn:
        patient = conn.execute("SELECT id,display_name FROM users WHERE id=%s AND psychologist_id=%s AND role='patient' AND approval_status='approved'", (patient_id, user["id"])).fetchone()
        if not patient:
            raise ValueError("Approved patient not found")
        rows = conn.execute("""SELECT s.id AS session_id,s.started_at,m.speaker,m.body,m.created_at
            FROM conversation_sessions s LEFT JOIN conversation_messages m ON m.session_id=s.id
            WHERE s.patient_id=%s ORDER BY s.started_at,m.created_at""", (patient_id,)).fetchall()
    lines = [f"Conversation history for {patient['display_name']} (latest 5 sessions)"]
    last_session = None
    for row in rows:
        if row["session_id"] != last_session:
            lines.append(f"\n--- Session {row['session_id']} | {row['started_at'].isoformat()} ---")
            last_session = row["session_id"]
        if row["speaker"]:
            lines.append(f"{row['speaker']}: {row['body']}")
    return "\n".join(lines) + "\n"
