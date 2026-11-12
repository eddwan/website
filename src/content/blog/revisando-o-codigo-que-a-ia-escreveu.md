---
titulo: 'Revisando o código que a IA escreveu'
descricao: '"Tudo pronto, todos os testes passaram." Para o agente, pronto quer dizer que parece pronto. Neste episódio, como revisar o código que a inteligência artificial escreveu sem ler cada linha com lupa: pedir a prova, ler o diff, rodar você mesmo, pedir explicação, conferir bibliotecas novas, fazer commits pequenos e usar um segundo revisor.'
data: 2026-11-11
tipo: explicativo
tags: [inteligência artificial, programação]
youtube:
  id: nu2IbeNgj5Y
fontes:
  - titulo: 'Claude Code, boas práticas (verificação e revisão)'
    url: https://code.claude.com/docs/en/best-practices
  - titulo: 'Claude Code, skills (inclui /code-review)'
    url: https://code.claude.com/docs/en/skills
  - titulo: 'Claude Code, segurança'
    url: https://code.claude.com/docs/en/security
rascunho: false
---

Episódio 5 da série "Programando com IA do zero".

## Neste vídeo

- Pronto não é pronto
- Leia o diff
- Rode você mesmo
- Peça para explicar
- A biblioteca que não existe
- Commits pequenos
- Um segundo par de olhos
- Comunidade e parceiros

## Passo a passo

### Pedidos usados no vídeo

me mostra o comando que você rodou e o resultado

explica o que esse trecho faz e por que você escolheu assim

deu este erro ao aplicar cupom vazio (com o passo a passo para repetir)

revisa o diff contra o SPEC.md, confere se tudo foi feito e ignora estilo

### Antes de aceitar

1. A prova: o comando que rodou e a saída
2. O diff inteiro: git diff (arquivos fora do pedido, testes apagados, .env)
3. Rode você mesmo, inclusive os caminhos errados
4. Código que você não entende não entra
5. Biblioteca nova: existe, é mantida, tem gente usando?
6. Um commit por passo revisado
7. Um segundo revisor, numa conversa limpa (no Claude Code: /code-review)

Bibliotecas inventadas por modelos de código (pesquisa citada no vídeo)

Spracklen e outros, "We Have a Package for You! A Comprehensive Analysis of Package Hallucinations by Code Generating LLMs", USENIX Security 2025: https://arxiv.org/abs/2406.10279

Quem registra um pacote com o nome inventado e publica código malicioso nele faz o ataque que ficou conhecido como "slopsquatting".

Transparência: a série mostra o Claude Code porque é a ferramenta que usamos no canal, ao lado de outras equivalentes; não é patrocínio. O roteiro foi escrito com a ajuda do Claude e revisado pelo Eddwan.
