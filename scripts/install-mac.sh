#!/bin/bash
# ========================================================================
#  Siabanni Transcribe — Script d'installation macOS
#  Consortium SFR
# ========================================================================
#  Dans Terminal : chmod +x install-mac.sh && ./install-mac.sh
#  Node.js (version 18+) doit etre installe : https://nodejs.org/fr/download
# ========================================================================

set -e

echo ""
echo " ============================================================"
echo "  Siabanni Transcribe - Installation des dépendances macOS"
echo "  Consortium SFR"
echo " ============================================================"
echo ""

# Vérification Node.js
if ! command -v node &> /dev/null; then
    echo " [ERREUR] Node.js n'est pas installé."
    echo " Installe-le via :"
    echo "   - https://nodejs.org/fr/download  (installer officiel)"
    echo "   - ou : brew install node           (si Homebrew)"
    exit 1
fi

echo " [OK] Node.js détecté : $(node --version)"

# Vérification npm
if ! command -v npm &> /dev/null; then
    echo " [ERREUR] npm introuvable."
    exit 1
fi

# Se placer dans le dossier parent
cd "$(dirname "$0")/.."

echo ""
echo " [1/3] Installation des dépendances npm (peut prendre 5-10 minutes)..."
npm install

echo ""
echo " [2/3] Vérification..."
if [ ! -d "node_modules" ]; then
    echo " [ERREUR] node_modules manquant."
    exit 1
fi

# Rendre le script de lancement exécutable
if [ -f "scripts/launch-mac.sh" ]; then
    chmod +x scripts/launch-mac.sh
fi

echo ""
echo " [3/3] Installation terminée !"
echo ""
echo " ============================================================"
echo "  Installation réussie !"
echo " ============================================================"
echo ""
echo "  Pour lancer l'application :"
echo "    ./scripts/launch-mac.sh"
echo "    ou : npm start"
echo ""
echo "  Premier lancement : le modèle Whisper sera téléchargé"
echo "  automatiquement (~142 Mo pour 'base')."
echo ""
