#!/usr/bin/env bash
# Publica o dist/ no Plesk por rsync (mesmo servidor do site da Hallen Tech).
# Por padrão só SIMULA (--dry-run). Para enviar de verdade: scripts/deploy.sh --enviar
#
# Variáveis (exporte antes ou ponha em .env.deploy, que fica fora do git):
#   VPS_HOST   hostname do Plesk (o mesmo do site da Hallen Tech)
#   VPS_USER   usuário SSH com acesso ao vhost
#   DOMAIN     domínio do site (padrão: eddwan.com)
#   SITE_URL   URL pública usada no build (padrão: https://$DOMAIN)
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.deploy ] && set -a && . ./.env.deploy && set +a
: "${VPS_HOST:?defina VPS_HOST}"
: "${VPS_USER:?defina VPS_USER}"
DOMAIN="${DOMAIN:-eddwan.com}"
export SITE_URL="${SITE_URL:-https://$DOMAIN}"

MODO="--dry-run"
if [ "${1:-}" = "--enviar" ]; then MODO=""; fi

echo "Build com SITE_URL=$SITE_URL"
npm run build

echo "rsync para ${VPS_USER}@${VPS_HOST}:/var/www/vhosts/${DOMAIN}/httpdocs/ ${MODO:+(simulação)}"
rsync -avz --delete $MODO \
  --exclude='.well-known/' \
  --exclude='error_docs/' \
  dist/ \
  "${VPS_USER}@${VPS_HOST}:/var/www/vhosts/${DOMAIN}/httpdocs/"

[ -n "$MODO" ] && echo "Foi só uma simulação. Para enviar: scripts/deploy.sh --enviar"
