#!/bin/bash
# ============================================================================
# Siabanni Transcribe - Deploiement GitHub (macOS / Linux)
# Consortium SFR
# ----------------------------------------------------------------------------
# Ce script :
#   1. Verifie que Git et GitHub CLI sont installes
#   2. Te connecte a GitHub si besoin
#   3. Cree le depot distant
#   4. Push le code
#   5. Cree une premiere release (tag v1.0.0) => GitHub Actions compile
#      automatiquement les installeurs Windows (.exe) et macOS (.dmg)
#
# Utilisation :
#   chmod +x scripts/deploy-github.sh
#   ./scripts/deploy-github.sh
# ============================================================================

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE} Siabanni Transcribe - Deploiement sur GitHub${NC}"
echo -e "${BLUE} Consortium SFR${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# --- Verifications ---
if ! command -v git &> /dev/null; then
    echo -e "${RED}[ERREUR] Git n'est pas installe.${NC}"
    echo "  Installe-le : https://git-scm.com/downloads"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Git detecte : $(git --version)"

if ! command -v gh &> /dev/null; then
    echo -e "${RED}[ERREUR] GitHub CLI (gh) n'est pas installe.${NC}"
    echo "  Installe-le : https://cli.github.com/"
    echo "  macOS : brew install gh"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} GitHub CLI detecte : $(gh --version | head -1)"
echo ""

# --- Se placer a la racine du projet ---
cd "$(dirname "$0")/.."
PROJECT_DIR="$(pwd)"
echo -e "${BLUE}Dossier du projet :${NC} $PROJECT_DIR"
echo ""

# --- Authentification GitHub ---
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}[CONNEXION]${NC} Tu dois te connecter a ton compte GitHub."
    echo "Une page va s'ouvrir dans ton navigateur."
    echo ""
    gh auth login --web --git-protocol https
else
    GH_USER=$(gh api user --jq .login)
    echo -e "${GREEN}[OK]${NC} Deja connecte en tant que : $GH_USER"
fi
echo ""

GH_USER=$(gh api user --jq .login)

# --- Nom du depot ---
REPO_NAME="siabanni-transcribe"
read -p "Nom du depot sur GitHub [$REPO_NAME] : " USER_REPO
REPO_NAME="${USER_REPO:-$REPO_NAME}"

# --- Visibilite ---
echo ""
echo "Le depot doit-il etre :"
echo "  1) Public (tout le monde peut voir et telecharger - recommande)"
echo "  2) Prive (visible seulement par toi)"
read -p "Choix [1] : " VIS_CHOICE
VIS_CHOICE="${VIS_CHOICE:-1}"
if [ "$VIS_CHOICE" = "2" ]; then
    VISIBILITY="--private"
    echo -e "${YELLOW}Depot PRIVE${NC}"
else
    VISIBILITY="--public"
    echo -e "${GREEN}Depot PUBLIC${NC}"
fi
echo ""

# --- Initialisation git si besoin ---
if [ ! -d ".git" ]; then
    echo -e "${BLUE}[INIT]${NC} Initialisation du depot git local..."
    git init -q -b main
    git add .
    git commit -q -m "Initial commit - Siabanni Transcribe v1.0.0 par le Consortium SFR"
else
    echo -e "${GREEN}[OK]${NC} Depot git local deja initialise."
    if ! git log -1 &> /dev/null; then
        git add .
        git commit -q -m "Initial commit - Siabanni Transcribe v1.0.0"
    fi
fi

# --- Creation du depot distant ---
echo ""
echo -e "${BLUE}[GITHUB]${NC} Creation du depot $GH_USER/$REPO_NAME..."
if gh repo view "$GH_USER/$REPO_NAME" &> /dev/null; then
    echo -e "${YELLOW}[INFO]${NC} Le depot existe deja. On y pousse le code."
else
    gh repo create "$REPO_NAME" \
        $VISIBILITY \
        --description "Application de transcription automatique de reunions et entretiens - Consortium SFR" \
        --source=. \
        --remote=origin \
        --push
    echo -e "${GREEN}[OK]${NC} Depot cree et code pousse !"
    echo ""
    echo -e "${BLUE}URL :${NC} https://github.com/$GH_USER/$REPO_NAME"
    echo ""

    # --- Proposer de creer une release v1.0.0 ---
    read -p "Creer le tag v1.0.0 maintenant (declenche la compilation automatique) ? [O/n] : " CREATE_TAG
    CREATE_TAG="${CREATE_TAG:-O}"
    if [ "$CREATE_TAG" = "O" ] || [ "$CREATE_TAG" = "o" ]; then
        git tag v1.0.0
        git push origin v1.0.0
        echo ""
        echo -e "${GREEN}[OK]${NC} Tag v1.0.0 pousse."
        echo -e "${BLUE}GitHub Actions compile maintenant les installeurs...${NC}"
        echo "Suis la progression ici :"
        echo -e "  ${BLUE}https://github.com/$GH_USER/$REPO_NAME/actions${NC}"
        echo ""
        echo "Dans ~10 minutes, les installeurs seront disponibles ici :"
        echo -e "  ${BLUE}https://github.com/$GH_USER/$REPO_NAME/releases${NC}"
    fi
    exit 0
fi

# Si le depot existait deja, configurer le remote et pousser
if ! git remote | grep -q origin; then
    git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
fi
git branch -M main
git push -u origin main
echo -e "${GREEN}[OK]${NC} Code pousse sur GitHub."
echo ""
echo -e "${BLUE}URL :${NC} https://github.com/$GH_USER/$REPO_NAME"

# Tag version
read -p "Creer le tag v1.0.0 maintenant (declenche la compilation automatique) ? [O/n] : " CREATE_TAG
CREATE_TAG="${CREATE_TAG:-O}"
if [ "$CREATE_TAG" = "O" ] || [ "$CREATE_TAG" = "o" ]; then
    git tag v1.0.0 2>/dev/null || echo "Tag v1.0.0 existe deja."
    git push origin v1.0.0
    echo ""
    echo -e "${GREEN}[OK]${NC} Tag v1.0.0 pousse."
    echo "Suis la progression : https://github.com/$GH_USER/$REPO_NAME/actions"
fi
