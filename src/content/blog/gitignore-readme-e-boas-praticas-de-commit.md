---
titulo: '.gitignore, README e boas práticas de commit'
descricao: 'O que nunca subir para o GitHub e como caprichar no repositório, explicado do zero: segredos e arquivos que ficam de fora, o .gitignore, o que fazer quando algo já foi para um commit, mensagens de commit claras, commits pequenos, um bom README e como escolher uma licença.'
data: 2026-10-16
tipo: explicativo
tags: [git, github, gitignore, readme, mensagem de commit, licença open source]
youtube:
  id: WX6jHxpcTpU
  shorts:
    - id: t_CLI1ijmvw
      titulo: 'Subiu o .env para o GitHub? Faça isso agora'
    - id: 7k09AfbbBOw
      titulo: 'Sua mensagem de commit diz “ajustes”?'
fontes:
  - titulo: 'Modelos de .gitignore'
    url: https://github.com/github/gitignore
  - titulo: 'Escolha uma licença'
    url: https://choosealicense.com
rascunho: false
---

Episódio 5 da série "Git e GitHub do zero".

## Neste vídeo

- O que não subir
- O .gitignore
- Já subiu? Calma
- Mensagens de commit
- Commits pequenos
- Um bom README
- Escolha uma licença
- Resumo e próximo episódio

## Passo a passo

### Exemplo de .gitignore

.env

node_modules/

dist/

*.log

.DS_Store

Já subiu um arquivo que não devia?

```bash
git rm --cached arquivo (o Git para de rastrear e o arquivo fica no seu computador)
```

⚠️ Vazou uma senha ou chave? Troque imediatamente: ela continua no histórico.
