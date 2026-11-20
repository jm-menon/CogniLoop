# CogniLoop: Quantum-Guarded Cognitive Thinking Architecture for Neuropsychology

CogniLoop is an intelligent neuropsychological assistant built on the **Google Gemini** model architecture, fortified with a **Quantum Protective Layer** to eliminate LLM hallucinations and sycophantic distortions. Instead of an unconstrained LLM answer that may amplify panic or hallucinate severe policies, CogniLoop performs structured **Cognitive Thinking & Reality-Testing**, projecting mental states through a **4-Qubit Quantum Hilbert Space** to deliver evidence-grounded, stabilizing answers.

---

## 🌟 The Core Problem & Solution

### The Challenge with Standard LLMs
When a person in distress seeks answers to cognitive or neuropsychological concerns (e.g., catastrophizing workplace delays, mind-reading negative peer intent, or emotional reasoning):
1. **Hallucination**: Standard LLMs can hallucinate rigid organizational termination procedures or catastrophic risks.
2. **Sycophancy**: LLMs often agree with the user's anxious premise (*"You delayed the project, so you should prepare for the worst..."*).
3. **Lack of Calibrated Restructuring**: LLMs either give generic clinical disclaimers or validate panic instead of providing cognitive reframing.

### The CogniLoop Solution
- **Cognitive Thinking Capability**: Decouples the **Factual Anchor** ($q_0$) from the **Catastrophic Leap** ($q_1$), assesses an **Objective Evidence Matrix**, and synthesizes a calibrated, reassuring response.
- **Quantum Protective Layer**: Uses a 4-qubit quantum state vector and **Born Rule Projective Measurement** ($\hat{\Pi}_{\text{grounded}}$) to filter out hallucinations and collapse the cognitive state onto an empirically grounded reality subspace.

---

## 🔬 The Examples in Action

### Example 1: Workplace Catastrophizing
> **User Query:**
> *"I think I delayed the project and my manager will fire me."*
>
> **Unprotected Raw LLM (Intercepted):**
> *"It is true that delaying a critical project deadline can be grounds for immediate termination or disciplinary action in many high-stakes corporate environments. You should check your severance clauses..."*
>
> 🛡️ **Quantum Protective Layer Action:**
> *Elevated distortion detected ($40\%$ subspace risk). Projective operator $\hat{\Pi}_{\text{grounded}}$ engaged.*
>
> **CogniLoop Calibrated Grounded Response:**
> **"Although you have delayed the project, manager will assess the quality of the project and will seek the reason for the delay. An abrupt decision will not be taken. Please do not worry."**

### Example 2: Critical Safety Directive (Thoughts of Suicide -> Psychologist Referral)
> **User Query:**
> *"I am thinking about suicide and I feel like I cannot handle this pain anymore."*
>
> 🚨 **Quantum Protective Emergency Override:**
> *Emergency crisis collapse ($\hat{\Pi}_{\text{psychologist}}$) engaged. Probability amplitudes locked $100\%$ onto the Psychologist Referral & Life-Safety Subspace.*
>
> **CogniLoop Calibrated Response:**
> **"If you are thinking about suicide or feeling overwhelmed, please ask for help from a Psychologist or licensed mental health professional immediately. You do not have to carry this distress alone. Compassionate psychologists and crisis counselors are available to support and guide you through this difficult moment. An abrupt or irreversible decision will not solve this suffering. Please reach out to a Psychologist or contact a crisis helpline right now."**
>
> **Actionable Psychologist & Crisis Resources Provided:**
> • India: Tele-MANAS (14416 / 1800-891-4416) or Vandrevala Foundation (9999 666 555)
> • US / Canada: 988 Suicide & Crisis Lifeline (Call or Text 988)
> • UK: NHS Mental Health (Call 111) or Samaritans (116 123)
> • International: findahelpline.com

---

## ⚛️ Quantum Model Architecture

CogniLoop represents the cognitive appraisal state in a 16-dimensional complex Hilbert space ($\mathcal{H}^{\otimes 4}$):

| Qubit | Semantic Representation | Basis States |
|---|---|---|
| **$q_0$ (Fact Anchor)** | Objective Empirical Reality | $|0\rangle$ = Ungrounded, $|1\rangle$ = Verified Reality |
| **$q_1$ (Distortion)** | Catastrophic Cognitive Leap | $|0\rangle$ = Grounded Appraisal, $|1\rangle$ = Catastrophic Distortion |
| **$q_2$ (Affect Valence)** | Autonomic / Threat Arousal | $|0\rangle$ = Regulated State, $|1\rangle$ = Acute Anxiety / Panic |
| **$q_3$ (Quantum Guard)** | Anti-Hallucination Shield | $|0\rangle$ = Unprotected Drift, $|1\rangle$ = Grounded Subspace Enforced |

### Quantum Circuit Pipeline
```text
q0 (Fact):   |0⟩ ───[ H ]───[ Ry(θ_fact) ]──────●─────────────────────
                                                │ (Controlled-Z)
q1 (Dist):   |0⟩ ───[ H ]───[ Ry(θ_dist) ]───[ ⊕ ]───[ Z ]───●────────
                                               ▲             │ (CNOT)
q2 (Affect): |0⟩ ───[ H ]───[ Ry(θ_aff)  ]─────●             │
                                                             ▼
q3 (Guard):  |0⟩ ───[ H ]───[ Ry(θ_guard)]──────────────────[ ⊕ ]───[ Π_safe ]
```

1. **Hadamard Superposition ($H^{\otimes 4}$)**: Initializes cognitive potentiality across all 16 interpretive configurations.
2. **Parameterized Rotations ($R_y(\theta)$)**: Encodes semantic weights extracted from the query.
3. **Cognitive Entanglement**:
   - $CNOT(q_2, q_1)$: Reflects that high emotional affect non-locally inflates cognitive distortion.
   - $CZ(q_0, q_1)$: Objective factual anchoring cancels distortion phase amplitudes.
   - Entanglement with $q_3$: Engages active quantum suppression.
4. **Quantum Density Matrix & Entropy**:
   $$\rho = |\psi\rangle\langle\psi|, \quad S(\rho) = -\text{Tr}(\rho \log_2 \rho)$$
5. **Born Rule Projective Measurement**:
   $$\hat{\Pi}_{\text{grounded}} = \sum_{x \in \mathcal{S}_{\text{safe}}} |x\rangle\langle x|, \quad P(\text{safe}) = \text{Tr}(\hat{\Pi}_{\text{grounded}} \rho)$$
   If the distortion risk exceeds the threshold, the protective filter discards ungrounded LLM drift and collapses the output onto the safe cognitive subspace.

---

## 🚀 How to Run the App

### PostgreSQL accounts, local setup, and testing

The app uses regular PostgreSQL. It creates the required tables on startup. Passwords are stored as bcrypt hashes, JWTs expire after 12 hours, and each approved patient is linked to one psychologist. Psychologists approve patient accounts, download their assigned patients' transcripts, and accept or decline appointment requests. The database retains each patient's five newest chat sessions; deleting an older session also deletes its messages.

#### 1. Start a local PostgreSQL database

The quickest cross-platform option is Docker:

```bash
docker run --name cogniloop-postgres -e POSTGRES_USER=cogniloop_user -e POSTGRES_PASSWORD=cogniloop_local_pw -e POSTGRES_DB=cogniloop -p 5432:5432 -d postgres:16
```

Or install PostgreSQL 16+ directly (macOS: `brew install postgresql@16`; Ubuntu/Debian: `sudo apt install postgresql`; Windows: use the PostgreSQL installer from postgresql.org), start its service, then create a database and user:

```sql
CREATE USER cogniloop_user WITH PASSWORD 'cogniloop_local_pw';
CREATE DATABASE cogniloop OWNER cogniloop_user;
```

#### 2. Install Python requirements and launch

Python 3.11+ is recommended. From the project directory:

```bash
python3 -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell instead: .venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Set the database connection and a fresh JWT secret in the same terminal:

```bash
export DATABASE_URL='postgresql://cogniloop_user:cogniloop_local_pw@127.0.0.1:5432/cogniloop'
export JWT_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
# Required for first-time patient baseline reports; create a key in Google AI Studio.
export GEMINI_API_KEY='YOUR_GOOGLE_AI_STUDIO_API_KEY'
python run_app.py
```

Windows PowerShell:

```powershell
$env:DATABASE_URL='postgresql://cogniloop_user:cogniloop_local_pw@127.0.0.1:5432/cogniloop'
$env:JWT_SECRET = python -c "import secrets; print(secrets.token_urlsafe(48))"
$env:GEMINI_API_KEY='YOUR_GOOGLE_AI_STUDIO_API_KEY'
python run_app.py
```

The launcher opens `http://127.0.0.1:8000`. Keep PostgreSQL running in the background. This project is Python-based and has no `package.json` or Node install step.

Create a Gemini API key from [Google AI Studio](https://ai.google.dev/gemini-api/docs/get-started). The baseline uses `gemini-3.5-flash-lite`, listed with free-tier input and output on Google's [Gemini API pricing page](https://ai.google.dev/gemini-api/docs/pricing). Free-tier eligibility and quotas can vary, and paid-tier use may incur charges. Patient answers are sent to Google only after the patient checks the consent box; Google states free-tier content may be used to improve its products. CogniLoop stores the generated report in PostgreSQL, not the questionnaire answers. Do not use real clinical details unless that data-use policy is acceptable to the patient and clinic.

The patient profile offers **Background Baseline Assessment** until it has been completed. The generated, persistent report contains its date, general mood, outlook, self esteem, assertion, and stress tolerance. Assigned psychologists can view it in their patient dashboard and download a text copy.

### Locust load test and Grafana comparison

The load test uses synthetic prompts and provisions an isolated cohort: exactly 10 psychologist users and 100 patient users, with 10 patients assigned to each psychologist. The patient group targets about 10 queries/minute total and the psychologist group targets the same rate (one request per patient every 10 minutes and one per psychologist every minute). Actual throughput can differ when requests take longer than their pacing interval. It requires a live `GEMINI_API_KEY`, uses `gemini-3.5-flash-lite` for both sides of the paired comparison, and deletes the uniquely prefixed test accounts and their cascaded session data when Locust stops normally. Use a **test database**, never production.

1. Install load-test dependencies into the project virtual environment:
   ```bash
   pip install -r requirements-loadtest.txt
   ```
2. Start CogniLoop on port 8000 in one terminal (ensure your `.env` contains a test `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_API_KEY`):
   ```bash
   HOST=0.0.0.0 PORT=8000 python backend/server.py
   ```
   PowerShell:
   ```powershell
   $env:HOST='0.0.0.0'; $env:PORT='8000'; python backend/server.py
   ```
3. Start Prometheus and Grafana from the project root in another terminal:
   ```bash
   docker compose -f observability/docker-compose.yml up -d
   ```
   Open Grafana at `http://localhost:3000` (login `admin` / `cogniloop-local`) and open the provisioned **CogniLoop Load & Response Proxies** dashboard. Prometheus is at `http://localhost:9090`; its scrape target is `host.docker.internal:8000/metrics`.
4. Start the balanced headless load test from the project root in a third terminal:
   ```bash
   python -m locust -f loadtest/locustfile.py --host http://127.0.0.1:8000 --headless --users 110 --spawn-rate 10 --run-time 20m --csv cogniloop-load --csv-full-history
   ```
   To use Locust's web interface instead, omit `--headless` and `--run-time`; open `http://localhost:8089`, start 110 users at a spawn rate of 10/sec, and set the run duration as desired. Keep the same `--users 110` total so the fixed cohort remains 10 psychologists and 100 patients.
5. Stop monitoring when finished:
   ```bash
   docker compose -f observability/docker-compose.yml down
   ```

The paired response panel measures wording proxies (empathy phrases, action cues, grounded language, and catastrophic wording), not actual empathy, clinical helpfulness, safety, or patient outcomes. The current comparison is raw Gemini versus CogniLoop's guided cognitive response; the app does **not** contain a quantum-trained model, and this dashboard cannot show that quantum computation improves care. Treat these charts as an engineering smoke test. A quality claim would need a prespecified rubric and blinded review by qualified clinicians. If Gemini rate limits appear, increase `LOADTEST_PSYCH_INTERVAL_SECONDS` and `LOADTEST_PATIENT_INTERVAL_SECONDS` proportionally (for example 120 and 1200) before starting Locust.

If the process is force-killed before Locust's stop hook runs, remove only the synthetic accounts using the `loadtest-<run-id>-` prefix printed by Locust. Normal completion performs this cleanup automatically.

#### 3. Exercise the role and approval flow locally

1. Register a **Psychologist** account with a name, email, and password of at least 12 characters.
2. Sign out, register a **Patient** account, and select that psychologist from the list. The patient's status should show as pending; chat and appointment requests are disabled until approval.
3. Sign out and sign back in as the psychologist. Approve the patient from the dashboard.
4. Sign out and sign in as the patient. Send a few messages and request an appointment.
5. Sign back in as the psychologist. Accept or decline the appointment and download the patient's conversation text file. Each exchange is labeled `patient:` and `bot:`.
6. Sign in as the patient and open **Profile → Background Baseline Assessment**. Fill in any questions you want, review the Gemini data-use notice, and submit. Sign in as the psychologist to view the saved report in that patient's dashboard and download its text file.

The app stores account/profile data, psychologist assignment, appointment requests, and conversation messages. It does not store unrelated application telemetry. Never use real patient data in local development; this basic app does not provide the controls required for regulated clinical records.

For production PostgreSQL, set `DATABASE_URL` and `JWT_SECRET` through a secrets manager and restrict database access to the app. Keep credentials out of source control.

### Local launcher (Windows)

Double-click `run_app.bat` after PostgreSQL is running and environment variables are configured.

### Terminal command

Run:
```bash
python run_app.py
```




---

## 🌐 Features in the Web Interface

1. **Neuropsychological Query Bar, Quick Presets & Gemini Live Voice**:
   - **Gemini Live Voice Input**: Speak your anxious thoughts or cognitive queries directly into CogniLoop using the `🎙️ Speak Query (Gemini Live)` button.
   - **Real-time Audio Visualizer**: Cyberpunk dynamic soundwave visualizer powered by the Web Audio API with a live recording timer.
   - **Streaming Transcription**: Instant live speech-to-text with multimodal audio fallback via Gemini 2.0 Flash (`POST /api/voice-transcribe`).
   - **Auto-Analyze**: Automatically executes the cognitive restructuring and quantum protection pipeline immediately after you finish speaking.
   - **Auditory Grounding (Read Aloud)**: `🔊 Read Aloud` feature reads the Calibrated Grounded Response aloud with a calming, empathetic speech cadence.
   - Preloaded with the primary scenario: *"I think I delayed the project and my manager will fire me."*
   - Includes quick scenario presets for common cognitive distortions (Unanswered Messages, Presentation Stumbles, Interview Rejections, Medical Anxiety).
   - Includes critical crisis safety override for suicide ideation (mandating immediate Psychologist referral).
2. **Grounded Response & Actionable Guidance**:
   - Prominently displays the stabilizing, evidence-grounded answer.
   - Provides concrete behavioral next steps.
3. **Cognitive Thinking Breakdown**:
   - Real-time decomposition of Factual Anchor vs. Catastrophic Leap.
   - Reality-Testing Matrix comparing subjective fear against organizational reality.
4. **Quantum Protective Model Inspector**:
   - **Before vs. After**: Comparison of raw ungrounded LLM output vs. quantum-protected output.
   - **Interactive Quantum Circuit**: Visualizes the 4-qubit gate sequence.
   - **Bloch Sphere Projections**: 3D-like polar coordinate $(\theta, \phi)$ and vector purity display for each qubit.
   - **State Vector Superposition Chart**: Displays Born rule probabilities for all 16 basis states ($|0000\rangle \dots |1111\rangle$).

---

## 📚 DBT Context Guide for Psychologists (Linehan Clinical Framework)

CogniLoop integrates `database/dbt_therapy_guidelines_qr_database.json` as an authoritative context reference for answering any new query typed into the system. Based on the clinical framework authored by **Marsha M. Linehan, PhD**, the system executes a 3-stage grounding workflow:

1. **Arousal-Level Routing & Guardrails**:
   - **High Arousal (7-10)**: Routes to Distress Tolerance somatic skills (**TIPP**, **STOP**). Prevents premature cognitive reframing while the nervous system is in physiological alarm.
   - **Moderate Arousal (3-6)**: Routes to **Emotion Regulation** (**Check the Facts**, **Opposite Action**, **PLEASE**, **ABC**), **Interpersonal Effectiveness** (**DEAR MAN**, **GIVE**, **FAST**), or **Radical Acceptance**.
   - **Crisis Safety Protocol**: Immediate pause and override directing the user to ask for help from a licensed **Psychologist** or crisis lifelines.
2. **Linehan Validation-Before-Change Rule**:
   - Every response adheres to the core dialectic: Radical Validation ("Although [acknowledged reality]...") $\to$ Dialectical Reality Balance $\to$ Concrete Skill Coaching Prompt.
3. **Clinical Skills Covered in Context**:
   - **Interpersonal Effectiveness**: `DEAR MAN`, `GIVE`, `FAST`
   - **Distress Tolerance**: `TIPP`, `STOP`, `ACCEPTS`, `Radical Acceptance`
   - **Emotion Regulation**: `Check the Facts`, `Opposite Action`, `PLEASE`, `ABC (Cope Ahead)`
   - **Mindfulness**: `Wise Mind`, `What & How Skills (Observe, Describe Non-judgmentally)`

---

## ☁️ Deploying to Google Cloud Run

CogniLoop includes a container configuration for **Google Cloud Run**. The container installs the Python requirements listed in `requirements.txt`. Configure a reachable PostgreSQL database and provide `DATABASE_URL` and `JWT_SECRET` through Cloud Run secrets before using account features.

### Option 1: 1-Click Deploy via Google Cloud Shell (No Local Installation)
1. Open [Google Cloud Shell](https://shell.cloud.google.com) in your browser.
2. Upload this `CogniLoop` project directory or clone it into Cloud Shell:
   ```bash
   cd CogniLoop
   ```
3. Run the automated deployment script:
   ```bash
   bash deploy_cloud_run.sh
   ```
   Or run the one-line `gcloud` deploy command:
   ```bash
   gcloud run deploy cogniloop \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --memory 512Mi \
     --cpu 1
   ```
4. Cloud Build will build the container and output your live HTTPS URL (e.g., `https://cogniloop-xxxxx-uc.a.run.app`).

---

### Option 2: Deploy from Windows / macOS / Linux Local Terminal
1. Ensure the Google Cloud SDK (`gcloud`) is installed:
   - **Windows**: `winget install Google.CloudSDK` or [download installer](https://cloud.google.com/sdk/docs/install)
   - **macOS**: `brew install google-cloud-sdk`
   - **Linux**: `sudo apt install google-cloud-cli`
2. Initialize and authenticate your Google Cloud account:
   ```bash
   gcloud init
   ```
3. Enable the required Google Cloud APIs:
   ```bash
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```
4. Run the automated deployment script:
   - On Windows: Double-click or run `deploy_cloud_run.bat`
   - On Linux/macOS: Run `bash deploy_cloud_run.sh`

---

### Option 3: Local Docker Build & Run (Testing Locally)
To test the production container locally before deploying:
```bash
# Build the Docker image (automatically runs test_pipeline.py during build)
docker build -t cogniloop .

# Run the container locally on port 8080
docker run -p 8080:8080 cogniloop
```
Open `http://localhost:8080` in your browser.

---

### Cloud Run Service Configuration & Probes
- **HTTP Port**: Dynamically binds to the Cloud Run `$PORT` environment variable (`8080` by default).
- **Health Checks & Probes**:
  - `GET /api/health` — Responds with status `200 OK` and health telemetry (`{"status": "healthy", "quantum_model": "4-Qubit Projective Layer"}`).
- **Declarative Deployment**: You can also deploy using the included Knative manifest:
  ```bash
  gcloud run services replace cloudrun.yaml
  ```
- **Optional Environment Variables**:
  - `GEMINI_API_KEY`: Provide via Secret Manager. Baseline report generation requires this key and uses `gemini-3.5-flash-lite`; live cognitive replies also use it when configured.

---

## 📁 Project Structure

```
CogniLoop/
├── database/
│   └── dbt_therapy_guidelines_qr_database.json # Linehan DBT guidelines context reference
├── backend/
│   ├── quantum_engine.py           # 4-Qubit Hilbert Space, Density Matrix & Born Rule
│   ├── cognitive_engine.py         # Neuropsychological engine with DBT context matcher
│   ├── gemini_client.py            # Gemini client with DBT-grounded cognitive prompts
│   ├── protective_pipeline.py      # Master orchestrator combining Gemini + Quantum Layer
│   ├── auth.py                     # PostgreSQL roles, approvals, appointments, baseline reports, and chat history
│   └── server.py                   # Multithreaded HTTP server with REST APIs
├── frontend/
│   ├── index.html                  # Dark-mode UI with DBT Context & Quantum Inspector
│   ├── style.css                   # Glassmorphic CSS styling & DBT step flow
│   └── app.js                      # Dynamic client with SVG Bloch spheres & circuit diagrams
├── Dockerfile                      # Production Docker container definition for Cloud Run
├── requirements.txt                # Python dependencies, including PostgreSQL and auth packages
├── .env.example                    # PostgreSQL and JWT configuration template
├── loadtest/locustfile.py           # Balanced synthetic 10 psychologist / 100 patient cohort
├── observability/                   # Prometheus scrape config and provisioned Grafana dashboard
├── .dockerignore                   # Docker build exclusions
├── cloudrun.yaml                   # Knative service specification for Cloud Run
├── deploy_cloud_run.bat            # 1-click Cloud Run deployment script for Windows
├── deploy_cloud_run.sh             # Cloud Run deployment script for Linux / Cloud Shell
├── run_app.py                      # Application launcher with automatic browser opening
├── run_app.bat                     # 1-click Windows launcher
└── test_pipeline.py                # Comprehensive test suite (Quantum, DBT Matching, Crisis)
```
