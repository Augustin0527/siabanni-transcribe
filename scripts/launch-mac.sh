#!/bin/bash
# ========================================================================
#  Siabanni Transcribe — Lancement macOS
#  Consortium SFR
# ========================================================================

cd "$(dirname "$0")/.."

if [ ! -d "node_modules" ]; then
    echo " Les dépendances ne sont pas installées."
    echo " Lance d'abord : ./scripts/install-mac.sh"
    exit 1
fi

npm start
