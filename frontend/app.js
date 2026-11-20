/**
 * frontend/app.js
 * Interactive Client for CogniLoop: Quantum-Guarded Cognitive Thinking.
 */

document.addEventListener("DOMContentLoaded", () => {
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
        headers: { "Content-Type": "application/json" },
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
          headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          api_key: apiKey,
          model: selectedModel
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
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
  executeCognitivePipeline(queryInput.value.trim());
});
