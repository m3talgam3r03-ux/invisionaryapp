#!/usr/bin/env sh
# ============================================================================
# Pubblica sito + app su GitHub Pages (ramo gh-pages).
#
#   sh scripts/pubblica-web.sh
#
# Gira uguale su Windows (Git Bash) e su macOS: niente PowerShell, niente
# comandi GNU-only. Il ramo gh-pages contiene SOLO output di build, mai
# sorgenti: viene svuotato e riscritto ogni volta.
#
# ── LA STRUTTURA CHE PRODUCE ──
#   /                 la vetrina (sito/index.html)
#   /app/             l'app esportata (expo export, baseUrl /invisionaryapp/app)
#   /404.html         il guscio dell'app, NON la vetrina
#   /.nojekyll        senza questo Pages ignora le cartelle _expo/
#
# Il 404 di radice e' uno solo per tutto il sito: se ci mettessimo la vetrina,
# chi ricarica una rotta dell'app finirebbe sulla pagina di marketing.
# ============================================================================
set -e

RADICE=$(cd "$(dirname "$0")/.." && pwd)
LAVORO="$RADICE/.gh-pages-worktree"
cd "$RADICE"

if [ -n "$(git status --porcelain)" ]; then
  echo "Ci sono modifiche non committate: pubblicherei qualcosa che non e' nel repo." >&2
  git status --short >&2
  exit 1
fi

echo "== 1/4  Esporto l'app per il web =="
rm -rf dist
npx expo export --platform web --output-dir dist --clear

echo "== 2/4  Preparo il ramo gh-pages =="
git worktree remove --force "$LAVORO" 2>/dev/null || true
git fetch origin gh-pages
git worktree add "$LAVORO" gh-pages

# Svuota tutto tranne .git: i file spariti da una build devono sparire anche qui.
find "$LAVORO" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

echo "== 3/4  Copio vetrina e app =="
cp -R sito/. "$LAVORO/"
mkdir -p "$LAVORO/app"
cp -R dist/. "$LAVORO/app/"
cp dist/index.html "$LAVORO/404.html"
touch "$LAVORO/.nojekyll"

echo "== 4/4  Pubblico =="
cd "$LAVORO"
git add -A
if git diff --cached --quiet; then
  echo "Niente da pubblicare: il ramo e' gia' allineato."
else
  git commit -q -m "deploy: $(cd "$RADICE" && git log -1 --format='%h %s')"
  git push -q origin gh-pages
  echo "Pubblicato."
fi

cd "$RADICE"
git worktree remove --force "$LAVORO"
rm -rf dist
echo "Fatto: https://m3talgam3r03-ux.github.io/invisionaryapp/"
