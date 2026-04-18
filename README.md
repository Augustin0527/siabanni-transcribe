# Siabanni Transcribe

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.0-purple)

Application de bureau (Windows et macOS) de **transcription automatique** de réunions et d'entretiens, en français et en anglais, avec résumé IA et export en Word / PDF / Texte.

Développée par le **Consortium SFR**.

---

## 📥 Téléchargement

Rends-toi sur la page **[Releases](../../releases/latest)** pour télécharger la dernière version :

| Système | Fichier |
|--------|----------|
| 🪟 **Windows** | `Siabanni-Transcribe-Setup-x.x.x.exe` — double-clique pour installer |
| 🍎 **macOS** | `Siabanni-Transcribe-x.x.x.dmg` — ouvre puis glisse dans Applications |

Aucune installation de Node.js ou autre outil n'est nécessaire : les installeurs contiennent tout.

> Si tu veux construire l'app toi-même depuis le code source, lis la section [Installation pour développeurs](#installation-pour-développeurs) plus bas.

---

## Fonctionnalités

- **Transcription en direct** — enregistrement et transcription en temps réel (micro, audio système, ou les deux) pendant tes réunions / entretiens.
- **Transcription de fichiers** — glisse-dépose un fichier audio ou vidéo (MP3, WAV, M4A, MP4, MOV, MKV, WebM...) et obtiens la transcription.
- **Multilingue** — français, anglais, ou détection automatique.
- **Résumé IA** (via DeepSeek) — génère automatiquement un résumé structuré avec points clés, décisions et actions.
- **Traduction FR ↔ EN** (via DeepSeek).
- **Diarisation optionnelle** — identifie les différents intervenants ("Intervenant 1", "Intervenant 2"...).
- **Horodatage** — timestamps automatiques.
- **Exports** : Word (.docx), PDF, Texte (.txt).
- **100 % local** pour la transcription — tes audios ne quittent jamais ta machine.

---

## Installation pour développeurs

*Cette section s'adresse aux développeurs souhaitant modifier l'app ou la compiler eux-mêmes. Si tu veux juste l'utiliser, télécharge les installeurs depuis la section [Téléchargement](#-téléchargement) ci-dessus.*

### Étape 1 : Installer Node.js

Télécharge et installe **Node.js LTS (version 18 ou plus récente)** :
https://nodejs.org/fr/download

Vérifie l'installation en ouvrant un terminal et en tapant :
```
node --version
```

### Étape 2 : Télécharger le projet

Place le dossier `siabanni-transcribe` à l'endroit de ton choix (ex : `Documents`).

### Étape 3 : Installer les dépendances

**Sur Windows** : double-clique sur `scripts/install-windows.bat`.

**Sur macOS** : ouvre Terminal, déplace-toi dans le dossier, puis exécute :
```bash
chmod +x scripts/install-mac.sh
./scripts/install-mac.sh
```

L'installation prend 5 à 10 minutes (téléchargement d'Electron, FFmpeg, etc.).

### Étape 4 : Lancer l'application

**Windows** : double-clique sur `scripts/launch-windows.bat`.

**macOS** :
```bash
./scripts/launch-mac.sh
```

Ou, dans les deux cas, depuis le dossier du projet :
```bash
npm start
```

**Premier lancement** : le modèle Whisper (~142 Mo pour le modèle "base") sera téléchargé automatiquement. Patiente quelques minutes.

---

## Configuration

Au premier lancement, va dans l'onglet **Paramètres** et :

1. **Colle ta clé API DeepSeek** (obtenue sur https://platform.deepseek.com).
   - Requise pour les résumés automatiques et la traduction.
   - La transcription seule ne nécessite pas de clé.
2. Choisis le **modèle Whisper** par défaut :
   - `tiny` : 75 Mo, très rapide, moins précis.
   - `base` : 142 Mo, équilibré (recommandé pour débuter).
   - `small` : 466 Mo, précis.
   - `medium` : 1,5 Go, très précis, plus lent.
3. Choisis le **dossier de sortie** pour les fichiers exportés.
4. Active ou non la **diarisation** et les **timestamps**.

---

## Utilisation

### Transcrire un fichier

1. Onglet **Fichier audio/vidéo**.
2. Glisse-dépose ton fichier (ou double-clique dans la zone).
3. Choisis la langue et le modèle.
4. Clique sur **Lancer la transcription**.
5. Le résultat apparaît dans l'onglet **Transcription**.

### Transcrire en direct

1. Onglet **Direct (live)**.
2. Choisis la source :
   - **Microphone** : ta voix uniquement.
   - **Audio système** : le son de ton ordinateur (utile pour transcrire une réunion Zoom / Meet / Teams en cours).
   - **Les deux** : ton micro + l'audio système.
3. Clique sur **Démarrer l'enregistrement**.
4. La transcription s'affiche au fur et à mesure (mise à jour toutes les 8 secondes environ).
5. Clique sur **Arrêter** quand tu as terminé.

### Notes importantes pour l'audio système

- **Windows** : au clic sur "Démarrer" avec source = Audio système, une boîte de dialogue te proposera de partager un onglet / fenêtre / écran. Choisis la fenêtre de ta réunion et **coche "Partager l'audio"**.
- **macOS** : macOS ne permet pas nativement à une application de capter l'audio système. Installe un pilote virtuel gratuit comme **BlackHole** (https://existential.audio/blackhole/) ou **Loopback** pour rediriger l'audio système vers l'entrée du micro.

### Résumer et traduire

Depuis l'onglet **Transcription** :
- **✨ Résumé IA** : génère un résumé structuré avec DeepSeek.
- **🌍 Traduire** : traduit la transcription vers l'autre langue.

Ces actions requièrent une clé API DeepSeek active.

### Exporter

Choisis entre Word (.docx), PDF ou Texte. Le fichier s'enregistre dans ton dossier de sortie (configurable dans les paramètres) et s'ouvre automatiquement dans ton explorateur.

---

## Arborescence du projet

```
siabanni-transcribe/
├── package.json                    # Dépendances et config build
├── README.md                       # Ce fichier
├── .gitignore
├── src/
│   ├── main/
│   │   ├── main.js                 # Processus principal Electron
│   │   └── preload.js              # Pont sécurisé main ↔ renderer
│   ├── renderer/
│   │   ├── index.html              # Interface utilisateur
│   │   ├── styles.css              # Styles
│   │   └── app.js                  # Logique UI
│   └── services/
│       ├── transcription.js        # Whisper (via nodejs-whisper)
│       ├── audio.js                # Sources audio
│       ├── deepseek.js             # API DeepSeek (résumé + traduction)
│       └── exporter.js             # Exports Word / PDF / TXT
├── scripts/
│   ├── install-windows.bat         # Installation Windows (double-clic)
│   ├── launch-windows.bat          # Lancement Windows (double-clic)
│   ├── install-mac.sh              # Installation macOS
│   └── launch-mac.sh               # Lancement macOS
├── assets/
│   └── entitlements.mac.plist      # Permissions macOS
└── models/                         # Modèles Whisper téléchargés ici
```

---

## Packager en installeur distribuable (optionnel)

Pour créer un vrai installeur (.exe sur Windows, .dmg sur Mac) :

```bash
# Windows
npm run build:win

# macOS (doit être lancé sur un Mac)
npm run build:mac
```

Les fichiers générés apparaîtront dans `dist/`.

**Remarque** : pour signer et notariser l'app sur Mac (nécessaire pour la distribuer à d'autres utilisateurs), il faut un compte développeur Apple (99 $/an). Sans signature, l'app fonctionne quand même sur ton Mac (clique droit → Ouvrir la première fois).

---

## Dépannage

**"Node.js n'est pas reconnu"**
→ Installe Node.js LTS et redémarre ton terminal.

**Le téléchargement du modèle Whisper est lent ou échoue**
→ Vérifie ta connexion. Le modèle se télécharge une seule fois. Tu peux aussi choisir un modèle plus petit (tiny) dans les paramètres.

**"Microphone access denied" sur Mac**
→ Va dans Réglages système → Confidentialité & sécurité → Microphone → active Siabanni Transcribe.

**Erreur "Module nodejs-whisper introuvable"**
→ Relance `npm install` dans le dossier du projet.

**Le résumé ou la traduction ne fonctionne pas**
→ Vérifie que ta clé API DeepSeek est bien collée dans les paramètres et qu'elle est valide.

**L'audio système n'est pas capturé sur Mac**
→ Installe BlackHole (gratuit) : https://existential.audio/blackhole/

---

## Confidentialité

- **Transcription** : 100 % locale via Whisper. Aucun audio n'est envoyé sur un serveur.
- **Résumé IA et traduction** : envoyés à l'API DeepSeek (Chine). Ne les utilise pas pour des contenus strictement confidentiels sans autorisation.
- **Clé API** : stockée localement sur ta machine uniquement.

---

## Crédits

- **Siabanni Transcribe** — Développé par le **Consortium SFR**.
- **Whisper** — OpenAI (open source, MIT).
- **whisper.cpp** — Georgi Gerganov (open source).
- **DeepSeek** — DeepSeek AI (API commerciale, freemium).
- **Electron, FFmpeg, docx, pdfkit** — open source.

---

## Licence

MIT © 2026 Consortium SFR.
