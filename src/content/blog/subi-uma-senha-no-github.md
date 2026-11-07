---
titulo: 'Subi uma senha no GitHub. E agora?'
descricao: 'Apagar o arquivo não apaga a senha do histórico. O que fazer, na ordem certa, quando um segredo vaza no Git, e como impedir que isso aconteça de novo.'
data: 2026-10-30
tipo: explicativo
tags: [git, github, segurança]
youtube:
  id: WMLGxYmihMk
  shorts:
    - id: eXzzuoo62HA
      titulo: 'A senha continua no histórico'
    - id: 8X7HfEIxgBw
      titulo: 'Push protection: a barreira do GitHub'
fontes:
  - titulo: 'GitHub Docs: removendo dados sensíveis de um repositório'
    url: https://docs.github.com/pt/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
  - titulo: 'GitHub Docs: sobre a push protection'
    url: https://docs.github.com/pt/code-security/secret-scanning/introduction/about-push-protection
  - titulo: 'git filter-repo'
    url: https://github.com/newren/git-filter-repo
  - titulo: 'gitleaks'
    url: https://github.com/gitleaks/gitleaks
---

Você fez o commit, fez o push, e só depois percebeu: a senha do banco estava no arquivo `.env`, agora no GitHub. O primeiro impulso é apagar o arquivo e fazer outro commit. Só que isso não resolve.

Este é o episódio 9 (bônus) da série [Git e GitHub do zero](https://www.youtube.com/playlist?list=PLXVQXkiUR9po).

## Por que apagar não resolve

O Git guarda o histórico inteiro: cada commit é uma foto completa do projeto. O commit novo não tem mais a senha, mas o antigo continua lá, e qualquer pessoa lê com `git log -p`. Em repositório público, há robôs varrendo o GitHub o tempo todo atrás de chaves e senhas esquecidas.

## 1. Troque a chave primeiro

O primeiro passo não é no Git. Entre no serviço de onde veio a chave, revogue a antiga e gere uma nova. A partir daí, a chave que vazou não abre mais nada. A própria documentação do GitHub manda fazer isso primeiro.

> Regra prática: se o segredo tocou num repositório público, considere que ele vazou.

## 2. Ainda não fez o push

Se o commit está só na sua máquina, é mais simples:

```bash
git reset --soft HEAD~1
git restore --staged .env
# coloque .env numa linha do .gitignore
git add .gitignore
git commit -m "conecta o banco"
```

Ou, para corrigir só o último commit:

```bash
git rm --cached .env
git commit --amend --no-edit
```

## 3. Já fez o push

É preciso reescrever o histórico. A ferramenta recomendada pelo GitHub é o `git filter-repo` (2.47 ou mais nova):

```bash
git filter-repo --sensitive-data-removal --invert-paths --path .env
# ou, para trocar só o texto da senha num arquivo que precisa ficar:
git filter-repo --sensitive-data-removal --replace-text senhas.txt
git log --all -- .env
git push --force --mirror origin
```

Avise o time antes: todos os commits mudam de código.

## 4. O que a limpeza não alcança

Forks e clones feitos antes da limpeza continuam com o commit antigo. Pull requests que citam o commit e páginas em cache também, e só o suporte do GitHub remove essas duas. Por isso trocar a chave vem primeiro.

## 5. Prevenção

- **Push protection:** já vem ligada para a sua conta e bloqueia o push de chaves conhecidas para repositórios públicos, mostrando o arquivo e a linha.
- **`.gitignore`:** coloque o `.env` nele desde o começo e suba um `.env.example` só com os nomes das variáveis.
- **gitleaks:** como gancho de pre-commit, para tudo se encontrar algo parecido com uma senha. Também varre o histórico de um repositório que já existe (`gitleaks git -v`).

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2
    hooks:
      - id: gitleaks
```

Depois, `pre-commit install`.

## Resumo

Apagar o arquivo não apaga a senha do histórico. Primeiro, troque a chave. Depois, limpe o histórico com o `git filter-repo` e o push forçado, sabendo que forks e clones não são alcançados. E previna com o `.gitignore`, a push protection e o gitleaks.

Episódio anterior: [GitHub Actions na prática](https://youtu.be/EOH8xFpasIs). Próximo: [Git com IA no dia a dia](https://youtu.be/45wo7cjBKMk).
