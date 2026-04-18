# Publier Siabanni Transcribe sur GitHub

*Guide pas-à-pas pour héberger ton app sur GitHub et permettre à n'importe qui de télécharger les versions Windows et Mac.*

---

## Ce que tu vas obtenir

Une page GitHub publique avec :
- Le code source de l'application.
- Une **section "Releases"** où tes utilisateurs pourront télécharger :
  - **Siabanni-Transcribe-Setup.exe** (Windows)
  - **Siabanni-Transcribe.dmg** (macOS)
- **Compilation automatique** à chaque nouvelle version : tu n'as pas besoin d'avoir un Mac pour produire la version Mac, ni un PC Windows pour produire le .exe. GitHub compile tout pour toi gratuitement !

---

## Étape 1 — Créer un compte GitHub

Si tu n'en as pas encore :
1. Va sur https://github.com/signup
2. Crée ton compte (gratuit).

---

## Étape 2 — Installer Git sur ton ordinateur

- **Windows** : https://git-scm.com/download/win (installer avec toutes les options par défaut)
- **macOS** : ouvre Terminal et tape `git --version`. Si Git n'est pas là, macOS te proposera de l'installer.

---

## Étape 3 — Créer le dépôt sur GitHub

1. Connecte-toi sur https://github.com
2. En haut à droite, clique sur le **"+"** puis **"New repository"**.
3. Remplis :
   - **Repository name** : `siabanni-transcribe`
   - **Description** : `Application de transcription automatique de réunions et entretiens - Consortium SFR`
   - **Public** ou **Private** (Public recommandé pour que tout le monde puisse télécharger).
   - **NE COCHE PAS** "Add a README file" (on a déjà le nôtre).
4. Clique sur **"Create repository"**.

GitHub te montre alors une page avec des instructions. **Garde cette page ouverte**.

---

## Étape 4 — Envoyer le projet sur GitHub

### Sur Windows
Ouvre **PowerShell** (menu Démarrer → tape "powershell") et fais glisser le dossier `siabanni-transcribe` dedans pour avoir son chemin, ou navigue avec :

```powershell
cd "C:\chemin\vers\siabanni-transcribe"
```

Puis exécute **ligne par ligne** :

```powershell
git init
git add .
git commit -m "Premier commit - Siabanni Transcribe v1.0.0"
git branch -M main
git remote add origin https://github.com/TON-USERNAME/siabanni-transcribe.git
git push -u origin main
```

> ⚠️ Remplace `TON-USERNAME` par ton nom d'utilisateur GitHub.

GitHub va te demander de te connecter. Si ça ne marche pas, utilise **GitHub Desktop** (voir plus bas).

### Sur macOS
Ouvre **Terminal**, navigue dans le dossier :

```bash
cd /chemin/vers/siabanni-transcribe
git init
git add .
git commit -m "Premier commit - Siabanni Transcribe v1.0.0"
git branch -M main
git remote add origin https://github.com/TON-USERNAME/siabanni-transcribe.git
git push -u origin main
```

### Alternative plus simple : GitHub Desktop

Si les commandes te semblent compliquées, télécharge **GitHub Desktop** :
- https://desktop.github.com
- Clique sur **"File" → "Add local repository"** → choisis ton dossier `siabanni-transcribe`.
- Clique sur **"Publish repository"**.

---

## Étape 5 — Déclencher le build automatique

Maintenant, à chaque fois que tu veux publier une nouvelle version téléchargeable :

### Méthode 1 : Créer un "tag" (recommandé)

Dans le terminal, dans le dossier du projet :

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub va automatiquement :
1. Compiler la version Windows (.exe) — ~5 minutes.
2. Compiler la version macOS (.dmg) — ~5 minutes.
3. Publier une **"Release"** avec les 2 fichiers.

### Méthode 2 : Lancer manuellement

1. Va sur `https://github.com/TON-USERNAME/siabanni-transcribe`
2. Clique sur l'onglet **"Actions"**.
3. À gauche, clique sur **"Build Siabanni Transcribe"**.
4. Clique sur **"Run workflow"** (bouton à droite) → **"Run workflow"**.
5. Attends ~10 minutes.
6. Les fichiers compilés apparaissent dans l'onglet Actions (section Artifacts).

---

## Étape 6 — Tes utilisateurs téléchargent

Une fois la Release publiée, quiconque va sur :

**`https://github.com/TON-USERNAME/siabanni-transcribe/releases`**

...verra les boutons de téléchargement :
- **Siabanni-Transcribe-Setup-1.0.0.exe** (Windows)
- **Siabanni-Transcribe-1.0.0.dmg** (macOS)

Ils cliquent, téléchargent, double-cliquent, **c'est installé !** Aucune installation de Node.js, aucune commande à taper.

---

## Étape 7 — Mettre à jour l'application plus tard

Quand tu veux publier une nouvelle version :

```bash
# 1. Modifie tes fichiers
# 2. Mets à jour la version dans package.json (ex: "1.0.1")
# 3. Commit et push
git add .
git commit -m "Version 1.0.1 - corrections"
git push

# 4. Crée un nouveau tag pour déclencher le build
git tag v1.0.1
git push origin v1.0.1
```

Une nouvelle Release apparaît automatiquement sur GitHub.

---

## Petits conseils

### Rendre la page GitHub jolie
Ton `README.md` s'affiche automatiquement sur la page d'accueil du dépôt. Il inclut déjà des explications claires.

### Ajouter un logo/icône dans le README
Place une capture d'écran dans `assets/` et ajoute dans le README :
```markdown
![Siabanni Transcribe](assets/screenshot.png)
```

### Signature du code (optionnel, pour une distribution "pro")
- **Windows** : sans signature, Windows affichera un avertissement "Éditeur inconnu" à l'installation. Un certificat de signature coûte ~200 €/an. Pour commencer, ça ne gêne pas l'usage.
- **macOS** : sans notarisation, l'utilisateur doit faire "clic droit → Ouvrir" au premier lancement. La notarisation nécessite un compte développeur Apple (99 $/an).

Tu peux commencer sans, et ajouter la signature plus tard.

### Visibilité du dépôt
- **Public** : tout le monde peut voir et télécharger. Recommandé pour un produit grand public.
- **Private** : seuls tes collaborateurs voient le dépôt. Les Releases publiques restent accessibles si tu génères un lien dédié, mais c'est plus compliqué.

### Limite gratuite GitHub Actions
- Pour les dépôts **publics** : **gratuit illimité** pour les builds. Parfait pour toi.
- Pour les dépôts **privés** : 2000 minutes gratuites/mois (largement suffisant).

---

## En résumé

1. Crée le dépôt sur github.com
2. Pousse le code (`git push`)
3. Crée un tag (`git tag v1.0.0 && git push origin v1.0.0`)
4. Attends 10 minutes
5. La page "Releases" contient les installeurs téléchargeables ✨

---

## Questions / Problèmes courants

**"git push" me demande un mot de passe et ça ne marche pas**
→ GitHub n'accepte plus les mots de passe. Utilise un **Personal Access Token** : https://github.com/settings/tokens (Generate new token classic, coche "repo"). Copie-colle ce token quand GitHub te demande le mot de passe.

**Le build échoue sur GitHub Actions**
→ Va dans l'onglet Actions, clique sur le build en échec, regarde les logs. Les erreurs les plus courantes : dépendance manquante dans package.json, problème de signature Mac. Envoie-moi les logs et je t'aide à corriger.

**Comment voir le statut du build en direct**
→ Onglet "Actions" sur ta page GitHub. Tu vois les builds en cours avec leur avancement.

---

*Siabanni Transcribe — développé par le Consortium SFR*
