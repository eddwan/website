#!/usr/bin/env bash
# Proteções do repositório eddwan/website para receber contribuições de fora.
# Rodar UMA vez, pelo dono do repositório, DEPOIS de torná-lo público (no plano gratuito,
# regras de branch e ambientes protegidos só valem em repositório público). Pode rodar de novo:
# cada passo substitui o anterior.
#
#   1. Chave de deploy com escrita (DEPLOY_KEY_POSTS): o deploy agendado envia os posts
#      automáticos para a main com ela. A chave é gerada numa pasta temporária, vai para o
#      GitHub e é apagada da máquina; ninguém vê o conteúdo.
#   2. Regra da main: só entra por pull request, com o CI verde e a aprovação do dono (CODEOWNERS);
#      sem force push e sem apagar o branch. Liberados da regra: o dono (admin) e a chave de deploy.
#   3. Regra da develop: sem force push e sem apagar o branch.
#   4. Ambiente "producao" (que guarda o deploy): só a main publica.
#   5. Workflows de PRs de quem contribui pela primeira vez só rodam depois da sua aprovação.
#   6. Relato privado de falhas de segurança (SECURITY.md).
set -euo pipefail
REPO=${REPO:-eddwan/website}

visibilidade=$(gh repo view "$REPO" --json visibility -q .visibility)
if [ "$visibilidade" != PUBLIC ]; then
  echo "O $REPO ainda é $visibilidade. Torne público antes (gh repo edit $REPO --visibility public --accept-visibility-change-consequences)." >&2
  exit 1
fi

echo "1/6 Chave de deploy dos posts automáticos"
pasta=$(mktemp -d); trap 'rm -rf "$pasta"' EXIT
for id in $(gh api "repos/$REPO/keys" -q '.[] | select(.title=="posts-automaticos") | .id'); do
  gh api -X DELETE "repos/$REPO/keys/$id" >/dev/null
done
ssh-keygen -q -t ed25519 -N '' -C "posts-automaticos@$REPO" -f "$pasta/chave"
id_chave=$(gh api "repos/$REPO/keys" -f title=posts-automaticos -f key="$(cat "$pasta/chave.pub")" -F read_only=false -q .id)
gh secret set DEPLOY_KEY_POSTS -R "$REPO" < "$pasta/chave"

echo "2/6 Regra da main"
ruleset() { # nome, json
  local id
  id=$(gh api "repos/$REPO/rulesets" -q ".[] | select(.name==\"$1\") | .id")
  if [ -n "$id" ]; then gh api -X PUT "repos/$REPO/rulesets/$id" --input - <<<"$2" >/dev/null
  else gh api -X POST "repos/$REPO/rulesets" --input - <<<"$2" >/dev/null; fi
}
ruleset "main protegida" "$(cat <<JSON
{
  "name": "main protegida",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" },
    { "actor_id": $id_chave, "actor_type": "DeployKey", "bypass_mode": "always" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 1,
        "require_code_owner_review": true,
        "dismiss_stale_reviews_on_push": true,
        "require_last_push_approval": true,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["merge", "squash"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [ { "context": "build" } ] } }
  ]
}
JSON
)"

echo "3/6 Regra da develop"
ruleset "develop protegida" '{
  "name": "develop protegida",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/develop"], "exclude": [] } },
  "bypass_actors": [],
  "rules": [ { "type": "deletion" }, { "type": "non_fast_forward" } ]
}'

echo "4/6 Ambiente producao só para a main"
gh api -X PUT "repos/$REPO/environments/producao" --input - >/dev/null <<'JSON'
{ "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true } }
JSON
for id in $(gh api "repos/$REPO/environments/producao/deployment-branch-policies" -q '.branch_policies[].id'); do
  gh api -X DELETE "repos/$REPO/environments/producao/deployment-branch-policies/$id" >/dev/null
done
gh api -X POST "repos/$REPO/environments/producao/deployment-branch-policies" -f name=main -f type=branch >/dev/null

echo "5/6 Aprovação para workflows de quem contribui pela primeira vez"
gh api -X PUT "repos/$REPO/actions/permissions/fork-pr-contributor-approval" -f approval_policy=first_time_contributors >/dev/null

echo "6/6 Relato privado de falhas de segurança"
gh api -X PUT "repos/$REPO/private-vulnerability-reporting" >/dev/null

echo "Pronto. Confira em https://github.com/$REPO/settings/rules"
