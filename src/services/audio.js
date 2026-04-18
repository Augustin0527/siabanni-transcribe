/**
 * Siabanni Transcribe — Service audio (enumeration des sources)
 * Consortium SFR
 */

const { desktopCapturer } = require('electron');

async function listAudioSources() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
    });
    return sources.map(s => ({
      id: s.id,
      name: s.name,
      type: s.id.startsWith('screen') ? 'screen' : 'window',
    }));
  } catch (err) {
    return [];
  }
}

module.exports = { listAudioSources };
