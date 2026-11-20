/**
 * frontend/app.js
 * Interactive Client for CogniLoop: Quantum-Guarded Cognitive Thinking.
 */

document.addEventListener("DOMContentLoaded", () => {
  const authForm = document.getElementById("authForm");
  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const authName = document.getElementById("authName");
  const authRole = document.getElementById("authRole");
  const psychologistSelect = document.getElementById("psychologistSelect");
  const authStatus = document.getElementById("authStatus");
  const authTitle = document.getElementById("authTitle");
  const authSwitch = document.getElementById("authSwitch");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const headerSignOut = document.getElementById("headerSignOut");
  const landingView = document.getElementById("landingView");
  const accountDashboard = document.getElementById("accountDashboard");
  const patientProfile = document.getElementById("patientProfile");
  const therapyWorkspace = document.getElementById("therapyWorkspace");
  const appNav = document.getElementById("appNav");
  const previewBanner = document.getElementById("previewBanner");
  const baselineAssessment = document.getElementById("baselineAssessment");
  const baselineQuestionsContainer = document.getElementById("baselineQuestions");
  const baselineStatus = document.getElementById("baselineStatus");
  const baselineConsent = document.getElementById("baselineConsent");
  const themeToggle = document.getElementById("themeToggle");
  const registerOnly = document.querySelectorAll(".register-only");
  let authToken = localStorage.getItem("cogniloop_auth_token") || "";
  let currentUser = null;
  let registerMode = false;
  let psychologistPreview = false;
  const intakeSections = [
    ["Presenting concern and goals", ["What brings you in today? Why now?", "When did this start, and has it changed over time?", "How does it affect your daily life: work, relationships, sleep, health?", "What have you tried so far, and what helped or didn’t?", "What would you like to be different after therapy?"]],
    ["Current symptoms (baseline)", ["How has your mood been over the past two weeks? Any loss of interest or pleasure?", "Do you worry a lot, have panic episodes, or avoid certain situations?", "Any recent changes in sleep, appetite, energy, or concentration?", "Have you had periods of unusually high energy, little need for sleep, or racing thoughts?", "Any unusual experiences, such as hearing or seeing things others don’t, or feeling watched or followed?", "Any intrusive thoughts, compulsive behaviors, or rituals?"]],
    ["Safety and risk", ["Have you had thoughts of wanting to die or ending your life? When was the last time?", "Have you ever made a plan or attempted? Do you have access to means?", "Any thoughts of harming yourself in other ways, or of harming others?", "What keeps you going? What are your reasons for living?", "Do you feel safe at home and in your relationships?"]],
    ["Psychiatric and treatment history", ["Have you seen a therapist or psychiatrist before? What was helpful or unhelpful?", "Any prior diagnoses, hospitalizations, or medications? How did you respond?", "Is there a family history of mental health conditions, suicide, or substance use?"]],
    ["Medical history", ["Any current medical conditions, chronic pain, or recent illnesses or injuries, including head injury?", "What medications and supplements do you take?", "How do you usually sleep?", "How are your exercise, diet, and general self-care?"]],
    ["Substance use", ["How often do you drink alcohol? Has anyone expressed concern about it?", "Do you use cannabis, nicotine, or other substances, including non-prescribed medications?", "Has substance use affected your work, health, or relationships? Have you tried to cut down?"]],
    ["Developmental and family background", ["Tell me about your upbringing: who raised you, and what was home like?", "How were emotions handled in your family?", "Were there significant losses, separations, moves, or hardships in childhood?", "Is there anything from your past, such as abuse, neglect, or other traumatic events, you feel is relevant? Share only what feels okay."]],
    ["Social and relational context", ["Who is in your life now: partner, family, friends? Who can you lean on?", "How would you describe your closest relationships? Any recurring conflicts or patterns?", "Do you feel lonely or isolated?"]],
    ["Education, work, and daily functioning", ["What’s your educational and work background? How is work going?", "Any current financial, legal, or housing stressors?", "What does a typical day look like?"]],
    ["Strengths, values, and culture", ["What are you good at? What are you proud of?", "What gives your life meaning? What are your values or beliefs, spiritual or otherwise?", "How would you describe your cultural background, and does it shape how you see this problem?", "How do you and the people around you understand what you’re going through? What do you think is causing it?"]],
    ["Expectations and readiness", ["What do you expect therapy to look like? Any worries about it?", "On a scale of 1–10, how ready do you feel to make changes right now?"]],
    ["Close", ["Is there anything I haven’t asked that you think I should know?"]]
  ];
  intakeSections.forEach(([sectionTitle, prompts], sectionIndex) => {
    const details = document.createElement("details"); details.className = "intake-section"; details.open = sectionIndex === 0;
    const summary = document.createElement("summary"); summary.textContent = `${String(sectionIndex + 1).padStart(2, "0")}  ${sectionTitle}`; details.appendChild(summary);
    prompts.forEach((prompt, questionIndex) => {
      const key = `section_${sectionIndex + 1}_question_${questionIndex + 1}`;
      const label = document.createElement("label"); label.className = "intake-question"; label.htmlFor = key; label.textContent = prompt;
      const textarea = document.createElement("textarea"); textarea.id = key; textarea.dataset.answerKey = key; textarea.dataset.question = prompt; textarea.maxLength = 500; textarea.rows = 2; textarea.placeholder = "Your answer (optional)";
      details.append(label, textarea);
    });
    baselineQuestionsContainer.appendChild(details);
  });

  function setAuthMode(isRegister) {
    registerMode = isRegister;
    authTitle.textContent = isRegister ? "Create your account" : "Welcome back";
    authStatus.textContent = isRegister ? "A little about you, then you’re in." : "Sign in to continue to CogniLoop.";
    loginBtn.classList.toggle("hidden", isRegister);
    registerBtn.classList.toggle("hidden", !isRegister);
    authSwitch.innerHTML = isRegister ? 'Already have an account? <button type="button" id="showLoginBtn">Sign in</button>' : 'New to CogniLoop? <button type="button" id="showRegisterBtn">Create an account</button>';
    registerOnly.forEach((field) => { field.hidden = !isRegister || (field.id === "psychologistSelect" && authRole.value !== "patient"); });
  }

  function setSignedIn(user) {
    const isNewView = !currentUser;
    currentUser = user;
    document.body.classList.toggle("patient-space", !!user && user.role === "patient");
    landingView.hidden = !!user;
    headerSignOut.classList.toggle("hidden", !user);
    document.querySelectorAll("[data-auth-only]").forEach((item) => item.classList.toggle("hidden", !user));
    appNav.hidden = !user || user.role !== "patient";
    if (!user) {
      accountDashboard.hidden = true; patientProfile.hidden = true; therapyWorkspace.hidden = true;
      previewBanner.hidden = true; baselineAssessment.hidden = true; psychologistPreview = false;
      return;
    }
    if (user.role === "psychologist") document.getElementById("baselinePrompt")?.remove();
    if (user.role === "patient") {
      accountDashboard.hidden = true;
      if (isNewView) {
        patientProfile.hidden = user.approval_status === "approved";
        therapyWorkspace.hidden = user.approval_status !== "approved";
      }
      appNav.hidden = user.approval_status !== "approved";
      previewBanner.hidden = true;
    } else {
      accountDashboard.hidden = false;
      patientProfile.hidden = true;
      therapyWorkspace.hidden = !psychologistPreview;
      appNav.hidden = true;
      previewBanner.hidden = !psychologistPreview;
    }
  }

  setAuthMode(false);
  setSignedIn(null);
  authRole.addEventListener("change", () => { psychologistSelect.hidden = !registerMode || authRole.value !== "patient"; });
  fetch("/api/psychologists").then((response) => response.json()).then((data) => {
    for (const person of data.psychologists || []) {
      const option = document.createElement("option"); option.value = person.id; option.textContent = person.display_name;
      psychologistSelect.appendChild(option);
    }
  }).catch(() => {});
  fetch("/api/auth/config").then((response) => response.json()).then((config) => {
    if (!config.configured) authStatus.textContent = "Server setup needed: configure DATABASE_URL and JWT_SECRET before signing in.";
  }).catch(() => {});

  authForm.addEventListener("submit", (event) => { event.preventDefault(); authenticate("login"); });
  authSwitch.addEventListener("click", (event) => {
    if (event.target.closest("#showRegisterBtn")) setAuthMode(true);
    if (event.target.closest("#showLoginBtn")) setAuthMode(false);
  });
  registerBtn.addEventListener("click", () => authenticate("register"));
  authRole.addEventListener("change", () => setAuthMode(registerMode));
  headerSignOut.addEventListener("click", signOut);
  document.getElementById("profileNav").addEventListener("click", () => { therapyWorkspace.hidden = true; patientProfile.hidden = false; });
  document.getElementById("therapyNav").addEventListener("click", () => { patientProfile.hidden = true; therapyWorkspace.hidden = false; });
  document.getElementById("backToProfile").addEventListener("click", () => { baselineAssessment.hidden = true; patientProfile.hidden = false; });
  document.getElementById("submitBaseline").addEventListener("click", submitBaselineAssessment);
  document.getElementById("backToDashboard").addEventListener("click", () => { psychologistPreview = false; therapyWorkspace.hidden = true; previewBanner.hidden = true; accountDashboard.hidden = false; });
  themeToggle.addEventListener("click", toggleTheme);
  function applyTheme(theme) {
    document.body.classList.toggle("light-theme", theme === "light");
    document.body.classList.toggle("dark-theme", theme !== "light");
    themeToggle.textContent = theme === "light" ? "🌙" : "☀️";
    localStorage.setItem("cogniloop_theme", theme);
  }
  function toggleTheme() { applyTheme(document.body.classList.contains("light-theme") ? "dark" : "light"); }
  applyTheme(localStorage.getItem("cogniloop_theme") || "light");
  function signOut() {
    authToken = ""; currentUser = null; psychologistPreview = false;
    localStorage.removeItem("cogniloop_auth_token");
    localStorage.removeItem("cogniloop_session_id");
    setSignedIn(null); setAuthMode(false);
  }

  async function authenticate(action) {
    authStatus.textContent = "Connecting securely…";
    try {
      const payload = { email: authEmail.value, password: authPassword.value };
      if (action === "register") {
        if (!authName.value.trim()) throw new Error("Enter your name to register");
        payload.display_name = authName.value.trim(); payload.role = authRole.value;
        payload.psychologist_id = psychologistSelect.value || null;
      }
      const response = await fetch(`/api/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign in");
      authToken = result.token; localStorage.setItem("cogniloop_auth_token", authToken);
      authPassword.value = "";
      psychologistPreview = false;
      if (result.user.role === "psychologist") localStorage.removeItem("cogniloop_session_id");
      if (result.user.role === "patient") localStorage.removeItem("cogniloop_session_id");
      await loadDashboard();
      if (result.user.role === "patient" && result.user.approval_status === "approved") executeCognitivePipeline(queryInput.value.trim());
    } catch (error) { authStatus.textContent = error.message; }
  }

  async function loadDashboard() {
    const response = await fetch("/api/dashboard", { headers: { "Authorization": `Bearer ${authToken}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load account");
    setSignedIn(data.user);
    if (data.user.role === "psychologist") {
      const patientsHtml = data.patients.map((p) => `<div class="patient-dashboard-row"><div class="dashboard-row"><span>${escapeHtml(p.display_name)} · ${escapeHtml(p.email)} · ${escapeHtml(p.approval_status)}</span><span>${p.approval_status === "pending" ? `<button data-approve="${p.id}" data-decision="approved">Approve</button> <button data-approve="${p.id}" data-decision="declined">Decline</button>` : ""}${p.approval_status === "approved" ? ` <button data-export="${p.id}">Download sessions</button>` : ""}</span></div>${p.baseline_report ? `<details class="baseline-report"><summary>Baseline Assessment · ${escapeHtml(p.baseline_report.date)}</summary>${renderBaselineReport(p.baseline_report)}<button data-baseline-export="${p.id}">Download baseline report</button></details>` : "<p class=\"baseline-missing\">Background Baseline Assessment not submitted.</p>"}</div>`).join("") || "<p>No patients yet.</p>";
      const appointmentsHtml = data.appointments.map((a) => `<div class="dashboard-row"><span>${escapeHtml(a.patient_name)} · ${new Date(a.requested_at).toLocaleString()} · ${escapeHtml(a.note)} · ${escapeHtml(a.status)}</span>${a.status === "pending" ? `<span><button data-appointment="${a.id}" data-decision="accepted">Accept</button> <button data-appointment="${a.id}" data-decision="declined">Decline</button></span>` : ""}</div>`).join("") || "<p>No appointment requests.</p>";
      accountDashboard.innerHTML = `<div class="dashboard-welcome"><p class="eyebrow">Psychologist workspace</p><h2>Welcome, ${escapeHtml(data.user.display_name)}</h2><p>Try CogniLoop and tell us what you think. We value your feedback.</p><button id="tryCogniLoop" class="btn-primary" type="button">Try CogniLoop</button><div class="feedback-box"><label for="previewFeedback">Written feedback</label><textarea id="previewFeedback" rows="3" placeholder="What would make this experience more useful?"></textarea><small>Feedback remains in this page only and is not saved.</small></div></div><h3>Patient requests</h3>${patientsHtml}<h3>Appointments</h3>${appointmentsHtml}<button id="refreshDashboard" type="button">Refresh requests</button>`;
      accountDashboard.querySelector("#tryCogniLoop").addEventListener("click", () => { psychologistPreview = true; accountDashboard.hidden = true; therapyWorkspace.hidden = false; previewBanner.hidden = false; appNav.hidden = true; });
      accountDashboard.querySelector("#refreshDashboard").addEventListener("click", loadDashboard);
    } else {
      const appointmentsHtml = data.appointments.map((a) => `<div class="dashboard-row">${new Date(a.requested_at).toLocaleString()} · ${escapeHtml(a.status)}${a.note ? ` · ${escapeHtml(a.note)}` : ""}</div>`).join("") || "<p>No appointment requests yet.</p>";
      const baselineOption = data.baseline_complete ? `<p class="baseline-complete">Background Baseline Assessment completed ${data.baseline_created_at ? `on ${new Date(data.baseline_created_at).toLocaleDateString()}` : ""}.</p>` : `<button id="openBaseline" type="button" class="btn-primary">Background Baseline Assessment</button>`;
      patientProfile.innerHTML = `<p class="eyebrow">Your profile</p><h2>${escapeHtml(data.user.display_name)}</h2><dl class="profile-details"><div><dt>Email</dt><dd>${escapeHtml(data.user.email)}</dd></div><div><dt>Psychologist</dt><dd>${escapeHtml(data.psychologist_name || "Not selected")}</dd></div><div><dt>Account status</dt><dd>${escapeHtml(data.user.approval_status)}</dd></div></dl><section class="profile-baseline"><h3>First session</h3>${baselineOption}</section>${data.user.approval_status === "pending" ? "<p>Your psychologist must approve your account before chat and appointments are available.</p>" : data.user.approval_status === "declined" ? "<p>Your psychologist declined this request. Please contact the clinic.</p>" : `<form id="appointmentForm" class="appointment-form"><h3>Request an appointment</h3><label>Date and time<input type="datetime-local" id="appointmentTime" required></label><input id="appointmentNote" type="text" maxlength="1000" placeholder="Optional note"><button type="submit" class="btn-primary">Send request</button></form>`}<h3>Appointment requests</h3>${appointmentsHtml}`;
      const baselineButton = document.getElementById("openBaseline");
      if (baselineButton) baselineButton.addEventListener("click", openBaselineAssessment);
      const baselinePrompt = document.getElementById("baselinePrompt");
      if (baselinePrompt) baselinePrompt.remove();
      if (!data.baseline_complete && data.user.approval_status === "approved") {
        const prompt = document.createElement("aside"); prompt.id = "baselinePrompt"; prompt.className = "baseline-prompt";
        prompt.innerHTML = '<div><strong>Background Baseline Assessment</strong><span>A short first-session questionnaire for your psychologist.</span></div><button type="button">Start assessment</button>';
        prompt.querySelector("button").addEventListener("click", openBaselineAssessment);
        therapyWorkspace.prepend(prompt);
      }
      const appointmentForm = document.getElementById("appointmentForm");
      if (appointmentForm) appointmentForm.addEventListener("submit", requestAppointment);
    }
    accountDashboard.querySelectorAll("[data-approve]").forEach((button) => button.addEventListener("click", () => postAction("/api/patients/approval", { patient_id: button.dataset.approve, decision: button.dataset.decision })));
    accountDashboard.querySelectorAll("[data-appointment]").forEach((button) => button.addEventListener("click", () => postAction("/api/appointments/respond", { appointment_id: button.dataset.appointment, decision: button.dataset.decision })));
    accountDashboard.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", () => downloadConversations(button.dataset.export)));
    accountDashboard.querySelectorAll("[data-baseline-export]").forEach((button) => button.addEventListener("click", () => downloadBaselineReport(button.dataset.baselineExport)));
    return data;
  }
  async function postAction(url, body) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` }, body: JSON.stringify(body) });
    const result = await response.json(); if (!response.ok) { alert(result.error || "Action failed"); return; } loadDashboard();
  }
  async function requestAppointment(event) {
    event.preventDefault();
    const requestedAt = new Date(document.getElementById("appointmentTime").value).toISOString();
    await postAction("/api/appointments", { requested_at: requestedAt, note: document.getElementById("appointmentNote").value });
  }
  async function downloadConversations(patientId) {
    const response = await fetch(`/api/patients/${patientId}/conversations.txt`, { headers: { "Authorization": `Bearer ${authToken}` } });
    if (!response.ok) { const error = await response.json(); alert(error.error || "Export failed"); return; }
    const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = `patient-${patientId}-conversations.txt`; link.click(); URL.revokeObjectURL(url);
  }
  function escapeHtml(value) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  function renderBaselineReport(report) {
    const metrics = [["General mood", report.general_mood], ["Outlook", report.outlook], ["Self esteem", report.self_esteem], ["Assertion", report.assertion], ["Stress tolerance", report.stress_tolerance]];
    return `<dl class="baseline-report-fields">${metrics.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
  }
  function openBaselineAssessment() {
    patientProfile.hidden = true; therapyWorkspace.hidden = true; appNav.hidden = true;
    baselineAssessment.hidden = false; baselineStatus.textContent = ""; baselineConsent.checked = false;
  }
  async function submitBaselineAssessment() {
    if (!baselineConsent.checked) { baselineStatus.textContent = "Please read and accept the Gemini data-use notice to continue."; return; }
    const answers = Object.fromEntries(Array.from(baselineQuestionsContainer.querySelectorAll("textarea[data-answer-key]"), (field) => [field.dataset.answerKey, { question: field.dataset.question, answer: field.value.trim() }]));
    if (!Object.values(answers).some((entry) => entry.answer)) { baselineStatus.textContent = "Please answer at least one question before submitting."; return; }
    const button = document.getElementById("submitBaseline"); button.disabled = true; baselineStatus.textContent = "Preparing your report…";
    try {
      const response = await fetch("/api/baseline", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` }, body: JSON.stringify({ answers, consent: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create the report");
      baselineAssessment.hidden = true; patientProfile.hidden = false;
      await loadDashboard();
    } catch (error) {
      baselineStatus.textContent = error.message;
    } finally { button.disabled = false; }
  }
  async function downloadBaselineReport(patientId) {
    const response = await fetch(`/api/patients/${patientId}/baseline.txt`, { headers: { "Authorization": `Bearer ${authToken}` } });
    if (!response.ok) { const error = await response.json(); alert(error.error || "Export failed"); return; }
    const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = `patient-${patientId}-baseline-assessment.txt`; link.click(); URL.revokeObjectURL(url);
  }

  // DOM Elements
  const queryForm = document.getElementById("queryForm");
  const queryInput = document.getElementById("queryInput");
  const submitBtn = document.getElementById("submitBtn");
  const btnSpinner = document.getElementById("btnSpinner");
  const presetsPills = document.getElementById("presetsPills");

  // Output elements
  const crisisSupportBanner = document.getElementById("crisisSupportBanner");
  const finalAnswerText = document.getElementById("finalAnswerText");
  const actionableText = document.getElementById("actionableText");
  const distortionBadge = document.getElementById("distortionBadge");
  const factAnchorText = document.getElementById("factAnchorText");
  const cognitiveLeapText = document.getElementById("cognitiveLeapText");
  const evidenceForText = document.getElementById("evidenceForText");
  const evidenceAgainstText = document.getElementById("evidenceAgainstText");

  // DBT Context Elements
  const dbtModuleBadge = document.getElementById("dbtModuleBadge");
  const dbtSkillBadge = document.getElementById("dbtSkillBadge");
  const dbtArousalBadge = document.getElementById("dbtArousalBadge");
  const dbtStep1Text = document.getElementById("dbtStep1Text");
  const dbtStep2Text = document.getElementById("dbtStep2Text");
  const dbtStep3Text = document.getElementById("dbtStep3Text");
  const dbtIdealReplyText = document.getElementById("dbtIdealReplyText");

  // Quantum Inspector elements
  const rawLLMText = document.getElementById("rawLLMText");
  const quantumProtectedText = document.getElementById("quantumProtectedText");
  const metricSafeProb = document.getElementById("metricSafeProb");
  const metricDistProb = document.getElementById("metricDistProb");
  const metricEntropy = document.getElementById("metricEntropy");
  const metricCoherence = document.getElementById("metricCoherence");
  const circuitDiagram = document.getElementById("circuitDiagram");
  const blochGrid = document.getElementById("blochGrid");
  const stateBars = document.getElementById("stateBars");

  // Settings Modal Elements
  const openSettingsBtn = document.getElementById("openSettingsBtn");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const settingsModal = document.getElementById("settingsModal");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const geminiApiKeyInput = document.getElementById("geminiApiKeyInput");
  const geminiModelSelect = document.getElementById("geminiModelSelect");
  const currentModelDisplay = document.getElementById("currentModelDisplay");
  const geminiStatusPill = document.getElementById("geminiStatusPill");

  // Local Storage State
  let apiKey = localStorage.getItem("cogniloop_gemini_key") || "";
  let selectedModel = localStorage.getItem("cogniloop_gemini_model") || "gemini-2.0-flash";

  geminiApiKeyInput.value = apiKey;
  geminiModelSelect.value = selectedModel;
  updateModelDisplay();

  // Load Presets
  loadPresets();

  // Form Submit Event
  queryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = queryInput.value.trim();
    if (!query) return;
    executeCognitivePipeline(query);
  });

  // Settings Modal Controls
  openSettingsBtn.addEventListener("click", () => {
    settingsModal.classList.remove("hidden");
  });
  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add("hidden");
    }
  });

  saveSettingsBtn.addEventListener("click", async () => {
    apiKey = geminiApiKeyInput.value.trim();
    selectedModel = geminiModelSelect.value;
    localStorage.setItem("cogniloop_gemini_key", apiKey);
    localStorage.setItem("cogniloop_gemini_model", selectedModel);

    // Sync with backend
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify({ api_key: apiKey, model: selectedModel })
      });
    } catch (err) {
      console.warn("Could not sync config with server:", err);
    }

    updateModelDisplay();
    settingsModal.classList.add("hidden");
  });

  function updateModelDisplay() {
    currentModelDisplay.textContent = selectedModel;
    if (apiKey) {
      geminiStatusPill.style.borderColor = "#10b981";
      geminiStatusPill.style.color = "#34d399";
      geminiStatusPill.title = "Connected to live Google Gemini API";
    } else {
      geminiStatusPill.style.borderColor = "rgba(79, 172, 254, 0.3)";
      geminiStatusPill.style.color = "#60a5fa";
      geminiStatusPill.title = "Cognitive engine active (simulated API fallback)";
    }
  }

  // =========================================================================
  // Gemini Live Voice Subsystem
  // =========================================================================
  const geminiLiveBar = document.getElementById("geminiLiveBar");
  const voiceMicBtn = document.getElementById("voiceMicBtn");
  const micBtnText = document.getElementById("micBtnText");
  const micIconSvg = document.getElementById("micIconSvg");
  const liveStatusText = document.getElementById("liveStatusText");
  const voiceWaveContainer = document.getElementById("voiceWaveContainer");
  const voiceVisualizerCanvas = document.getElementById("voiceVisualizerCanvas");
  const voiceTimer = document.getElementById("voiceTimer");
  const voiceAutoSubmit = document.getElementById("voiceAutoSubmit");
  const speakResponseBtn = document.getElementById("speakResponseBtn");
  const speakResponseLabel = document.getElementById("speakResponseLabel");

  let isRecording = false;
  let recognitionInstance = null;
  let mediaStream = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let audioContext = null;
  let analyser = null;
  let visualizerAnimId = null;
  let timerInterval = null;
  let recordingSeconds = 0;
  let accumulatedTranscript = "";

  // Check Web Speech API support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Set up microphone click
  if (voiceMicBtn) {
    voiceMicBtn.addEventListener("click", () => {
      if (isRecording) {
        stopVoiceRecording();
      } else {
        startVoiceRecording();
      }
    });
  }

  // Set up Read Aloud click
  if (speakResponseBtn) {
    speakResponseBtn.addEventListener("click", toggleSpeakResponse);
  }

  async function startVoiceRecording() {
    try {
      accumulatedTranscript = "";
      recordingSeconds = 0;
      updateVoiceTimer();

      // UI State -> Listening
      isRecording = true;
      geminiLiveBar.classList.add("listening");
      geminiLiveBar.classList.remove("transcribing");
      voiceMicBtn.classList.add("active-recording");
      micBtnText.textContent = "Done Speaking";
      liveStatusText.textContent = "Listening to your voice...";
      voiceWaveContainer.classList.remove("hidden");

      // 1. Start Web Audio API Visualizer & MediaRecorder
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        startAudioVisualizer(mediaStream);
        startMediaRecorder(mediaStream);
      } catch (audioErr) {
        console.warn("Could not access media stream for visualizer:", audioErr);
      }

      // 2. Start SpeechRecognition if available (Real-time streaming transcription)
      if (SpeechRecognition) {
        initSpeechRecognition();
      } else {
        liveStatusText.textContent = "Recording voice audio (Gemini Live Mode)...";
      }

      // Start timer
      timerInterval = setInterval(() => {
        recordingSeconds++;
        updateVoiceTimer();
      }, 1000);

    } catch (err) {
      console.error("Failed to start voice recording:", err);
      resetVoiceUI();
      alert("Microphone access could not be initialized: " + (err.message || err));
    }
  }

  function initSpeechRecognition() {
    try {
      if (recognitionInstance) {
        try { recognitionInstance.abort(); } catch (e) {}
      }
      recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-US";

      let finalSoFar = "";

      recognitionInstance.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalSoFar += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        accumulatedTranscript = (finalSoFar + interim).trim();
        if (accumulatedTranscript) {
          queryInput.value = accumulatedTranscript;
          queryInput.scrollTop = queryInput.scrollHeight;
        }
      };

      recognitionInstance.onerror = (event) => {
        console.warn("Speech recognition notice/error:", event.error);
        if (event.error === "not-allowed") {
          liveStatusText.textContent = "Microphone permission denied.";
        }
      };

      recognitionInstance.onend = () => {
        if (isRecording) {
          try { recognitionInstance.start(); } catch (e) {}
        }
      };

      recognitionInstance.start();
    } catch (e) {
      console.warn("Could not start SpeechRecognition instance:", e);
    }
  }

  function startMediaRecorder(stream) {
    audioChunks = [];
    try {
      const mimeType = (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
        ? "audio/webm;codecs=opus"
        : ((typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm")) ? "audio/webm" : "");

      const options = mimeType ? { mimeType } : {};
      mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      mediaRecorder.start(200);
    } catch (e) {
      console.warn("MediaRecorder could not start:", e);
    }
  }

  function startAudioVisualizer(stream) {
    if (!voiceVisualizerCanvas) return;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const canvasCtx = voiceVisualizerCanvas.getContext("2d");
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function draw() {
        if (!isRecording) return;
        visualizerAnimId = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, voiceVisualizerCanvas.width, voiceVisualizerCanvas.height);

        const barWidth = (voiceVisualizerCanvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * voiceVisualizerCanvas.height;
          canvasCtx.fillStyle = `rgb(${Math.min(255, dataArray[i] + 40)}, ${Math.max(100, 240 - dataArray[i])}, 254)`;
          canvasCtx.fillRect(x, voiceVisualizerCanvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      }

      draw();
    } catch (e) {
      console.warn("AudioContext visualizer error:", e);
    }
  }

  async function stopVoiceRecording() {
    isRecording = false;
    clearInterval(timerInterval);

    if (visualizerAnimId) {
      cancelAnimationFrame(visualizerAnimId);
      visualizerAnimId = null;
    }

    if (recognitionInstance) {
      try { recognitionInstance.stop(); } catch (e) {}
      recognitionInstance = null;
    }

    // Stop Media Recorder and collect Blob
    let audioBlob = null;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      await new Promise((resolve) => {
        mediaRecorder.onstop = () => {
          if (audioChunks.length > 0) {
            audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
          }
          resolve();
        };
        try { mediaRecorder.stop(); } catch (e) { resolve(); }
      });
    }

    // Stop stream tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    if (audioContext && audioContext.state !== "closed") {
      try { audioContext.close(); } catch (e) {}
    }

    // Switch UI to Processing / Transcribing state
    geminiLiveBar.classList.remove("listening");
    geminiLiveBar.classList.add("transcribing");
    liveStatusText.textContent = "Processing voice with Gemini Live...";
    micBtnText.textContent = "Transcribing...";

    let finalQuery = (queryInput.value || "").trim();

    // If query input is empty but audio blob is available, send to Gemini Live transcription endpoint
    if (!finalQuery && audioBlob) {
      try {
        const base64Audio = await blobToBase64(audioBlob);
        const res = await fetch("/api/voice-transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
          body: JSON.stringify({
            audio: base64Audio,
            mime_type: audioBlob.type || "audio/webm",
            api_key: apiKey,
            model: selectedModel
          })
        });
        const data = await res.json();
        if (data && data.transcription) {
          finalQuery = data.transcription;
          queryInput.value = finalQuery;
        }
      } catch (err) {
        console.warn("Backend voice transcription fallback:", err);
      }
    }

    // Reset Voice UI
    resetVoiceUI();

    if (finalQuery) {
      liveStatusText.textContent = `Voice captured (${finalQuery.slice(0, 32)}...)`;
      // Check Auto-Submit
      if (voiceAutoSubmit && voiceAutoSubmit.checked) {
        executeCognitivePipeline(finalQuery);
      }
    } else {
      liveStatusText.textContent = "No speech detected. Please try speaking again.";
    }
  }

  function resetVoiceUI() {
    isRecording = false;
    geminiLiveBar.classList.remove("listening", "transcribing");
    voiceMicBtn.classList.remove("active-recording");
    voiceWaveContainer.classList.add("hidden");
    micBtnText.textContent = "Speak Query (Gemini Live)";
    if (voiceVisualizerCanvas) {
      const ctx = voiceVisualizerCanvas.getContext("2d");
      ctx.clearRect(0, 0, voiceVisualizerCanvas.width, voiceVisualizerCanvas.height);
    }
  }

  function updateVoiceTimer() {
    if (!voiceTimer) return;
    const mins = String(Math.floor(recordingSeconds / 60)).padStart(2, "0");
    const secs = String(recordingSeconds % 60).padStart(2, "0");
    voiceTimer.textContent = `${mins}:${secs}`;
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Read Aloud / Voice Feedback
  let isSpeaking = false;
  function toggleSpeakResponse() {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      speakResponseBtn.classList.remove("speaking");
      speakResponseLabel.textContent = "Read Aloud";
      return;
    }

    const textToSpeak = finalAnswerText.textContent.trim();
    if (!textToSpeak) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95; // Calming, measured cadence
    utterance.pitch = 1.0;

    // Pick a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha")));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      isSpeaking = true;
      speakResponseBtn.classList.add("speaking");
      speakResponseLabel.textContent = "Stop Audio";
    };

    utterance.onend = utterance.onerror = () => {
      isSpeaking = false;
      speakResponseBtn.classList.remove("speaking");
      speakResponseLabel.textContent = "Read Aloud";
    };

    window.speechSynthesis.speak(utterance);
  }

  // Load Presets from API
  async function loadPresets() {
    try {
      const res = await fetch("/api/presets");
      const data = await res.json();
      presetsPills.innerHTML = "";

      data.presets.forEach((preset, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `preset-btn ${idx === 0 ? "active" : ""}`;
        btn.innerHTML = `<span class="preset-tag">${preset.badge}</span> ${preset.title.split("&")[0].trim()}`;
        btn.title = preset.query;

        btn.addEventListener("click", () => {
          document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          queryInput.value = preset.query;
          executeCognitivePipeline(preset.query);
        });

        presetsPills.appendChild(btn);
      });
    } catch (err) {
      console.error("Failed to load presets:", err);
    }
  }

  // Execute Quantum-Guarded Cognitive Pipeline
  async function executeCognitivePipeline(query) {
    submitBtn.disabled = true;
    btnSpinner.classList.remove("hidden");

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify({
          query: query,
          session_id: localStorage.getItem("cogniloop_session_id"),
          api_key: apiKey,
          model: selectedModel
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (data.session_id) localStorage.setItem("cogniloop_session_id", data.session_id);
      renderResults(data);
    } catch (err) {
      console.error("Pipeline query error:", err);
      finalAnswerText.textContent = "An error occurred during cognitive processing. Please check connection.";
    } finally {
      submitBtn.disabled = false;
      btnSpinner.classList.add("hidden");
    }
  }

  // Render Full Results
  function renderResults(data) {
    const isCrisis = data.is_crisis || false;

    // Handle Psychologist Crisis Banner
    if (isCrisis) {
      crisisSupportBanner.classList.remove("hidden");
      distortionBadge.className = "badge badge-danger";
      distortionBadge.textContent = "🚨 Immediate Psychologist Referral Required";
    } else {
      crisisSupportBanner.classList.add("hidden");
      distortionBadge.className = "badge badge-purple";
      const cog = data.cognitive_thinking;
      if (cog.distortion_types && cog.distortion_types.length > 0) {
        distortionBadge.textContent = `${cog.distortion_types[0].name} (${Math.round(cog.distortion_severity * 100)}% Severity)`;
      } else {
        distortionBadge.textContent = "Cognitive Uncertainty Reframed";
      }
    }

    // 1. Primary Final Grounded Answer
    finalAnswerText.textContent = data.final_answer;
    actionableText.textContent = data.actionable_guidance;

    // 2. DBT Context Guide for Psychologists
    if (data.dbt_context_reference) {
      const dbt = data.dbt_context_reference;
      dbtModuleBadge.textContent = dbt.module || "DBT Guidelines";
      dbtSkillBadge.textContent = dbt.skill ? dbt.skill.split("(")[0].trim() : "Skills Coaching";
      const arousal = (dbt.arousal_level || "MODERATE").replace(/_/g, " ").toUpperCase();
      dbtArousalBadge.textContent = arousal.includes("AROUSAL") ? arousal : `${arousal} AROUSAL`;
      
      const strat = dbt.strategy || {};
      dbtStep1Text.textContent = strat.step_1_validate || "Validate the immediate emotional experience.";
      dbtStep2Text.textContent = strat.step_2_dialectic || "Balance acceptance of reality with constructive problem solving.";
      dbtStep3Text.textContent = strat.step_3_skill_prompt || "Ground response with concrete DBT skill application.";
      
      dbtIdealReplyText.textContent = dbt.ideal_reply_reference || "Practice grounding skills and check the facts.";
    }

    // 3. Cognitive Thinking Breakdown
    const cog = data.cognitive_thinking;
    factAnchorText.textContent = cog.fact_anchor;
    cognitiveLeapText.textContent = cog.cognitive_leap;
    evidenceForText.textContent = cog.evidence_matrix.evidence_for_fear;
    evidenceAgainstText.textContent = cog.evidence_matrix.evidence_against_fear;

    // 3. Comparison: Raw LLM vs Quantum Protected
    rawLLMText.textContent = `"${data.raw_llm_comparison.raw_text}"`;
    quantumProtectedText.textContent = `"${data.final_answer}"`;

    // 4. Quantum Metrics
    const qm = data.quantum_layer.quantum_metrics;
    metricSafeProb.textContent = `${(qm.safe_subspace_probability * 100).toFixed(1)}%`;
    metricDistProb.textContent = `${(qm.distortion_subspace_probability * 100).toFixed(1)}%`;
    metricEntropy.textContent = qm.von_neumann_entropy.toFixed(3);
    metricCoherence.textContent = qm.quantum_coherence.toFixed(2);

    // 5. Render Quantum Circuit Diagram
    renderCircuit(data.quantum_layer, isCrisis);

    // 6. Render Bloch Spheres
    renderBlochSpheres(data.quantum_layer.bloch_vectors);

    // 7. Render State Superposition Probabilities
    renderStateBars(data.quantum_layer.state_distribution);
  }

  // Render Quantum Circuit
  function renderCircuit(quantumLayer, isCrisis = false) {
    circuitDiagram.innerHTML = "";
    const qubits = quantumLayer.qubits || [
      { index: 0, name: "q0_FactAnchor" },
      { index: 1, name: "q1_CognitiveDistortion" },
      { index: 2, name: "q2_AffectiveValence" },
      { index: 3, name: "q3_QuantumGuard" }
    ];

    qubits.forEach((q) => {
      const wire = document.createElement("div");
      wire.className = "circuit-wire";

      const label = document.createElement("div");
      label.className = "wire-label";
      label.textContent = `${q.name.split("_")[0]} |0⟩:`;

      const line = document.createElement("div");
      line.className = "wire-line";

      // Insert gates according to wire index
      const hGate = document.createElement("div");
      hGate.className = "gate-box gate-h";
      hGate.textContent = "H";
      line.appendChild(hGate);

      const ryGate = document.createElement("div");
      ryGate.className = "gate-box gate-ry";
      ryGate.textContent = `Ry(θ_${q.index})`;
      line.appendChild(ryGate);

      if (q.index === 1) {
        const cnotTgt = document.createElement("div");
        cnotTgt.className = "gate-box gate-cnot";
        cnotTgt.textContent = "⊕ CNOT";
        line.appendChild(cnotTgt);

        const czTgt = document.createElement("div");
        czTgt.className = "gate-box gate-ry";
        czTgt.textContent = "Z (CZ)";
        line.appendChild(czTgt);
      } else if (q.index === 2) {
        const cnotCtrl = document.createElement("div");
        cnotCtrl.className = "gate-box gate-cnot";
        cnotCtrl.textContent = "● Ctrl";
        line.appendChild(cnotCtrl);
      } else if (q.index === 0) {
        const czCtrl = document.createElement("div");
        czCtrl.className = "gate-box gate-ry";
        czCtrl.textContent = "● CZ";
        line.appendChild(czCtrl);
      } else if (q.index === 3) {
        if (isCrisis) {
          const crisisGate = document.createElement("div");
          crisisGate.className = "gate-box gate-danger";
          crisisGate.textContent = "Π_psychologist (CRISIS)";
          line.appendChild(crisisGate);
        } else {
          const projGate = document.createElement("div");
          projGate.className = "gate-box gate-proj";
          projGate.textContent = "Π_safe";
          line.appendChild(projGate);
        }
      }

      wire.appendChild(label);
      wire.appendChild(line);
      circuitDiagram.appendChild(wire);
    });
  }

  // Render Bloch Spheres via SVG
  function renderBlochSpheres(blochVectors) {
    blochGrid.innerHTML = "";
    const titles = {
      "q0_FactAnchor": "q0 (Fact Grounding)",
      "q1_CognitiveDistortion": "q1 (Distortion)",
      "q2_AffectiveValence": "q2 (Affect)",
      "q3_QuantumGuard": "q3 (Quantum Guard)"
    };

    for (const [key, b] of Object.entries(blochVectors)) {
      const item = document.createElement("div");
      item.className = "bloch-item";

      const header = document.createElement("div");
      header.className = "bloch-header";
      header.innerHTML = `<span>${titles[key] || key}</span> <span>θ: ${b.theta}°</span>`;

      // SVG Bloch Sphere rendering
      // Map ux, uy, uz to 2D projection
      const cx = 50;
      const cy = 40;
      const r = 28;
      // Project 3D vector (ux, uy, uz) to 2.5D coordinates
      // ux points right/down, uy points right/up, uz points up
      const vx = cx + r * (0.8 * b.ux + 0.3 * b.uy);
      const vy = cy - r * (0.85 * b.uz - 0.2 * b.ux);

      const svg = `
        <svg class="bloch-sphere-svg" viewBox="0 0 100 80">
          <!-- Sphere outline -->
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.2"/>
          <!-- Equator ellipse -->
          <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r*0.35}" fill="none" stroke="rgba(0, 242, 254, 0.25)" stroke-dasharray="2 2" stroke-width="1"/>
          <!-- Z-Axis -->
          <line x1="${cx}" y1="${cy - r - 4}" x2="${cx}" y2="${cy + r + 4}" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
          <!-- State vector -->
          <line x1="${cx}" y1="${cy}" x2="${vx}" y2="${vy}" stroke="#00f2fe" stroke-width="2.5"/>
          <circle cx="${vx}" cy="${vy}" r="3.5" fill="#10b981" filter="drop-shadow(0 0 4px #00f2fe)"/>
          <!-- Labels |0> and |1> -->
          <text x="${cx + 4}" y="${cy - r + 3}" fill="#94a3b8" font-size="7" font-family="monospace">|0⟩</text>
          <text x="${cx + 4}" y="${cy + r + 5}" fill="#94a3b8" font-size="7" font-family="monospace">|1⟩</text>
        </svg>
      `;

      const coords = document.createElement("div");
      coords.className = "bloch-coords";
      coords.innerHTML = `
        <span>uz: ${b.uz.toFixed(2)}</span>
        <span>Purity: ${b.purity.toFixed(2)}</span>
      `;

      item.appendChild(header);
      item.innerHTML += svg;
      item.appendChild(coords);
      blochGrid.appendChild(item);
    }
  }

  // Render 16-state Superposition Bar chart
  function renderStateBars(stateDistribution) {
    stateBars.innerHTML = "";
    if (!stateDistribution) return;

    stateDistribution.forEach((st) => {
      const col = document.createElement("div");
      col.className = "state-bar-col";

      const probVal = document.createElement("span");
      probVal.className = "state-prob-val";
      const pct = (st.probability * 100);
      probVal.textContent = pct > 0.5 ? `${pct.toFixed(0)}%` : "0%";

      const track = document.createElement("div");
      track.className = "bar-track";

      const fill = document.createElement("div");
      let fillClass = "bar-normal";
      if (st.is_grounded_safe) fillClass = "bar-safe";
      else if (st.is_distorted) fillClass = "bar-distorted";

      fill.className = `bar-fill ${fillClass}`;
      fill.style.height = `${Math.min(100, Math.max(3, pct * 3.5))}%`;
      track.appendChild(fill);

      const label = document.createElement("span");
      label.className = "state-basis-label";
      label.textContent = st.basis;

      col.appendChild(probVal);
      col.appendChild(track);
      col.appendChild(label);
      stateBars.appendChild(col);
    });
  }

  // Initial trigger for default scenario
  if (authToken) {
    loadDashboard().then((data) => {
      if (data.user.role === "patient" && data.user.approval_status === "approved") executeCognitivePipeline(queryInput.value.trim());
    }).catch(() => {
      authToken = ""; localStorage.removeItem("cogniloop_auth_token"); setSignedIn(null);
    });
  }
});
