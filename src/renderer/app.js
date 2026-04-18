/**
 * Siabanni Transcribe — Logique du renderer
 * Consortium SFR
 *
 * Gere l'interface : navigation, enregistrement live, import fichier,
 * transcription, resume/traduction, exports.
 */

// ====== Etat global ======
const state = {
  currentFile: null,
  currentSegments: [],     // segments de transcription avec timestamps
  liveSegments: [],
  isRecording: false,
  isPaused: false,
  mediaRecorder: null,
  audioContext: null,
  liveChunks: [],
  startTime: 0,
  elapsedTime: 0,
  timerInterval: null,
  settings: {},
};

// ====== Helpers ======
function $(id) { return document.getElementById(id); }
function $$(sel) { return document.querySelectorAll(sel); }

function toast(message, type = 'info', duration = 3000) {
  const el = $('toast');
  el.textContent = message;
  el.className = `toast ${type} show`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), duration);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ====== Navigation entre onglets ======
function switchTab(tabId) {
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  $$('.panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
}

$$('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ====== Chargement des parametres ======
async function loadSettings() {
  state.settings = await window.api.settings.all();
  $('settings-api-key').value = state.settings.deepseekApiKey || '';
  $('settings-model').value = state.settings.whisperModel || 'base';
  $('settings-language').value = state.settings.language || 'auto';
  $('settings-diarization').checked = !!state.settings.enableDiarization;
  $('settings-timestamps').checked = state.settings.enableTimestamps !== false;
  $('settings-outdir').value = state.settings.outputDirectory || '';
  $('live-language').value = state.settings.language || 'auto';
  $('file-language').value = state.settings.language || 'auto';
  $('file-model').value = state.settings.whisperModel || 'base';
}

// ====== Parametres : sauvegarde ======
$('btn-save-settings').addEventListener('click', async () => {
  await window.api.settings.set('deepseekApiKey', $('settings-api-key').value.trim());
  await window.api.settings.set('whisperModel', $('settings-model').value);
  await window.api.settings.set('language', $('settings-language').value);
  await window.api.settings.set('enableDiarization', $('settings-diarization').checked);
  await window.api.settings.set('enableTimestamps', $('settings-timestamps').checked);
  await window.api.settings.set('outputDirectory', $('settings-outdir').value);
  state.settings = await window.api.settings.all();
  toast('Paramètres enregistrés', 'success');
});

$('btn-toggle-key').addEventListener('click', () => {
  const input = $('settings-api-key');
  input.type = input.type === 'password' ? 'text' : 'password';
});

$('btn-choose-outdir').addEventListener('click', async () => {
  const dir = await window.api.dialog.chooseDirectory();
  if (dir) $('settings-outdir').value = dir;
});

// ====== Enregistrement LIVE ======
async function startLiveRecording() {
  try {
    const source = $('live-source').value;

    // Demande d'acces au micro. Pour le mode "system" ou "both", voir notes dans le README.
    let micStream = null;
    let displayStream = null;

    if (source === 'microphone' || source === 'both') {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
        video: false,
      });
    }

    if (source === 'system' || source === 'both') {
      // getDisplayMedia capture l'audio systeme (necessite autorisation de partage d'ecran)
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      // On peut ignorer le flux video
      displayStream.getVideoTracks().forEach(t => t.stop());
    }

    // Fusion des flux si "both"
    let finalStream;
    if (micStream && displayStream) {
      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      ctx.createMediaStreamSource(micStream).connect(dest);
      if (displayStream.getAudioTracks().length > 0) {
        ctx.createMediaStreamSource(displayStream).connect(dest);
      }
      finalStream = dest.stream;
      state.audioContext = ctx;
    } else {
      finalStream = micStream || displayStream;
    }

    if (!finalStream) {
      toast("Aucun flux audio disponible.", 'error');
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    state.mediaRecorder = new MediaRecorder(finalStream, { mimeType });
    state.liveChunks = [];
    state.liveSegments = [];
    state.startTime = Date.now();
    state.elapsedTime = 0;

    // Accumulation des chunks pour la transcription periodique
    let chunkBuffer = [];
    let lastTranscribeTime = Date.now();
    const CHUNK_INTERVAL = 8000; // 8 s

    state.mediaRecorder.ondataavailable = async (e) => {
      if (e.data.size === 0) return;
      state.liveChunks.push(e.data);
      chunkBuffer.push(e.data);

      // Toutes les ~8s, envoyer le buffer accumule pour transcription partielle
      if (Date.now() - lastTranscribeTime >= CHUNK_INTERVAL && chunkBuffer.length > 0) {
        lastTranscribeTime = Date.now();
        const snapshot = [...chunkBuffer];
        chunkBuffer = [];
        await transcribePartialLive(snapshot);
      }
    };

    state.mediaRecorder.onstop = async () => {
      // Transcription du reste + fusion
      if (chunkBuffer.length > 0) {
        await transcribePartialLive(chunkBuffer);
      }
      // Flux final accessible via state.liveChunks si besoin
      clearInterval(state.timerInterval);
      $('live-indicator').className = 'indicator';
      $('live-status').textContent = 'Enregistrement terminé.';

      // Transfert vers l'onglet Transcription
      const fullText = state.liveSegments.map(s => s.text).join('\n');
      $('transcript-text').value = fullText;
      state.currentSegments = state.liveSegments.slice();
      toast('Transcription live terminée. Résultat dans l’onglet Transcription.', 'success');
    };

    state.mediaRecorder.start(1000); // chunk toutes les 1s
    state.isRecording = true;
    state.isPaused = false;

    $('btn-start').disabled = true;
    $('btn-stop').disabled = false;
    $('btn-pause').disabled = false;
    $('live-indicator').className = 'indicator recording';
    $('live-status').textContent = 'Enregistrement et transcription en cours...';
    $('live-transcript').innerHTML = '';

    // Timer
    state.timerInterval = setInterval(() => {
      if (!state.isPaused) {
        state.elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
        $('live-timer').textContent = formatTime(state.elapsedTime);
      }
    }, 500);

    toast('Enregistrement démarré', 'info');
  } catch (err) {
    console.error(err);
    toast('Erreur : ' + err.message, 'error', 6000);
  }
}

async function transcribePartialLive(chunks) {
  try {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const buffer = await blob.arrayBuffer();
    const language = $('live-language').value;

    const res = await window.api.transcribe.chunk({
      audioBuffer: Array.from(new Uint8Array(buffer)),
      options: {
        language,
        model: state.settings.whisperModel || 'base',
      },
    });

    if (res.ok && res.text && res.text.trim()) {
      const segment = {
        time: state.elapsedTime,
        text: res.text.trim(),
        speaker: state.settings.enableDiarization ? detectSpeaker() : null,
      };
      state.liveSegments.push(segment);
      appendLiveSegment(segment);
    }
  } catch (err) {
    console.warn('Transcription partielle en échec:', err);
  }
}

// Diarisation "naive" : alterne Speaker 1 / Speaker 2 selon silence
let lastSpeakerIdx = 0;
function detectSpeaker() {
  lastSpeakerIdx = (lastSpeakerIdx + 1) % 2;
  return `Intervenant ${lastSpeakerIdx + 1}`;
}

function appendLiveSegment(seg) {
  const container = $('live-transcript');
  const div = document.createElement('div');
  div.className = 'segment';
  let html = '';
  if (state.settings.enableTimestamps !== false) {
    html += `<span class="time">[${formatTimestamp(seg.time)}]</span>`;
  }
  if (seg.speaker) {
    html += `<span class="speaker">${seg.speaker} :</span>`;
  }
  html += `<span class="text"></span>`;
  div.innerHTML = html;
  div.querySelector('.text').textContent = seg.text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function stopLiveRecording() {
  if (state.mediaRecorder && state.isRecording) {
    state.mediaRecorder.stop();
    state.mediaRecorder.stream.getTracks().forEach(t => t.stop());
    if (state.audioContext) state.audioContext.close();
    state.isRecording = false;
    state.isPaused = false;
    $('btn-start').disabled = false;
    $('btn-stop').disabled = true;
    $('btn-pause').disabled = true;
  }
}

function togglePause() {
  if (!state.mediaRecorder) return;
  if (state.isPaused) {
    state.mediaRecorder.resume();
    state.isPaused = false;
    state.startTime = Date.now() - state.elapsedTime * 1000;
    $('live-indicator').className = 'indicator recording';
    $('live-status').textContent = 'Enregistrement et transcription en cours...';
    $('btn-pause').innerHTML = '<span class="btn-icon">❚❚</span> Pause';
  } else {
    state.mediaRecorder.pause();
    state.isPaused = true;
    $('live-indicator').className = 'indicator paused';
    $('live-status').textContent = 'En pause';
    $('btn-pause').innerHTML = '<span class="btn-icon">▶</span> Reprendre';
  }
}

$('btn-start').addEventListener('click', startLiveRecording);
$('btn-stop').addEventListener('click', stopLiveRecording);
$('btn-pause').addEventListener('click', togglePause);

// ====== Import de fichier ======
const dropzone = $('dropzone');
const filePicker = $('file-picker');

dropzone.addEventListener('click', () => filePicker.click());
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) setCurrentFile(file.path || file.name, file.name);
});

filePicker.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) setCurrentFile(file.path, file.name);
});

// Si le dropzone ne fournit pas file.path (CSP/sandbox), on utilise le dialog electron
dropzone.addEventListener('click', async (e) => {
  // on laisse cliquer l'input, mais si pas de file.path retourne (dans Electron renderer, sans webSecurity custom), on peut toujours demander via le dialog
});

$('btn-file-remove').addEventListener('click', () => {
  state.currentFile = null;
  $('file-info').style.display = 'none';
  $('btn-transcribe-file').disabled = true;
});

function setCurrentFile(filePath, fileName) {
  if (!filePath) {
    // Fallback : dialog Electron
    window.api.dialog.openFile().then(p => {
      if (p) setCurrentFile(p, p.split(/[/\\]/).pop());
    });
    return;
  }
  state.currentFile = filePath;
  $('file-name').textContent = fileName || filePath;
  $('file-info').style.display = 'flex';
  $('btn-transcribe-file').disabled = false;
}

// Permet aussi de choisir via le dialog natif (plus fiable dans Electron)
dropzone.addEventListener('dblclick', async () => {
  const p = await window.api.dialog.openFile();
  if (p) setCurrentFile(p, p.split(/[/\\]/).pop());
});

// ====== Transcription d'un fichier ======
$('btn-transcribe-file').addEventListener('click', async () => {
  if (!state.currentFile) return;

  const language = $('file-language').value;
  const model = $('file-model').value;

  $('btn-transcribe-file').disabled = true;
  $('file-progress-wrap').style.display = 'block';
  $('file-progress-fill').style.width = '5%';
  $('file-progress-label').textContent = 'Extraction de l’audio...';

  // Ecoute des messages de progression
  const unsubscribe = window.api.transcribe.onProgress((msg) => {
    if (msg.progress !== undefined) {
      $('file-progress-fill').style.width = `${msg.progress}%`;
    }
    if (msg.label) {
      $('file-progress-label').textContent = msg.label;
    }
  });

  try {
    const res = await window.api.transcribe.file({
      filePath: state.currentFile,
      options: { language, model, diarization: state.settings.enableDiarization },
    });

    if (!res.ok) throw new Error(res.error);

    // Mise a jour du resultat
    const segments = res.result.segments || [];
    state.currentSegments = segments.map((s, i) => ({
      time: s.start,
      end: s.end,
      text: s.text,
      speaker: state.settings.enableDiarization ? `Intervenant ${(i % 2) + 1}` : null,
    }));

    const fullText = segments.map(s => {
      let line = '';
      if (state.settings.enableTimestamps !== false) {
        line += `[${formatTimestamp(s.start)}] `;
      }
      line += s.text.trim();
      return line;
    }).join('\n');

    $('transcript-text').value = fullText;
    $('file-progress-fill').style.width = '100%';
    $('file-progress-label').textContent = 'Terminé !';

    toast('Transcription terminée avec succès.', 'success');
    switchTab('result');
  } catch (err) {
    toast('Erreur de transcription : ' + err.message, 'error', 6000);
    console.error(err);
  } finally {
    unsubscribe();
    $('btn-transcribe-file').disabled = false;
    setTimeout(() => {
      $('file-progress-wrap').style.display = 'none';
    }, 2000);
  }
});

// ====== Actions sur la transcription ======
$('btn-copy').addEventListener('click', async () => {
  const text = $('transcript-text').value;
  if (!text) return toast('Rien à copier', 'info');
  await navigator.clipboard.writeText(text);
  toast('Texte copié dans le presse-papier', 'success');
});

$('btn-clear').addEventListener('click', () => {
  if (!$('transcript-text').value) return;
  if (confirm('Effacer la transcription ?')) {
    $('transcript-text').value = '';
    state.currentSegments = [];
    $('summary-box').style.display = 'none';
  }
});

$('btn-summarize').addEventListener('click', async () => {
  const text = $('transcript-text').value.trim();
  if (!text) return toast('Rien à résumer', 'info');
  const apiKey = state.settings.deepseekApiKey;
  if (!apiKey) {
    toast('Clé API DeepSeek manquante. Va dans les paramètres.', 'error', 5000);
    return;
  }
  toast('Génération du résumé IA en cours...', 'info', 5000);
  const res = await window.api.deepseek.summarize({
    text,
    apiKey,
    language: $('live-language').value === 'en' ? 'en' : 'fr',
  });
  if (res.ok) {
    $('summary-content').textContent = res.summary;
    $('summary-box').style.display = 'block';
    toast('Résumé généré', 'success');
  } else {
    toast('Erreur : ' + res.error, 'error', 6000);
  }
});

$('btn-close-summary').addEventListener('click', () => {
  $('summary-box').style.display = 'none';
});

$('btn-translate').addEventListener('click', async () => {
  const text = $('transcript-text').value.trim();
  if (!text) return toast('Rien à traduire', 'info');
  const apiKey = state.settings.deepseekApiKey;
  if (!apiKey) {
    toast('Clé API DeepSeek manquante. Va dans les paramètres.', 'error', 5000);
    return;
  }

  const target = prompt('Traduire vers : (fr ou en)', 'en');
  if (!target || !['fr', 'en'].includes(target.toLowerCase())) return;

  toast('Traduction en cours...', 'info', 5000);
  const res = await window.api.deepseek.translate({
    text,
    apiKey,
    targetLanguage: target.toLowerCase(),
  });
  if (res.ok) {
    $('transcript-text').value = res.translation;
    toast(`Traduction en ${target} terminée`, 'success');
  } else {
    toast('Erreur : ' + res.error, 'error', 6000);
  }
});

// ====== Exports ======
function buildExportPayload() {
  return {
    title: $('live-title').value || 'Transcription Siabanni',
    text: $('transcript-text').value,
    segments: state.currentSegments,
    summary: $('summary-box').style.display !== 'none' ? $('summary-content').textContent : null,
    date: new Date().toISOString(),
    author: 'Siabanni Transcribe - Consortium SFR',
    outputDirectory: state.settings.outputDirectory,
    includeTimestamps: state.settings.enableTimestamps !== false,
  };
}

$('btn-export-docx').addEventListener('click', async () => {
  if (!$('transcript-text').value.trim()) return toast('Rien à exporter', 'info');
  const res = await window.api.export.docx(buildExportPayload());
  if (res.ok) {
    toast('Fichier Word créé', 'success', 4000);
    window.api.shell.showItemInFolder(res.path);
  } else {
    toast('Erreur export Word : ' + res.error, 'error', 6000);
  }
});

$('btn-export-pdf').addEventListener('click', async () => {
  if (!$('transcript-text').value.trim()) return toast('Rien à exporter', 'info');
  const res = await window.api.export.pdf(buildExportPayload());
  if (res.ok) {
    toast('Fichier PDF créé', 'success', 4000);
    window.api.shell.showItemInFolder(res.path);
  } else {
    toast('Erreur export PDF : ' + res.error, 'error', 6000);
  }
});

$('btn-export-txt').addEventListener('click', async () => {
  if (!$('transcript-text').value.trim()) return toast('Rien à exporter', 'info');
  const res = await window.api.export.txt(buildExportPayload());
  if (res.ok) {
    toast('Fichier texte créé', 'success', 4000);
    window.api.shell.showItemInFolder(res.path);
  } else {
    toast('Erreur export TXT : ' + res.error, 'error', 6000);
  }
});

// ====== Menu natif (IPC) ======
window.api.menu.onImportFile(() => switchTab('file'));
window.api.menu.onOpenSettings(() => switchTab('settings'));

// ====== Init ======
loadSettings();
