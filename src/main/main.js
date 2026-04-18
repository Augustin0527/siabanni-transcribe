/**
 * Siabanni Transcribe — Processus principal Electron
 * Developpe par le Consortium SFR
 *
 * Role :
 *   - Creer la fenetre de l'application
 *   - Gerer les communications IPC entre UI et services
 *   - Exposer les API natives (fichiers, dialog, etc.)
 */

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Services de l'app
const transcriptionService = require('../services/transcription');
const exportService = require('../services/exporter');
const deepseekService = require('../services/deepseek');
const audioService = require('../services/audio');

// Stockage persistant des preferences (cle API, reglages)
const store = new Store({
  name: 'siabanni-config',
  defaults: {
    deepseekApiKey: '',
    whisperModel: 'base',      // tiny | base | small | medium | large
    language: 'auto',          // auto | fr | en
    enableDiarization: false,
    enableTimestamps: true,
    outputDirectory: app.getPath('documents'),
  }
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'Siabanni Transcribe',
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#0f172a',
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Ouvrir les liens externes dans le navigateur
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Menu applicatif simplifie
function buildMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Importer audio/video...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:import-file'),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Quitter' },
      ],
    },
    {
      label: 'Edition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Retablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout selectionner' },
      ],
    },
    {
      label: 'Reglages',
      submenu: [
        {
          label: 'Ouvrir les parametres...',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('menu:open-settings'),
        },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'A propos de Siabanni Transcribe',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'A propos',
              message: 'Siabanni Transcribe v1.0.0',
              detail:
                'Application de transcription automatique\n' +
                'developpee par le Consortium SFR.\n\n' +
                'Transcription locale avec Whisper.\n' +
                'Resume IA propulse par DeepSeek.\n\n' +
                '(c) 2026 Consortium SFR',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ====== Gestion du cycle de vie ======

app.whenReady().then(() => {
  createWindow();
  buildMenu();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ====== Handlers IPC ======

// --- Parametres ---
ipcMain.handle('settings:get', (_evt, key) => store.get(key));
ipcMain.handle('settings:set', (_evt, key, value) => {
  store.set(key, value);
  return true;
});
ipcMain.handle('settings:all', () => store.store);

// --- Dialogue de fichier ---
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selectionner un fichier audio ou video',
    properties: ['openFile'],
    filters: [
      {
        name: 'Audio / Video',
        extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'mp4', 'mov', 'mkv', 'webm', 'avi'],
      },
      { name: 'Tous les fichiers', extensions: ['*'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:saveFile', async (_evt, { defaultPath, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Enregistrer sous',
    defaultPath,
    filters,
  });
  if (result.canceled) return null;
  return result.filePath;
});

ipcMain.handle('dialog:chooseDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choisir un dossier de sortie',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// --- Transcription ---
ipcMain.handle('transcribe:file', async (evt, { filePath, options }) => {
  const send = (msg) => evt.sender.send('transcribe:progress', msg);
  try {
    const result = await transcriptionService.transcribeFile(filePath, options, send);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('transcribe:chunk', async (_evt, { audioBuffer, options }) => {
  try {
    const text = await transcriptionService.transcribeBuffer(audioBuffer, options);
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('transcribe:ensureModel', async (_evt, modelName) => {
  try {
    await transcriptionService.ensureModel(modelName);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// --- Enregistrement audio systeme (Windows/Mac) ---
ipcMain.handle('audio:getSources', async () => {
  return await audioService.listAudioSources();
});

// --- DeepSeek (resume et traduction) ---
ipcMain.handle('deepseek:summarize', async (_evt, { text, apiKey, language }) => {
  try {
    const summary = await deepseekService.summarize(text, apiKey, language);
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('deepseek:translate', async (_evt, { text, apiKey, targetLanguage }) => {
  try {
    const translation = await deepseekService.translate(text, apiKey, targetLanguage);
    return { ok: true, translation };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// --- Exports ---
ipcMain.handle('export:docx', async (_evt, payload) => {
  try {
    const savePath = await exportService.exportDocx(payload);
    return { ok: true, path: savePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('export:pdf', async (_evt, payload) => {
  try {
    const savePath = await exportService.exportPdf(payload);
    return { ok: true, path: savePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('export:txt', async (_evt, payload) => {
  try {
    const savePath = await exportService.exportTxt(payload);
    return { ok: true, path: savePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('shell:openPath', async (_evt, p) => {
  await shell.openPath(p);
});

ipcMain.handle('shell:showItemInFolder', async (_evt, p) => {
  shell.showItemInFolder(p);
});
