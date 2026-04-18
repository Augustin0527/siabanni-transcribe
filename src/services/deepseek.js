/**
 * Siabanni Transcribe — Service DeepSeek (resume IA + traduction)
 * Consortium SFR
 *
 * Utilise l'API DeepSeek compatible OpenAI.
 * Endpoint : https://api.deepseek.com/v1/chat/completions
 */

const https = require('https');

const DEEPSEEK_HOST = 'api.deepseek.com';
const DEEPSEEK_PATH = '/v1/chat/completions';
const MODEL = 'deepseek-chat';

function callDeepSeek({ apiKey, messages, temperature = 0.3, maxTokens = 2000 }) {
  return new Promise((resolve, reject) => {
    if (!apiKey) return reject(new Error('Clé API DeepSeek manquante.'));

    const body = JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    });

    const req = https.request(
      {
        host: DEEPSEEK_HOST,
        path: DEEPSEEK_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120000,
      },
      (res) => {
        let chunks = '';
        res.on('data', (d) => (chunks += d));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(chunks);
            if (res.statusCode !== 200) {
              return reject(new Error(
                parsed.error?.message || `HTTP ${res.statusCode}`
              ));
            }
            const content = parsed.choices?.[0]?.message?.content;
            if (!content) return reject(new Error('Réponse DeepSeek vide.'));
            resolve(content);
          } catch (e) {
            reject(new Error('Réponse DeepSeek invalide : ' + e.message));
          }
        });
      }
    );

    req.on('error', (err) => reject(new Error('Erreur réseau DeepSeek : ' + err.message)));
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout DeepSeek.')); });

    req.write(body);
    req.end();
  });
}

async function summarize(text, apiKey, language = 'fr') {
  const isEn = language === 'en';
  const systemPrompt = isEn
    ? 'You are an assistant that summarizes meeting or interview transcripts professionally and concisely.'
    : 'Tu es un assistant qui résume les transcriptions de réunions ou d’entretiens de manière professionnelle et concise.';

  const userPrompt = isEn
    ? `Summarize the following transcript. Structure your response as:

## Summary
(2-4 sentences)

## Key Points
- point 1
- point 2
- ...

## Decisions / Action Items
- action 1
- ...

## Participants / Speakers mentioned
- ...

Transcript:
"""
${text}
"""`
    : `Résume la transcription suivante. Structure ta réponse ainsi :

## Résumé
(2 à 4 phrases)

## Points clés
- point 1
- point 2
- ...

## Décisions / Actions à mener
- action 1
- ...

## Participants / Intervenants mentionnés
- ...

Transcription :
"""
${text}
"""`;

  return await callDeepSeek({
    apiKey,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 1500,
  });
}

async function translate(text, apiKey, targetLanguage) {
  const targetName = targetLanguage === 'fr' ? 'français' : 'anglais';
  const systemPrompt = `Tu es un traducteur professionnel. Traduis fidèlement le texte fourni en ${targetName}, en conservant les timestamps et la structure (étiquettes d’intervenants, sauts de ligne). Ne commente pas, ne résume pas : fournis uniquement la traduction.`;
  const userPrompt = `Traduis le texte suivant en ${targetName} :\n\n${text}`;

  return await callDeepSeek({
    apiKey,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    maxTokens: 4000,
  });
}

module.exports = { summarize, translate };
