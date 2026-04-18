# Guide de démarrage rapide — Siabanni Transcribe

*Pour commencer en moins de 15 minutes.*

---

## 1. Installe Node.js

- Va sur https://nodejs.org/fr/download
- Télécharge la version **LTS** (à gauche).
- Lance l'installateur, clique sur "Suivant" jusqu'au bout.
- Redémarre ton ordinateur (par sécurité).

## 2. Ouvre le dossier du projet

Extrais le dossier `siabanni-transcribe` quelque part (ex : `Bureau` ou `Documents`).

## 3. Installe l'application

### Sur Windows
Double-clique sur :
```
siabanni-transcribe\scripts\install-windows.bat
```
Attends 5 à 10 minutes. Laisse la fenêtre noire ouverte.

### Sur macOS
Ouvre **Terminal**, tape :
```
cd
```
Puis glisse-dépose le dossier `siabanni-transcribe` dans la fenêtre Terminal, puis Entrée.
Ensuite tape :
```
chmod +x scripts/install-mac.sh && ./scripts/install-mac.sh
```
Attends 5 à 10 minutes.

## 4. Lance l'application

### Sur Windows
Double-clique sur `scripts\launch-windows.bat`.

### Sur macOS
Dans Terminal (dans le dossier du projet) :
```
./scripts/launch-mac.sh
```

L'application s'ouvre. Au premier lancement, le modèle de transcription Whisper se télécharge (~142 Mo). Patiente quelques minutes.

## 5. Configure ta clé DeepSeek

1. Clique sur **Paramètres** (⚙️) dans la barre de gauche.
2. Colle ta clé API DeepSeek dans le champ prévu.
3. Clique sur **Enregistrer**.

## 6. Utilise l'application

### Pour transcrire une réunion en direct :
- Onglet **Direct (live)** → clique sur **Démarrer l'enregistrement**.

### Pour transcrire un fichier existant :
- Onglet **Fichier audio/vidéo** → glisse-dépose ton fichier → clique sur **Lancer la transcription**.

### Pour exporter :
- Onglet **Transcription** → choisis Word, PDF ou Texte.

---

## En cas de problème

Consulte le fichier `README.md` (section "Dépannage") pour les solutions aux erreurs courantes.

---

*Siabanni Transcribe — développé par le Consortium SFR*
