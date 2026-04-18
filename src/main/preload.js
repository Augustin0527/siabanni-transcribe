/**
 * Siabanni Transcribe — Script de preload
 * Developpe par le Consortium SFR
 *
 * Expose une API securisee au renderer (contextBridge).
 * Aucune API Node brute n'est exposee au navigateur.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    all: () => ipcRenderer.invoke('settings:all'),
  },
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    saveFile: (opts) => ipcRenderer.invoke('dialog:saveFile', opts),
    chooseDirectory: () => ipcRenderer.invoke('dialog:chooseDirectory'),
  },
  transcribe: {
    file: (payload) => ipcRenderer.invoke('transcribe:file', payload),
    chunk: (payload) => ipcRenderer.invoke('transcribe:chunk', payload),
    ensureModel: (modelName) => ipcRenderer.invoke('transcribe:ensureModel', modelName),
    onProgress: (callback) => {
      const listener = (_evt, msg) => callback(msg);
      ipcRenderer.on('transcribe:progress', listener);
      return () => ipcRenderer.removeListener('transcribe:progress', listener);
    },
  },
  audio: {
    getSources: () => ipcRenderer.invoke('audio:getSources'),
  },
  deepseek: {
    summarize: (payload) => ipcRenderer.invoke('deepseek:summarize', payload),
    translate: (payload) => ipcRenderer.invoke('deepseek:translate', payload),
  },
  export: {
    docx: (payload) => ipcRenderer.invoke('export:docx', payload),
    pdf: (payload) => ipcRenderer.invoke('export:pdf', payload),
    txt: (payload) => ipcRenderer.invoke('export:txt', payload),
  },
  shell: {
    openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
    showItemInFolder: (p) => ipcRenderer.invoke('shell:showItemInFolder', p),
  },
  menu: {
    onImportFile: (callback) => ipcRenderer.on('menu:import-file', callback),
    onOpenSettings: (callback) => ipcRenderer.on('menu:open-settings', callback),
  },
  platform: process.platform,
  appName: 'Siabanni Transcribe',
  appAuthor: 'Consortium SFR',
  appVersion: '1.0.0',
});
