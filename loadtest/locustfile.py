"""Synthetic 10-psychologist / 100-patient balanced Locust cohort.

Run as a standalone Locust process. Accounts are provisioned at test start and
deleted by the unique run prefix at normal test stop. Use only a test database.
"""
import os
import random
import threading
import uuid
from pathlib import Path

import gevent
import psycopg
import requests
from dotenv import load_dotenv
from locust import HttpUser, constant_pacing, events, task

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

RUN_ID = os.environ.get("LOADTEST_RUN_ID", uuid.uuid4().hex[:10])
EMAIL_PREFIX = f"loadtest-{RUN_ID}-"
PASSWORD = f"LoadTest-{RUN_ID}-Strong-Password"
PSYCHOLOGISTS = []
PATIENTS = []
_psych_index = 0
_patient_index = 0
_index_lock = threading.Lock()

PSYCH_INTERVAL = float(os.environ.get("LOADTEST_PSYCH_INTERVAL_SECONDS", "60"))
PATIENT_INTERVAL = float(os.environ.get("LOADTEST_PATIENT_INTERVAL_SECONDS", "600"))
GEMINI_MODEL = os.environ.get("LOADTEST_GEMINI_MODEL", "gemini-3.5-flash-lite")


def _post(session, base_url, path, payload, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    response = session.post(f"{base_url}{path}", json=payload, headers=headers, timeout=45)
    if not response.ok:
        raise RuntimeError(f"{path} returned HTTP {response.status_code}: {response.text[:250]}")
    return response.json()


def _cleanup():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("LOAD TEST CLEANUP: DATABASE_URL missing; remove run accounts manually.")
        return
    try:
        with psycopg.connect(database_url, connect_timeout=10) as connection:
            connection.execute("DELETE FROM users WHERE email LIKE %s", (EMAIL_PREFIX + "patient-%",))
            connection.execute("DELETE FROM users WHERE email LIKE %s", (EMAIL_PREFIX + "psychologist-%",))
        print(f"LOAD TEST CLEANUP: removed synthetic users for run {RUN_ID}.")
    except Exception as exc:
        print(f"LOAD TEST CLEANUP FAILED for run {RUN_ID}: {exc}")


@events.test_start.add_listener
def provision_cohort(environment, **kwargs):
    base_url = (environment.host or os.environ.get("LOADTEST_BASE_URL", "http://127.0.0.1:8000")).rstrip("/")
    session = requests.Session()
    try:
        if not os.environ.get("DATABASE_URL"):
            raise RuntimeError("Set DATABASE_URL in .env or the Locust environment for safe account cleanup")
        health_response = session.get(f"{base_url}/api/health", timeout=10)
        health_response.raise_for_status()
        health = health_response.json()
        if not health.get("gemini_configured"):
            raise RuntimeError("GEMINI_API_KEY is not configured; refusing to compare simulated output with live Gemini")

        for index in range(10):
            email = f"{EMAIL_PREFIX}psychologist-{index:02d}@example.test"
            result = _post(session, base_url, "/api/auth/register", {
                "email": email, "password": PASSWORD, "display_name": f"Load Psychologist {index + 1}", "role": "psychologist"
            })
            PSYCHOLOGISTS.append({"id": result["user"]["id"], "token": result["token"]})

        for index in range(100):
            psych = PSYCHOLOGISTS[index % len(PSYCHOLOGISTS)]
            email = f"{EMAIL_PREFIX}patient-{index:03d}@example.test"
            result = _post(session, base_url, "/api/auth/register", {
                "email": email, "password": PASSWORD, "display_name": f"Load Patient {index + 1}",
                "role": "patient", "psychologist_id": psych["id"]
            })
            PATIENTS.append({"id": result["user"]["id"], "token": result["token"]})

        for index, patient in enumerate(PATIENTS):
            psych = PSYCHOLOGISTS[index % len(PSYCHOLOGISTS)]
            _post(session, base_url, "/api/patients/approval", {
                "patient_id": patient["id"], "decision": "approved"
            }, psych["token"])
        print(f"LOAD TEST COHORT READY: 10 psychologists, 100 patients, run id {RUN_ID}; assignments are evenly distributed.")
        print("TARGET GROUP RATES: approximately 10 patient queries/min and 10 psychologist queries/min; response latency can lower either rate.")
    except Exception as exc:
        _cleanup()
        print(f"LOAD TEST SETUP FAILED: {exc}")
        if environment.runner:
            environment.runner.quit()


@events.test_stop.add_listener
def cleanup_cohort(environment, **kwargs):
    _cleanup()


class _CohortUser(HttpUser):
    abstract = True
    fixture_queries = (
        "I made a small mistake at work and worry my team now doubts me.",
        "A friend has not replied today and I am afraid the friendship is ending.",
        "I feel tense about an upcoming presentation and keep imagining it going badly.",
        "I am disappointed about a setback and unsure what a useful next step might be.",
        "I am overwhelmed by several tasks and want help deciding where to begin.",
    )

    def _attach_account(self, accounts, is_psychologist):
        global _psych_index, _patient_index
        with _index_lock:
            if is_psychologist:
                index = _psych_index
                _psych_index += 1
            else:
                index = _patient_index
                _patient_index += 1
        self.account = accounts[index % len(accounts)]
        self.token = self.account["token"]
        self.session_id = None
        # Spread the first call across the user's pacing period so the 100:10
        # cohort does not create a 10:1 startup burst.
        gevent.sleep(random.uniform(0, self.interval_seconds))

    @task
    def cognitive_query(self):
        payload = {"query": random.choice(self.fixture_queries), "model": GEMINI_MODEL}
        if self.session_id:
            payload["session_id"] = self.session_id
        with self.client.post(
            "/api/query", json=payload,
            headers={"Authorization": f"Bearer {self.token}"},
            name="/api/query", catch_response=True,
        ) as response:
            if response.status_code != 200:
                response.failure(f"HTTP {response.status_code}")
                return
            try:
                data = response.json()
                if self.role_name == "patient":
                    self.session_id = data.get("session_id")
                if data.get("raw_llm_comparison", {}).get("source") != "live_gemini":
                    response.failure("Raw comparator fell back to simulated output")
            except Exception:
                response.failure("Invalid query response")


class PsychologistLoadUser(_CohortUser):
    fixed_count = 10
    role_name = "psychologist"
    interval_seconds = PSYCH_INTERVAL
    wait_time = constant_pacing(PSYCH_INTERVAL)

    def on_start(self):
        self._attach_account(PSYCHOLOGISTS, True)


class PatientLoadUser(_CohortUser):
    fixed_count = 100
    role_name = "patient"
    interval_seconds = PATIENT_INTERVAL
    wait_time = constant_pacing(PATIENT_INTERVAL)

    def on_start(self):
        self._attach_account(PATIENTS, False)
