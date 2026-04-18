/**
 * Siabanni Transcribe — Service de transcription (Whisper local)
 * Consortium SFR
 *
 * Utilise nodejs-whisper (wrapper sur whisper.cpp) pour transcrire en local
 * sans dependance Python, avec telechargement automatique des modeles.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const util = require('util');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

const execFileP = util.promisify(execFile);

// Configuration ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

// Chargement differe de nodejs-whisper (module lourd)
let nodewhisper = null;
async function loadWhisper() {
  if (!nodewhisper) {
    try {
      const mod = require('nodejs-whisper');
      nodewhisper = mod.nodewhisper || mod.default || mod;
    } catch (err) {
      throw new Error(
        'Module nodejs-whisper introuvable. Execute : npm install dans le dossier du projet.\n' +
        'Detail : ' + err.message
      );
    }
  }
  return nodewhisper;
}

/**
 * Convertit n'importe quel fichier audio/video en WAV 16kHz mono
 * (format requis par whisper.cpp).
 */
async function convertToWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioChannels(1)
      .audioFrequency(16000)
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

/**
 * Assure que le modele demande est telecharge.
 * nodejs-whisper gere le telechargement lors du premier usage.
 */
async function ensureModel(modelName) {
  // Les modeles disponibles : tiny, base, small, medium, large-v3
  // nodejs-whisper les telecharge automatiquement dans node_modules/nodejs-whisper/cpp/whisper.cpp/models
  return true;
}

/**
 * Transcrit un fichier audio ou video complet.
 *
 * @param {string} filePath - Chemin du fichier
 * @param {object} options - { language, model, diarization }
 * @param {function} progressCallback - (msg) => void
 * @returns {object} { text, segments: [{ start, end, text }] }
 */
async function transcribeFile(filePath, options = {}, progressCallback = () => {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error('Fichier introuvable : ' + filePath);
  }

  const language = options.language || 'auto';
  const model = options.model || 'base';

  progressCallback({ progress: 10, label: 'Extraction de l’audio...' });

  // Conversion vers WAV 16kHz mono
  const tmpDir = os.tmpdir();
  const wavPath = path.join(tmpDir, `siabanni-${Date.now()}.wav`);
  await convertToWav(filePath, wavPath);

  progressCallback({ progress: 25, label: 'Chargement du modèle Whisper...' });

  const whisper = await loadWhisper();

  progressCallback({ progress: 35, label: 'Transcription en cours (peut prendre plusieurs minutes)...' });

  let result;
  try {
    result = await whisper(wavPath, {
      modelName: model,
      autoDownloadModelName: model,
      whisperOptions: {
        outputInText: false,
        outputInVtt: false,
        outputInSrt: true,
        outputInCsv: false,
        translateToEnglish: false,
        wordTimestamps: false,
        timestamps_length: 20,
        splitOnWord: true,
        language: language === 'auto' ? null : language,
      },
      removeWavFileAfterTranscription: false,
    });
  } catch (err) {
    throw new Error('Transcription en échec : ' + (err.message || err));
  }

  progressCallback({ progress: 90, label: 'Post-traitement...' });

  // Parse du resultat : nodejs-whisper retourne souvent du SRT ou un tableau de segments
  const segments = parseWhisperOutput(result, wavPath);

  // Nettoyage
  try { fs.unlinkSync(wavPath); } catch {}
  // Nettoyage fichier SRT si cree
  try {
    const srtPath = wavPath.replace(/\.wav$/, '.srt');
    if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
  } catch {}

  progressCallback({ progress: 100, label: 'Terminé' });

  const fullText = segments.map(s => s.text).join(' ').trim();
  return { text: fullText, segments };
}

/**
 * Parse la sortie de nodejs-whisper.
 * Gere les differents formats de retour selon les versions.
 */
function parseWhisperOutput(output, wavPath) {
  // Cas 1 : output est deja un tableau d'objets { start, end, text }
  if (Array.isArray(output) && output.length > 0 && output[0].text !== undefined) {
    return output.map(s => ({
      start: parseTimestamp(s.start),
      end: parseTimestamp(s.end),
      text: s.text.trim(),
    }));
  }

  // Cas 2 : output est une string SRT
  if (typeof output === 'string') {
    return parseSrt(output);
  }

  // Cas 3 : lire le SRT genere a cote du WAV
  const srtPath = wavPath.replace(/\.wav$/, '.srt');
  if (fs.existsSync(srtPath)) {
    const srt = fs.readFileSync(srtPath, 'utf-8');
    return parseSrt(srt);
  }

  // Cas 4 : output est un objet avec un champ text
  if (output && output.text) {
    return [{ start: 0, end: 0, text: output.text.trim() }];
  }

  return [];
}

function parseSrt(srt) {
  const segments = [];
  const blocks = srt.split(/\r?\n\r?\n/).filter(b => b.trim());
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    if (lines.length < 3) continue;
    const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    if (!timeMatch) continue;
    const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
    const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
    const text = lines.slice(2).join(' ').trim();
    if (text) segments.push({ start, end, text });
  }
  return segments;
}

function parseTimestamp(ts) {
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const m = ts.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    if (m) return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 1000;
    return parseFloat(ts) || 0;
  }
  return 0;
}

/**
 * Transcrit un buffer audio en memoire (pour la transcription LIVE).
 * L'audio vient du navigateur en WebM Opus, il faut le convertir en WAV.
 */
async function transcribeBuffer(audioBufferArray, options = {}) {
  const buffer = Buffer.from(audioBufferArray);
  const tmpDir = os.tmpdir();
  const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const webmPath = path.join(tmpDir, `siabanni-live-${id}.webm`);
  const wavPath = path.join(tmpDir, `siabanni-live-${id}.wav`);

  fs.writeFileSync(webmPath, buffer);

  try {
    await convertToWav(webmPath, wavPath);
  } catch (err) {
    try { fs.unlinkSync(webmPath); } catch {}
    throw err;
  }

  try {
    const whisper = await loadWhisper();
    const result = await whisper(wavPath, {
      modelName: options.model || 'base',
      autoDownloadModelName: options.model || 'base',
      whisperOptions: {
        outputInText: true,
        outputInSrt: false,
        language: options.language === 'auto' ? null : options.language,
      },
      removeWavFileAfterTranscription: false,
    });

    let text = '';
    if (typeof result === 'string') {
      text = result;
    } else if (Array.isArray(result)) {
      text = result.map(r => r.text || '').join(' ');
    } else if (result && result.text) {
      text = result.text;
    } else {
      // Essayer de lire le .txt genere
      const txtPath = wavPath.replace(/\.wav$/, '.txt');
      if (fs.existsSync(txtPath)) {
        text = fs.readFileSync(txtPath, 'utf-8');
        try { fs.unlinkSync(txtPath); } catch {}
      }
    }
    return text.trim();
  } finally {
    try { fs.unlinkSync(webmPath); } catch {}
    try { fs.unlinkSync(wavPath); } catch {}
  }
}

module.exports = {
  transcribeFile,
  transcribeBuffer,
  ensureModel,
};
